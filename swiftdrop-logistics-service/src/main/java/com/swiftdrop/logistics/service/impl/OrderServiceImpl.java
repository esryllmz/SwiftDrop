package com.swiftdrop.logistics.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.domain.geo.GeoReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.OrderKafkaEvent;
import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.Order;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.exception.ForbiddenPortalAccessException;
import com.swiftdrop.logistics.exception.InvalidOrderTransitionException;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.OrderRepository;
import com.swiftdrop.logistics.service.OrderService;
import com.swiftdrop.logistics.service.OutboxService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private static final String DRIVER_GEO_KEY = "drivers:locations";

    private final OrderRepository orderRepository;
    private final MerchantRepository merchantRepository;
    private final DriverRepository driverRepository;
    private final OutboxService outboxService;
    private final StringRedisTemplate redisTemplate;
    private final RedissonClient redissonClient;

    @Override
    @Transactional
    public OrderResponse createOrder(OrderCreateRequest request) {
        return createOrder(request.customerId(), request.merchantId(), request.totalAmount());
    }

    @Override
    @Transactional
    public OrderResponse createCustomerOrder(UUID customerId, CreateCustomerOrderRequest request) {
        return createOrder(customerId, request.merchantId(), request.totalAmount());
    }

    private OrderResponse createOrder(UUID customerId, UUID merchantId, BigDecimal totalAmount) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new IllegalArgumentException("Restoran bulunamadi."));

        Order order = Order.builder()
                .customerId(customerId)
                .merchant(merchant)
                .status(OrderStatus.PLACED)
                .totalAmount(totalAmount)
                .build();

        Order savedOrder = Objects.requireNonNull(orderRepository.save(order), "saved order must not be null");

        saveOrderEvent("ORDER_PLACED", savedOrder, new OrderKafkaEvent(
                savedOrder.getId(),
                OrderStatus.PLACED.name(),
                "Siparisiniz basariyla alindi, kurye araniyor.",
                savedOrder.getCustomerId()
        ));

        assignDriverWorkflow(savedOrder);

        return toResponse(savedOrder);
    }

    private void assignDriverWorkflow(Order order) {
        Merchant merchant = order.getMerchant();
        Point merchantLocation = new Point(merchant.getLongitude(), merchant.getLatitude());
        Distance searchRadius = new Distance(5, Metrics.KILOMETERS);

        RedisGeoCommands.GeoSearchCommandArgs args = RedisGeoCommands.GeoSearchCommandArgs
                .newGeoSearchArgs()
                .includeCoordinates()
                .sortAscending();

        var geoOperations = Objects.requireNonNull(redisTemplate.opsForGeo(), "Redis Geo operations must not be null");
        GeoResults<RedisGeoCommands.GeoLocation<String>> results = geoOperations.search(
                DRIVER_GEO_KEY,
                GeoReference.fromCoordinate(merchantLocation),
                searchRadius,
                args
        );

        if (results == null || results.getContent().isEmpty()) {
            log.warn("No available nearby driver found for order {}", order.getId());
            return;
        }

        for (GeoResult<RedisGeoCommands.GeoLocation<String>> result : results.getContent()) {
            String driverIdValue = Objects.requireNonNull(result.getContent().getName(), "driver id must not be null");
            final UUID parsedDriverId = UUID.fromString(driverIdValue);
            UUID driverId = Objects.requireNonNull(parsedDriverId, "driver UUID must not be null");
            RLock driverLock = redissonClient.getLock("lock:driver:" + driverIdValue);

            try {
                if (driverLock.tryLock(0, 3, TimeUnit.SECONDS)) {
                    Driver driver = driverRepository.findById(driverId).orElse(null);

                    if (driver != null && driver.getStatus() == DriverStatus.AVAILABLE) {
                        driver.setStatus(DriverStatus.BUSY);
                        Driver busyDriver = Objects.requireNonNull(
                                driverRepository.save(driver),
                                "busy driver must not be null"
                        );

                        order.setDriver(busyDriver);
                        order.setStatus(OrderStatus.DRIVER_ASSIGNED);
                        Order assignedOrder = Objects.requireNonNull(
                                orderRepository.save(order),
                                "assigned order must not be null"
                        );

                        log.info("Order {} assigned to driver {}", assignedOrder.getId(), busyDriver.getFullName());
                        saveOrderEvent("ORDER_DRIVER_ASSIGNED", assignedOrder, new OrderKafkaEvent(
                                assignedOrder.getId(),
                                OrderStatus.DRIVER_ASSIGNED.name(),
                                "Siparisiniz kurye tarafindan kabul edildi.",
                                assignedOrder.getCustomerId()
                        ));
                        return;
                    }
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.error("Driver lock attempt interrupted for driver {}", driverIdValue, ex);
            } catch (IllegalArgumentException ex) {
                log.warn("Skipping invalid driver id in Redis Geo set: {}", driverIdValue);
            } finally {
                if (driverLock.isHeldByCurrentThread()) {
                    driverLock.unlock();
                }
            }
        }
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(UUID orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Siparis bulunamadi."));

        OrderStatus status = OrderStatus.valueOf(newStatus);
        order.setStatus(status);

        if (status == OrderStatus.DELIVERED && order.getDriver() != null) {
            Driver driver = order.getDriver();
            driver.setStatus(DriverStatus.AVAILABLE);
            Driver availableDriver = Objects.requireNonNull(
                    driverRepository.save(driver),
                    "available driver must not be null"
            );
            order.setDriver(availableDriver);
        }

        Order updatedOrder = Objects.requireNonNull(orderRepository.save(order), "updated order must not be null");
        saveOrderEvent("ORDER_STATUS_UPDATED", updatedOrder, new OrderKafkaEvent(
                updatedOrder.getId(),
                status.name(),
                "Siparisinizin yeni durumu: " + status.name(),
                updatedOrder.getCustomerId()
        ));

        return toResponse(updatedOrder);
    }

    @Override
    @Transactional
    public OrderResponse markMerchantOrderPreparing(UUID merchantId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureMerchantOwnsOrder(order, merchantId);
        ensureTransition(order, OrderStatus.PREPARING, OrderStatus.PLACED, OrderStatus.DRIVER_ASSIGNED);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.PREPARING,
                "ORDER_PREPARING",
                "Siparisiniz hazirlaniyor."
        );
    }

    @Override
    @Transactional
    public OrderResponse markMerchantOrderReadyForPickup(UUID merchantId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureMerchantOwnsOrder(order, merchantId);
        ensureTransition(order, OrderStatus.READY_FOR_PICKUP, OrderStatus.PREPARING);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.READY_FOR_PICKUP,
                "ORDER_READY_FOR_PICKUP",
                "Siparisiniz teslim alinmaya hazir."
        );
    }

    @Override
    @Transactional
    public OrderResponse markCourierOrderPickedUp(UUID driverId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        Driver driver = ensureDriverOwnsOrder(order, driverId);
        ensureTransition(
                order,
                OrderStatus.PICKED_UP,
                OrderStatus.READY_FOR_PICKUP,
                OrderStatus.DRIVER_ASSIGNED
        );

        driver.setStatus(DriverStatus.BUSY);
        Driver busyDriver = Objects.requireNonNull(driverRepository.save(driver), "busy driver must not be null");
        order.setDriver(busyDriver);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.PICKED_UP,
                "ORDER_PICKED_UP",
                "Siparisiniz kurye tarafindan teslim alindi."
        );
    }

    @Override
    @Transactional
    public OrderResponse markCourierOrderDelivered(UUID driverId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        Driver driver = ensureDriverOwnsOrder(order, driverId);
        ensureTransition(order, OrderStatus.DELIVERED, OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY);

        driver.setStatus(DriverStatus.AVAILABLE);
        Driver availableDriver = Objects.requireNonNull(
                driverRepository.save(driver),
                "available driver must not be null"
        );
        order.setDriver(availableDriver);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.DELIVERED,
                "ORDER_DELIVERED",
                "Siparisiniz teslim edildi."
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> findOrders(OrderStatus status, UUID merchantId, UUID driverId) {
        return orderRepository.findAllForDashboard(status, merchantId, driverId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> findCustomerOrders(UUID customerId) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> findMerchantOrders(UUID merchantId) {
        return orderRepository.findByMerchantIdOrderByCreatedAtDesc(merchantId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> findDriverAssignments(UUID driverId) {
        return orderRepository.findByDriverIdOrderByCreatedAtDesc(driverId).stream()
                .filter(order -> order.getStatus() != OrderStatus.DELIVERED)
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse findOrder(UUID orderId) {
        Order order = orderRepository.findByIdForDashboard(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Siparis bulunamadi."));

        return toResponse(order);
    }

    private OrderResponse toResponse(Order order) {
        Merchant merchant = order.getMerchant();
        Driver driver = order.getDriver();

        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                merchant != null ? merchant.getName() : null,
                driver != null ? driver.getFullName() : null,
                order.getStatus(),
                order.getTotalAmount(),
                order.getCreatedAt()
        );
    }

    private Order findOrderForAction(UUID orderId) {
        return orderRepository.findByIdForDashboard(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Siparis bulunamadi."));
    }

    private void ensureMerchantOwnsOrder(Order order, UUID merchantId) {
        Merchant merchant = order.getMerchant();
        if (merchant == null || !Objects.equals(merchant.getId(), merchantId)) {
            throw new ForbiddenPortalAccessException("Order does not belong to this merchant.");
        }
    }

    private Driver ensureDriverOwnsOrder(Order order, UUID driverId) {
        Driver driver = order.getDriver();
        if (driver == null || !Objects.equals(driver.getId(), driverId)) {
            throw new ForbiddenPortalAccessException("Order is not assigned to this courier.");
        }

        return driver;
    }

    private void ensureTransition(Order order, OrderStatus targetStatus, OrderStatus... allowedStatuses) {
        OrderStatus currentStatus = order.getStatus();
        for (OrderStatus allowedStatus : allowedStatuses) {
            if (currentStatus == allowedStatus) {
                return;
            }
        }

        throw new InvalidOrderTransitionException(
                "Order cannot transition from " + currentStatus + " to " + targetStatus + "."
        );
    }

    private OrderResponse updateOrderLifecycleStatus(
            Order order,
            OrderStatus status,
            String eventType,
            String message
    ) {
        order.setStatus(status);
        Order updatedOrder = Objects.requireNonNull(orderRepository.save(order), "updated order must not be null");
        saveOrderEvent(eventType, updatedOrder, new OrderKafkaEvent(
                updatedOrder.getId(),
                status.name(),
                message,
                updatedOrder.getCustomerId()
        ));

        return toResponse(updatedOrder);
    }

    private void saveOrderEvent(String eventType, Order order, OrderKafkaEvent payload) {
        outboxService.saveOrderEvent(
                eventType,
                order.getId(),
                order.getId().toString(),
                payload,
                UUID.randomUUID().toString()
        );
    }
}

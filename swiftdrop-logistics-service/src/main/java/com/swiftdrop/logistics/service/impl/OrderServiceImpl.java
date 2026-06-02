package com.swiftdrop.logistics.service.impl;

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

import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderKafkaEvent;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.Order;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.mapper.OrderMapper;
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
    private final OrderMapper orderMapper;
    private final OutboxService outboxService;
    private final StringRedisTemplate redisTemplate;
    private final RedissonClient redissonClient;

    @Override
    @Transactional
    public OrderResponse createOrder(OrderCreateRequest request) {
        Merchant merchant = merchantRepository.findById(request.merchantId())
                .orElseThrow(() -> new IllegalArgumentException("Restoran bulunamadi."));

        Order order = Order.builder()
                .customerId(request.customerId())
                .merchant(merchant)
                .status(OrderStatus.PLACED)
                .totalAmount(request.totalAmount())
                .build();

        Order savedOrder = orderRepository.save(order);

        saveOrderEvent("ORDER_PLACED", savedOrder, new OrderKafkaEvent(
                savedOrder.getId(),
                OrderStatus.PLACED.name(),
                "Siparisiniz basariyla alindi, kurye araniyor.",
                savedOrder.getCustomerId()
        ));

        assignDriverWorkflow(savedOrder);

        return orderMapper.toResponse(savedOrder);
    }

    private void assignDriverWorkflow(Order order) {
        Merchant merchant = order.getMerchant();
        Point merchantLocation = new Point(merchant.getLongitude(), merchant.getLatitude());
        Distance searchRadius = new Distance(5, Metrics.KILOMETERS);

        RedisGeoCommands.GeoSearchCommandArgs args = RedisGeoCommands.GeoSearchCommandArgs
                .newGeoSearchArgs()
                .includeCoordinates()
                .sortAscending();

        GeoResults<RedisGeoCommands.GeoLocation<String>> results = redisTemplate.opsForGeo()
                .search(DRIVER_GEO_KEY, GeoReference.fromCoordinate(merchantLocation), searchRadius, args);

        if (results == null || results.getContent().isEmpty()) {
            log.warn("No available nearby driver found for order {}", order.getId());
            return;
        }

        for (GeoResult<RedisGeoCommands.GeoLocation<String>> result : results.getContent()) {
            String driverIdValue = result.getContent().getName();
            UUID driverId = UUID.fromString(driverIdValue);
            RLock driverLock = redissonClient.getLock("lock:driver:" + driverIdValue);

            try {
                if (driverLock.tryLock(0, 3, TimeUnit.SECONDS)) {
                    Driver driver = driverRepository.findById(driverId).orElse(null);

                    if (driver != null && driver.getStatus() == DriverStatus.AVAILABLE) {
                        driver.setStatus(DriverStatus.BUSY);
                        driverRepository.save(driver);

                        order.setDriver(driver);
                        order.setStatus(OrderStatus.DRIVER_ASSIGNED);
                        orderRepository.save(order);

                        log.info("Order {} assigned to driver {}", order.getId(), driver.getFullName());
                        saveOrderEvent("ORDER_DRIVER_ASSIGNED", order, new OrderKafkaEvent(
                                order.getId(),
                                OrderStatus.DRIVER_ASSIGNED.name(),
                                "Siparisiniz kurye tarafindan kabul edildi.",
                                order.getCustomerId()
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
                .orElseThrow(() -> new IllegalArgumentException("Siparis bulunamadi."));

        OrderStatus status = OrderStatus.valueOf(newStatus);
        order.setStatus(status);

        if (status == OrderStatus.DELIVERED && order.getDriver() != null) {
            Driver driver = order.getDriver();
            driver.setStatus(DriverStatus.AVAILABLE);
            driverRepository.save(driver);
        }

        Order updatedOrder = orderRepository.save(order);
        saveOrderEvent("ORDER_STATUS_UPDATED", updatedOrder, new OrderKafkaEvent(
                updatedOrder.getId(),
                status.name(),
                "Siparisinizin yeni durumu: " + status.name(),
                updatedOrder.getCustomerId()
        ));

        return orderMapper.toResponse(updatedOrder);
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

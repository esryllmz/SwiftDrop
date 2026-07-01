package com.swiftdrop.logistics.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.CancelOrderRequest;
import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.OrderKafkaEvent;
import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.OrderStatusHistoryResponse;
import com.swiftdrop.logistics.entity.CustomerAddress;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.Order;
import com.swiftdrop.logistics.entity.OrderActorType;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.entity.OrderStatusHistory;
import com.swiftdrop.logistics.exception.ForbiddenPortalAccessException;
import com.swiftdrop.logistics.exception.InvalidOrderTransitionException;
import com.swiftdrop.logistics.exception.OperationalProfileIncompleteException;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.CustomerAddressRepository;
import com.swiftdrop.logistics.repository.CustomerProfileRepository;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.OrderRepository;
import com.swiftdrop.logistics.repository.OrderStatusHistoryRepository;
import com.swiftdrop.logistics.service.OrderService;
import com.swiftdrop.logistics.service.OrderStatusTransitionPolicy;
import com.swiftdrop.logistics.service.OutboxService;
import com.swiftdrop.logistics.service.ProfileCompleteness;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private static final List<OrderStatus> ACTIVE_COURIER_STATUSES = List.of(
            OrderStatus.DRIVER_ASSIGNED,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.PICKED_UP,
            OrderStatus.ON_THE_WAY
    );
    private static final List<OrderStatus> ASSIGNABLE_ORDER_STATUSES = List.of(
            OrderStatus.PLACED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP
    );

    private final OrderRepository orderRepository;
    private final MerchantRepository merchantRepository;
    private final DriverRepository driverRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final OrderStatusTransitionPolicy transitionPolicy;
    private final OutboxService outboxService;
    private final RedissonClient redissonClient;
    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerAddressRepository customerAddressRepository;

    @Value("${application.demo.courier-id}")
    private UUID demoCourierId;

    @Override
    @Transactional
    public OrderResponse createOrder(OrderCreateRequest request) {
        return createOrder(request.customerId(), request.merchantId(), request.totalAmount(), null);
    }

    @Override
    @Transactional
    public OrderResponse createCustomerOrder(UUID customerId, CreateCustomerOrderRequest request) {
        boolean hasDefaultAddress = customerAddressRepository
                .findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(customerId)
                .isPresent();
        var profile = customerProfileRepository.findByUserId(customerId).orElse(null);
        if (!ProfileCompleteness.isCustomerComplete(profile, hasDefaultAddress)) {
            throw new OperationalProfileIncompleteException(
                    "You need to complete your profile and add a delivery address before placing an order.");
        }

        CustomerAddress deliveryAddress = request.deliveryAddressId() != null
                ? customerAddressRepository.findByIdAndCustomerId(request.deliveryAddressId(), customerId)
                        .filter(CustomerAddress::isActive)
                        .orElseThrow(() -> new ResourceNotFoundException("Delivery address was not found."))
                : customerAddressRepository.findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(customerId)
                        .orElseThrow(() -> new ResourceNotFoundException("Delivery address was not found."));

        return createOrder(customerId, request.merchantId(), request.totalAmount(), deliveryAddress);
    }

    private OrderResponse createOrder(UUID customerId, UUID merchantId, BigDecimal totalAmount, CustomerAddress deliveryAddress) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new IllegalArgumentException("Merchant was not found."));

        if (!merchant.isAcceptingOrders() || !ProfileCompleteness.isMerchantComplete(merchant)) {
            throw new OperationalProfileIncompleteException("This merchant is not currently accepting orders.");
        }

        Order.OrderBuilder orderBuilder = Order.builder()
                .customerId(customerId)
                .merchant(merchant)
                .status(OrderStatus.PLACED)
                .totalAmount(totalAmount);

        if (deliveryAddress != null) {
            orderBuilder
                    .deliveryAddressId(deliveryAddress.getId())
                    .deliveryAddressSummary(deliveryAddress.getAddressLine())
                    .deliveryDistrict(deliveryAddress.getDistrict())
                    .deliveryCity(deliveryAddress.getCity());
        }

        Order order = orderBuilder.build();

        Order savedOrder = Objects.requireNonNull(orderRepository.save(order), "saved order must not be null");
        saveHistory(savedOrder, null, OrderStatus.PLACED, OrderActorType.CUSTOMER, customerId, null);

        saveOrderEvent("ORDER_PLACED", savedOrder, new OrderKafkaEvent(
                savedOrder.getId(),
                OrderStatus.PLACED.name(),
                "Your order was placed successfully. Looking for a courier.",
                savedOrder.getCustomerId()
        ));

        assignDriverWorkflow(savedOrder);

        return toResponse(savedOrder);
    }

    private void assignDriverWorkflow(Order order) {
        attemptAssignmentFor(order);
    }

    @Override
    @Transactional
    public boolean attemptAssignment(UUID orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getDriver() != null || order.getStatus() == OrderStatus.CANCELLED
                || order.getStatus() == OrderStatus.DELIVERED) {
            return false;
        }
        return attemptAssignmentFor(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findUnassignedActiveOrderIds() {
        return orderRepository.findUnassignedActiveOrderIds(ASSIGNABLE_ORDER_STATUSES);
    }

    /**
     * Zone/workload-aware MVP dispatch: no GPS or geo-nearest search. Candidates are couriers who are
     * available, profile-complete, and under their max active assignments; same-zone couriers are
     * preferred, then the least busy / longest-idle courier is picked.
     */
    private boolean attemptAssignmentFor(Order order) {
        Merchant merchant = order.getMerchant();
        List<Driver> candidates = driverRepository.findByStatus(DriverStatus.AVAILABLE).stream()
                .filter(ProfileCompleteness::isCourierComplete)
                .filter(driver -> activeAssignmentCount(driver.getId()) < driver.getMaxActiveAssignments())
                .toList();

        if (candidates.isEmpty()) {
            log.warn("No eligible courier found for order {}", order.getId());
            return false;
        }

        List<Driver> zoneMatched = candidates.stream()
                .filter(driver -> merchant.getDistrict() != null && merchant.getDistrict().equals(driver.getServiceZone()))
                .toList();
        List<Driver> pool = zoneMatched.isEmpty() ? candidates : zoneMatched;

        List<Driver> ranked = pool.stream()
                .sorted(Comparator
                        .comparingLong((Driver driver) -> activeAssignmentCount(driver.getId()))
                        .thenComparing(Driver::getLastAssignedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(Driver::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();

        for (Driver candidate : ranked) {
            RLock driverLock = Objects.requireNonNull(
                    redissonClient.getLock("lock:driver:" + candidate.getId()),
                    "driver lock must not be null"
            );

            try {
                if (driverLock.tryLock(0, 3, TimeUnit.SECONDS)) {
                    if (assignDriverIfAvailable(order, candidate.getId())) {
                        return true;
                    }
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.error("Driver lock attempt interrupted for driver {}", candidate.getId(), ex);
            } finally {
                if (driverLock.isHeldByCurrentThread()) {
                    driverLock.unlock();
                }
            }
        }

        log.warn("No courier could be locked/assigned for order {}", order.getId());
        return false;
    }

    private long activeAssignmentCount(UUID driverId) {
        return orderRepository.countByDriver_IdAndStatusIn(driverId, ACTIVE_COURIER_STATUSES);
    }

    private boolean assignDriverIfAvailable(Order order, UUID driverId) {
        Driver driver = driverRepository.findById(driverId).orElse(null);
        if (driver == null || driver.getStatus() != DriverStatus.AVAILABLE) {
            return false;
        }

        driver.setStatus(DriverStatus.BUSY);
        driver.setLastAssignedAt(LocalDateTime.now());
        Driver busyDriver = Objects.requireNonNull(
                driverRepository.save(driver),
                "busy driver must not be null"
        );

        order.setDriver(busyDriver);
        OrderStatus previousStatus = order.getStatus();
        // A courier can be assigned late (via retry) to an order the merchant already started
        // preparing; only bump the status to DRIVER_ASSIGNED when it's still PLACED so we never
        // regress merchant-side progress or violate the SYSTEM actor's transition rules.
        OrderStatus targetStatus = previousStatus == OrderStatus.PLACED ? OrderStatus.DRIVER_ASSIGNED : previousStatus;
        if (targetStatus != previousStatus) {
            transitionPolicy.assertTransition(previousStatus, targetStatus, OrderActorType.SYSTEM);
            order.setStatus(targetStatus);
        }
        Order assignedOrder = Objects.requireNonNull(
                orderRepository.save(order),
                "assigned order must not be null"
        );
        saveHistory(
                assignedOrder,
                previousStatus,
                targetStatus,
                OrderActorType.SYSTEM,
                null,
                null
        );

        log.info("Order {} assigned to driver {}", assignedOrder.getId(), busyDriver.getFullName());
        saveLifecycleEvent(
                "ORDER_DRIVER_ASSIGNED",
                assignedOrder,
                previousStatus,
                targetStatus,
                OrderActorType.SYSTEM,
                null,
                "Your order was accepted by a courier."
        );
        return true;
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(UUID orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order was not found."));

        OrderStatus status = OrderStatus.valueOf(newStatus);
        return updateOrderLifecycleStatus(
                order,
                status,
                OrderActorType.ADMIN,
                null,
                null,
                "ORDER_STATUS_UPDATED",
                "Order status updated."
        );
    }

    @Override
    @Transactional
    public OrderResponse markMerchantOrderPreparing(UUID merchantId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureMerchantOwnsOrder(order, merchantId);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.PREPARING,
                OrderActorType.MERCHANT,
                merchantId,
                null,
                "ORDER_PREPARING",
                "Your order is being prepared."
        );
    }

    @Override
    @Transactional
    public OrderResponse markMerchantOrderReadyForPickup(UUID merchantId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureMerchantOwnsOrder(order, merchantId);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.READY_FOR_PICKUP,
                OrderActorType.MERCHANT,
                merchantId,
                null,
                "ORDER_READY_FOR_PICKUP",
                "Your order is ready for pickup."
        );
    }

    @Override
    @Transactional
    public OrderResponse markCourierOrderPickedUp(UUID driverId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        Driver driver = ensureDriverOwnsOrder(order, driverId);

        driver.setStatus(DriverStatus.BUSY);
        Driver busyDriver = Objects.requireNonNull(driverRepository.save(driver), "busy driver must not be null");
        order.setDriver(busyDriver);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.PICKED_UP,
                OrderActorType.COURIER,
                driverId,
                null,
                "ORDER_PICKED_UP",
                "Your order was picked up by the courier."
        );
    }

    @Override
    @Transactional
    public OrderResponse markCourierOrderOnTheWay(UUID driverId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureDriverOwnsOrder(order, driverId);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.ON_THE_WAY,
                OrderActorType.COURIER,
                driverId,
                null,
                "ORDER_ON_THE_WAY",
                "Your order is on the way."
        );
    }

    @Override
    @Transactional
    public OrderResponse markCourierOrderDelivered(UUID driverId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        Driver driver = ensureDriverOwnsOrder(order, driverId);
        driver.setStatus(DriverStatus.AVAILABLE);
        Driver availableDriver = Objects.requireNonNull(
                driverRepository.save(driver),
                "available driver must not be null"
        );
        order.setDriver(availableDriver);

        return updateOrderLifecycleStatus(
                order,
                OrderStatus.DELIVERED,
                OrderActorType.COURIER,
                driverId,
                null,
                "ORDER_DELIVERED",
                "Your order was delivered."
        );
    }

    @Override
    @Transactional
    public OrderResponse cancelCustomerOrder(UUID customerId, UUID orderId, CancelOrderRequest request) {
        Order order = findOrderForAction(orderId);
        ensureCustomerOwnsOrder(order, customerId);
        return cancelOrder(order, OrderActorType.CUSTOMER, customerId, request.reason());
    }

    @Override
    @Transactional
    public OrderResponse cancelMerchantOrder(UUID merchantId, UUID orderId, CancelOrderRequest request) {
        Order order = findOrderForAction(orderId);
        ensureMerchantOwnsOrder(order, merchantId);
        return cancelOrder(order, OrderActorType.MERCHANT, merchantId, request.reason());
    }

    @Override
    @Transactional
    public OrderResponse cancelAdminOrder(UUID adminUserId, UUID orderId, CancelOrderRequest request) {
        Order order = findOrderForAction(orderId);
        return cancelOrder(order, OrderActorType.ADMIN, adminUserId, request.reason());
    }

    @Override
    @Transactional
    public OrderResponse assignDemoCourier(UUID adminUserId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        if (order.getDriver() != null) {
            return toResponse(order);
        }

        OrderStatus previousStatus = order.getStatus();
        if (previousStatus != OrderStatus.PLACED) {
            throw new InvalidOrderTransitionException("Demo courier can only be assigned to placed orders.");
        }

        Driver driver = driverRepository.findById(demoCourierId)
                .orElseThrow(() -> new ResourceNotFoundException("Demo courier profile was not found."));
        if (driver.getStatus() == DriverStatus.OFFLINE) {
            throw new InvalidOrderTransitionException("Demo courier must be available before assignment.");
        }

        driver.setStatus(DriverStatus.BUSY);
        Driver busyDriver = Objects.requireNonNull(driverRepository.save(driver), "busy demo driver must not be null");
        order.setDriver(busyDriver);
        transitionPolicy.assertTransition(previousStatus, OrderStatus.DRIVER_ASSIGNED, OrderActorType.SYSTEM);
        order.setStatus(OrderStatus.DRIVER_ASSIGNED);
        Order assignedOrder = Objects.requireNonNull(orderRepository.save(order), "assigned order must not be null");
        saveHistory(
                assignedOrder,
                previousStatus,
                OrderStatus.DRIVER_ASSIGNED,
                OrderActorType.ADMIN,
                adminUserId,
                "Assigned to demo courier."
        );
        saveLifecycleEvent(
                "ORDER_DRIVER_ASSIGNED",
                assignedOrder,
                previousStatus,
                OrderStatus.DRIVER_ASSIGNED,
                OrderActorType.ADMIN,
                "Assigned to demo courier.",
                "Your order was assigned to the demo courier."
        );

        return toResponse(assignedOrder);
    }

    @Override
    @Transactional
    public OrderResponse assignCourier(UUID adminUserId, UUID orderId, UUID courierId) {
        Order order = findOrderForAction(orderId);
        if (order.getDriver() != null) {
            return toResponse(order);
        }

        OrderStatus previousStatus = order.getStatus();
        if (previousStatus != OrderStatus.PLACED) {
            throw new InvalidOrderTransitionException("A courier can only be assigned to placed orders.");
        }

        Driver driver = driverRepository.findById(courierId)
                .orElseThrow(() -> new ResourceNotFoundException("Courier profile was not found."));
        if (driver.getStatus() != DriverStatus.AVAILABLE) {
            throw new InvalidOrderTransitionException("Courier must be available before assignment.");
        }

        driver.setStatus(DriverStatus.BUSY);
        Driver busyDriver = Objects.requireNonNull(driverRepository.save(driver), "busy driver must not be null");
        order.setDriver(busyDriver);
        transitionPolicy.assertTransition(previousStatus, OrderStatus.DRIVER_ASSIGNED, OrderActorType.SYSTEM);
        order.setStatus(OrderStatus.DRIVER_ASSIGNED);
        Order assignedOrder = Objects.requireNonNull(orderRepository.save(order), "assigned order must not be null");
        saveHistory(
                assignedOrder,
                previousStatus,
                OrderStatus.DRIVER_ASSIGNED,
                OrderActorType.ADMIN,
                adminUserId,
                "Assigned by admin."
        );
        saveLifecycleEvent(
                "ORDER_DRIVER_ASSIGNED",
                assignedOrder,
                previousStatus,
                OrderStatus.DRIVER_ASSIGNED,
                OrderActorType.ADMIN,
                "Assigned by admin.",
                "Your order was assigned to a courier."
        );

        return toResponse(assignedOrder);
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
    public OrderResponse findCustomerOrder(UUID customerId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureCustomerOwnsOrder(order, customerId);
        return toResponse(order);
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
    public OrderResponse findMerchantOrder(UUID merchantId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureMerchantOwnsOrder(order, merchantId);
        return toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> findDriverAssignments(UUID driverId) {
        return orderRepository.findByDriverIdOrderByCreatedAtDesc(driverId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse findDriverAssignment(UUID driverId, UUID orderId) {
        Order order = findOrderForAction(orderId);
        ensureDriverOwnsOrder(order, driverId);
        return toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse findOrder(UUID orderId) {
        Order order = orderRepository.findByIdForDashboard(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order was not found."));

        return toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderStatusHistoryResponse> findOrderHistory(UUID orderId) {
        return orderStatusHistoryRepository.findByOrder_IdOrderByCreatedAtAsc(orderId).stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    private OrderResponse toResponse(Order order) {
        Merchant merchant = order.getMerchant();
        Driver driver = order.getDriver();

        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                merchant != null ? merchant.getName() : null,
                driver != null ? driver.getFullName() : null,
                driver != null ? driver.getEmail() : null,
                order.getStatus(),
                order.getTotalAmount(),
                order.getCreatedAt(),
                order.getVersion(),
                order.getCancelledAt(),
                order.getCancelledByActorType(),
                order.getCancelledByActorId(),
                order.getCancellationReason(),
                order.getPickedUpAt(),
                order.getOnTheWayAt(),
                order.getDeliveredAt(),
                order.getDeliveryAddressSummary(),
                order.getDeliveryDistrict(),
                order.getDeliveryCity(),
                findOrderHistory(order.getId())
        );
    }

    private OrderStatusHistoryResponse toHistoryResponse(OrderStatusHistory history) {
        return new OrderStatusHistoryResponse(
                history.getId(),
                history.getFromStatus(),
                history.getToStatus(),
                history.getActorType(),
                history.getActorId(),
                history.getReason(),
                history.getCreatedAt()
        );
    }

    private Order findOrderForAction(UUID orderId) {
        return orderRepository.findByIdForDashboard(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order was not found."));
    }

    private void ensureMerchantOwnsOrder(Order order, UUID merchantId) {
        Merchant merchant = order.getMerchant();
        if (merchant == null || !Objects.equals(merchant.getId(), merchantId)) {
            throw new ForbiddenPortalAccessException("Order does not belong to this merchant.");
        }
    }

    private void ensureCustomerOwnsOrder(Order order, UUID customerId) {
        if (!Objects.equals(order.getCustomerId(), customerId)) {
            throw new ForbiddenPortalAccessException("Order does not belong to this customer.");
        }
    }

    private Driver ensureDriverOwnsOrder(Order order, UUID driverId) {
        Driver driver = order.getDriver();
        if (driver == null || !Objects.equals(driver.getId(), driverId)) {
            throw new ForbiddenPortalAccessException("Order is not assigned to this courier.");
        }

        return driver;
    }

    private OrderResponse updateOrderLifecycleStatus(
            Order order,
            OrderStatus status,
            OrderActorType actorType,
            UUID actorId,
            String reason,
            String eventType,
            String message
    ) {
        OrderStatus previousStatus = order.getStatus();
        transitionPolicy.assertTransition(previousStatus, status, actorType);
        order.setStatus(status);
        applyTimestamp(order, status);
        Order updatedOrder = Objects.requireNonNull(orderRepository.save(order), "updated order must not be null");
        saveHistory(updatedOrder, previousStatus, status, actorType, actorId, reason);
        saveLifecycleEvent(eventType, updatedOrder, previousStatus, status, actorType, reason, message);

        return toResponse(updatedOrder);
    }

    private OrderResponse cancelOrder(Order order, OrderActorType actorType, UUID actorId, String reason) {
        String normalizedReason = normalizeCancellationReason(reason);
        OrderStatus previousStatus = order.getStatus();
        transitionPolicy.assertCancellation(previousStatus, actorType);
        LocalDateTime cancelledAt = LocalDateTime.now();

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(cancelledAt);
        order.setCancelledByActorType(actorType.name());
        order.setCancelledByActorId(actorId);
        order.setCancellationReason(normalizedReason);
        releaseDriverIfAssigned(order);

        Order cancelledOrder = Objects.requireNonNull(orderRepository.save(order), "cancelled order must not be null");
        saveHistory(cancelledOrder, previousStatus, OrderStatus.CANCELLED, actorType, actorId, normalizedReason);
        saveLifecycleEvent(
                "ORDER_CANCELLED",
                cancelledOrder,
                previousStatus,
                OrderStatus.CANCELLED,
                actorType,
                normalizedReason,
                "Your order was cancelled."
        );
        return toResponse(cancelledOrder);
    }

    private String normalizeCancellationReason(String reason) {
        String normalizedReason = reason == null ? "" : reason.trim();
        if (normalizedReason.length() < 5 || normalizedReason.length() > 500) {
            throw new IllegalArgumentException("Cancellation reason must be between 5 and 500 characters.");
        }
        return normalizedReason;
    }

    private void applyTimestamp(Order order, OrderStatus status) {
        LocalDateTime now = LocalDateTime.now();
        if (status == OrderStatus.PICKED_UP && order.getPickedUpAt() == null) {
            order.setPickedUpAt(now);
        }
        if (status == OrderStatus.ON_THE_WAY && order.getOnTheWayAt() == null) {
            order.setOnTheWayAt(now);
        }
        if (status == OrderStatus.DELIVERED && order.getDeliveredAt() == null) {
            order.setDeliveredAt(now);
            releaseDriverIfAssigned(order);
        }
    }

    private void releaseDriverIfAssigned(Order order) {
        Driver driver = order.getDriver();
        if (driver == null) {
            return;
        }

        driver.setStatus(DriverStatus.AVAILABLE);
        Driver availableDriver = Objects.requireNonNull(
                driverRepository.save(driver),
                "available driver must not be null"
        );
        order.setDriver(availableDriver);
    }

    private void saveHistory(
            Order order,
            OrderStatus fromStatus,
            OrderStatus toStatus,
            OrderActorType actorType,
            UUID actorId,
            String reason
    ) {
        OrderStatusHistory history = OrderStatusHistory.builder()
                .order(order)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .actorType(actorType)
                .actorId(actorId)
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();
        orderStatusHistoryRepository.save(history);
    }

    private void saveLifecycleEvent(
            String eventType,
            Order order,
            OrderStatus previousStatus,
            OrderStatus newStatus,
            OrderActorType actorType,
            String reason,
            String message
    ) {
        saveOrderEvent(eventType, order, new OrderKafkaEvent(
                order.getId(),
                newStatus.name(),
                message,
                order.getCustomerId(),
                previousStatus != null ? previousStatus.name() : null,
                newStatus.name(),
                actorType.name(),
                reason,
                LocalDateTime.now()
        ));
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

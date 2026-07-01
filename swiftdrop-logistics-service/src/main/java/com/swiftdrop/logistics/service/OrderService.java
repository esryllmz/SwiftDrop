package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.UUID;

import com.swiftdrop.logistics.dto.CancelOrderRequest;
import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.OrderStatusHistoryResponse;
import com.swiftdrop.logistics.entity.OrderStatus;

public interface OrderService {
    OrderResponse createOrder(OrderCreateRequest request);

    OrderResponse createCustomerOrder(UUID customerId, CreateCustomerOrderRequest request);

    OrderResponse updateOrderStatus(UUID orderId, String newStatus);

    OrderResponse markMerchantOrderPreparing(UUID merchantId, UUID orderId);

    OrderResponse markMerchantOrderReadyForPickup(UUID merchantId, UUID orderId);

    OrderResponse markCourierOrderPickedUp(UUID driverId, UUID orderId);

    OrderResponse markCourierOrderOnTheWay(UUID driverId, UUID orderId);

    OrderResponse markCourierOrderDelivered(UUID driverId, UUID orderId);

    OrderResponse cancelCustomerOrder(UUID customerId, UUID orderId, CancelOrderRequest request);

    OrderResponse cancelMerchantOrder(UUID merchantId, UUID orderId, CancelOrderRequest request);

    OrderResponse cancelAdminOrder(UUID adminUserId, UUID orderId, CancelOrderRequest request);

    OrderResponse assignDemoCourier(UUID adminUserId, UUID orderId);

    OrderResponse assignCourier(UUID adminUserId, UUID orderId, UUID courierId);

    boolean attemptAssignment(UUID orderId);

    List<UUID> findUnassignedActiveOrderIds();

    List<OrderResponse> findOrders(OrderStatus status, UUID merchantId, UUID driverId);

    List<OrderResponse> findCustomerOrders(UUID customerId);

    OrderResponse findCustomerOrder(UUID customerId, UUID orderId);

    List<OrderResponse> findMerchantOrders(UUID merchantId);

    OrderResponse findMerchantOrder(UUID merchantId, UUID orderId);

    List<OrderResponse> findDriverAssignments(UUID driverId);

    OrderResponse findDriverAssignment(UUID driverId, UUID orderId);

    OrderResponse findOrder(UUID orderId);

    List<OrderStatusHistoryResponse> findOrderHistory(UUID orderId);
}

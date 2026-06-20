package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.UUID;

import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.entity.OrderStatus;

public interface OrderService {
    OrderResponse createOrder(OrderCreateRequest request);

    OrderResponse createCustomerOrder(UUID customerId, CreateCustomerOrderRequest request);

    OrderResponse updateOrderStatus(UUID orderId, String newStatus);

    OrderResponse markMerchantOrderPreparing(UUID merchantId, UUID orderId);

    OrderResponse markMerchantOrderReadyForPickup(UUID merchantId, UUID orderId);

    OrderResponse markCourierOrderPickedUp(UUID driverId, UUID orderId);

    OrderResponse markCourierOrderDelivered(UUID driverId, UUID orderId);

    List<OrderResponse> findOrders(OrderStatus status, UUID merchantId, UUID driverId);

    List<OrderResponse> findCustomerOrders(UUID customerId);

    List<OrderResponse> findMerchantOrders(UUID merchantId);

    List<OrderResponse> findDriverAssignments(UUID driverId);

    OrderResponse findOrder(UUID orderId);
}

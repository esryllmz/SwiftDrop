package com.swiftdrop.logistics.service;

import java.util.UUID;

import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderResponse;

public interface OrderService {
    OrderResponse createOrder(OrderCreateRequest request);

    OrderResponse updateOrderStatus(UUID orderId, String newStatus);
}

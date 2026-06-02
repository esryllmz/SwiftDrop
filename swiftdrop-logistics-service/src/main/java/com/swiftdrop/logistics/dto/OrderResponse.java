package com.swiftdrop.logistics.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.swiftdrop.logistics.entity.OrderStatus;

public record OrderResponse(
        UUID id,
        UUID customerId,
        String merchantName,
        String driverName,
        OrderStatus status,
        BigDecimal totalAmount,
        LocalDateTime createdAt
) {
}

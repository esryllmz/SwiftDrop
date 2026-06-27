package com.swiftdrop.logistics.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.swiftdrop.logistics.entity.OrderStatus;

public record OrderResponse(
        UUID id,
        UUID customerId,
        String merchantName,
        String driverName,
        OrderStatus status,
        BigDecimal totalAmount,
        LocalDateTime createdAt,
        Long version,
        LocalDateTime cancelledAt,
        String cancelledByActorType,
        UUID cancelledByActorId,
        String cancellationReason,
        LocalDateTime pickedUpAt,
        LocalDateTime onTheWayAt,
        LocalDateTime deliveredAt,
        List<OrderStatusHistoryResponse> history
) {
}

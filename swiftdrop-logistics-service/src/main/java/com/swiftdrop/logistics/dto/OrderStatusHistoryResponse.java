package com.swiftdrop.logistics.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.swiftdrop.logistics.entity.OrderActorType;
import com.swiftdrop.logistics.entity.OrderStatus;

public record OrderStatusHistoryResponse(
        UUID id,
        OrderStatus fromStatus,
        OrderStatus toStatus,
        OrderActorType actorType,
        UUID actorId,
        String reason,
        LocalDateTime createdAt
) {
}

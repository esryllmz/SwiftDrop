package com.swiftdrop.logistics.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

public record OrderKafkaEvent(
        UUID orderId,
        String status,
        String message,
        UUID targetUserId,
        String previousStatus,
        String newStatus,
        String actorType,
        String reason,
        LocalDateTime occurredAt
) implements Serializable {

    public OrderKafkaEvent(UUID orderId, String status, String message, UUID targetUserId) {
        this(orderId, status, message, targetUserId, null, status, null, null, LocalDateTime.now());
    }
}

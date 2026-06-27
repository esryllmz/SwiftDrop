package com.swiftdrop.notification.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
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
}

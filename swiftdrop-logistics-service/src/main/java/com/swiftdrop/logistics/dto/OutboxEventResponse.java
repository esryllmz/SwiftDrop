package com.swiftdrop.logistics.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.swiftdrop.logistics.entity.OutboxStatus;

public record OutboxEventResponse(
        UUID id,
        String aggregateType,
        UUID aggregateId,
        String eventType,
        String topic,
        String eventKey,
        String payload,
        OutboxStatus status,
        int retryCount,
        String lastError,
        LocalDateTime createdAt,
        LocalDateTime sentAt,
        String correlationId,
        int version
) {
}

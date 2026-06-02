package com.swiftdrop.logistics.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record EventEnvelope(
        UUID eventId,
        String eventType,
        int version,
        LocalDateTime occurredAt,
        String correlationId,
        Object payload
) {
}

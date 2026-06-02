package com.swiftdrop.logistics.dto;

import java.io.Serializable;
import java.util.UUID;

public record OrderKafkaEvent(
        UUID orderId,
        String status,
        String message,
        UUID targetUserId
) implements Serializable {
}

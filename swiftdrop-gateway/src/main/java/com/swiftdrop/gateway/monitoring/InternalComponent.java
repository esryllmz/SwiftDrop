package com.swiftdrop.gateway.monitoring;

public record InternalComponent(
        HealthStatus status,
        Long responseTimeMs,
        String details
) {
}

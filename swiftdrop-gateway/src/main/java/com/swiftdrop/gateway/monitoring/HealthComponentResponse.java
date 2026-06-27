package com.swiftdrop.gateway.monitoring;

public record HealthComponentResponse(
        String key,
        String name,
        HealthStatus status,
        Long responseTimeMs,
        String details
) {
}

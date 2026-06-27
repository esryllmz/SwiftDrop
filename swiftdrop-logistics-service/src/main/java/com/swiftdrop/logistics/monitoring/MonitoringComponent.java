package com.swiftdrop.logistics.monitoring;

public record MonitoringComponent(
        HealthStatus status,
        Long responseTimeMs,
        String details
) {
}

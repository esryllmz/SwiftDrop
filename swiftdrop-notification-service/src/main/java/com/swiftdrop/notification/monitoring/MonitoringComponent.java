package com.swiftdrop.notification.monitoring;

public record MonitoringComponent(
        HealthStatus status,
        Long responseTimeMs,
        String details
) {
}

package com.swiftdrop.logistics.monitoring;

public record OutboxMonitoringMetrics(
        Long pendingCount,
        Long failedCount,
        Long oldestPendingAgeSeconds
) {
}

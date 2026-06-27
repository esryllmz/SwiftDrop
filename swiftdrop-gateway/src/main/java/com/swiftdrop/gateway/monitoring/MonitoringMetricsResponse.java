package com.swiftdrop.gateway.monitoring;

public record MonitoringMetricsResponse(
        Long outboxPendingCount,
        Long outboxFailedCount,
        Long oldestPendingOutboxAgeSeconds,
        Long notificationProcessedCount,
        Long consumerLag
) {
}

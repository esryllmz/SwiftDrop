package com.swiftdrop.gateway.monitoring;

public record InternalMonitoringResponse(
        InternalComponent database,
        InternalComponent redis,
        InternalComponent kafka,
        OutboxMetrics outbox,
        Long processedEventCount,
        Long consumerLag
) {

    public record OutboxMetrics(
            Long pendingCount,
            Long failedCount,
            Long oldestPendingAgeSeconds
    ) {
    }
}

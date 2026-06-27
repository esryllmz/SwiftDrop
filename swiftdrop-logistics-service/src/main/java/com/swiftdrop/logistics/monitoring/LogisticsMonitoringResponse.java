package com.swiftdrop.logistics.monitoring;

public record LogisticsMonitoringResponse(
        MonitoringComponent database,
        MonitoringComponent kafka,
        OutboxMonitoringMetrics outbox
) {
}

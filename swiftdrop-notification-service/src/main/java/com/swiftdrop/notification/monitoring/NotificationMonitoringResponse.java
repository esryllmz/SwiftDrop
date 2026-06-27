package com.swiftdrop.notification.monitoring;

public record NotificationMonitoringResponse(
        MonitoringComponent database,
        MonitoringComponent redis,
        MonitoringComponent kafka,
        Long processedEventCount,
        Long consumerLag
) {
}

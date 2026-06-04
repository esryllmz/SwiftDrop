package com.swiftdrop.logistics.dto;

public record DashboardSummaryResponse(
        long totalOrders,
        long placedOrders,
        long assignedOrders,
        long deliveredOrders,
        long availableDrivers,
        long busyDrivers,
        long offlineDrivers,
        long totalMerchants,
        long pendingOutboxEvents,
        long sentOutboxEvents,
        long failedOutboxEvents
) {
}

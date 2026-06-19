package com.swiftdrop.logistics.dto;

import java.util.UUID;

import com.swiftdrop.logistics.entity.DriverStatus;

public record CourierProfileResponse(
        UUID userId,
        String email,
        String role,
        UUID driverId,
        String fullName,
        DriverStatus status,
        long assignedOrders,
        long deliveredOrders
) {
}

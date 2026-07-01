package com.swiftdrop.logistics.dto;

import java.util.UUID;

import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.VehicleType;

public record CourierProfileResponse(
        UUID userId,
        String email,
        String role,
        UUID driverId,
        String fullName,
        DriverStatus status,
        String phone,
        VehicleType vehicleType,
        String serviceZone,
        int maxActiveAssignments,
        boolean profileComplete,
        long assignedOrders,
        long deliveredOrders
) {
}

package com.swiftdrop.logistics.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.VehicleType;

public record CourierApplicationResponse(
        UUID id,
        String fullName,
        String contactEmail,
        VehicleType vehicleType,
        String message,
        ApplicationStatus status,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        String reviewNote
) {
}

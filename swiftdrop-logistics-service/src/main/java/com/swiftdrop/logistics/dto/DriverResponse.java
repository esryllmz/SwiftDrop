package com.swiftdrop.logistics.dto;

import java.util.UUID;

import com.swiftdrop.logistics.entity.DriverStatus;

public record DriverResponse(
        UUID id,
        UUID userId,
        String fullName,
        DriverStatus status
) {
}

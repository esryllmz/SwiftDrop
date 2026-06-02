package com.swiftdrop.logistics.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record DriverLocationUpdateRequest(
        @NotNull
        UUID driverId,
        double latitude,
        double longitude
) {
}

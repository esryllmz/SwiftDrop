package com.swiftdrop.logistics.dto;

import com.swiftdrop.logistics.entity.DriverStatus;

import jakarta.validation.constraints.NotNull;

public record UpdateCourierAvailabilityRequest(
        @NotNull(message = "Status is required.")
        DriverStatus status
) {
}

package com.swiftdrop.logistics.dto;

import com.swiftdrop.logistics.entity.VehicleType;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateCourierProfileRequest(
        @NotBlank(message = "Phone is required.")
        @Size(max = 30)
        String phone,

        @NotNull(message = "Vehicle type is required.")
        VehicleType vehicleType,

        @NotBlank(message = "Service zone is required.")
        @Size(max = 100)
        String serviceZone,

        @NotNull(message = "Maximum active assignments is required.")
        @Min(value = 1, message = "Maximum active assignments must be positive.")
        Integer maxActiveAssignments
) {
}

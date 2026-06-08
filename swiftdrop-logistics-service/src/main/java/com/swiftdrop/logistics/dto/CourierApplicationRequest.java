package com.swiftdrop.logistics.dto;

import com.swiftdrop.logistics.entity.VehicleType;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CourierApplicationRequest(
        @NotBlank(message = "Full name is required.")
        @Size(max = 120, message = "Full name must be at most 120 characters.")
        String fullName,

        @NotBlank(message = "Contact email is required.")
        @Email(message = "Contact email must be valid.")
        @Size(max = 160, message = "Contact email must be at most 160 characters.")
        String contactEmail,

        @NotNull(message = "Vehicle type is required.")
        VehicleType vehicleType,

        @Size(max = 1000, message = "Message must be at most 1000 characters.")
        String message
) {
}

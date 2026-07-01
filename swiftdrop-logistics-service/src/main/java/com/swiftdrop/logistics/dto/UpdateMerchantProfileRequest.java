package com.swiftdrop.logistics.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateMerchantProfileRequest(
        @NotBlank(message = "Phone is required.")
        @Size(max = 30)
        String phone,

        @NotBlank(message = "Address line is required.")
        @Size(max = 250)
        String addressLine,

        @NotBlank(message = "District is required.")
        @Size(max = 100)
        String district,

        @NotBlank(message = "City is required.")
        @Size(max = 100)
        String city,

        @Size(max = 500)
        String description,

        @NotNull(message = "Accepting orders flag is required.")
        Boolean acceptingOrders,

        @NotNull(message = "Average preparation time is required.")
        @Min(value = 1, message = "Average preparation time must be positive.")
        Integer averagePreparationMinutes
) {
}

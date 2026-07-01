package com.swiftdrop.logistics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCustomerProfileRequest(
        @NotBlank(message = "Phone is required.")
        @Size(max = 30)
        String phone
) {
}

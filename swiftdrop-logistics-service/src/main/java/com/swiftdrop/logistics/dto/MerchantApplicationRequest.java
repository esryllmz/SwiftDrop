package com.swiftdrop.logistics.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MerchantApplicationRequest(
        @NotBlank(message = "Business name is required.")
        @Size(max = 120, message = "Business name must be at most 120 characters.")
        String businessName,

        @NotBlank(message = "Contact email is required.")
        @Email(message = "Contact email must be valid.")
        @Size(max = 160, message = "Contact email must be at most 160 characters.")
        String contactEmail,

        @Size(max = 1000, message = "Message must be at most 1000 characters.")
        String message
) {
}

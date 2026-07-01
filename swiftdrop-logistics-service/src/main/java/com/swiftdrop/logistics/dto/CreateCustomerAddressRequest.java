package com.swiftdrop.logistics.dto;

import com.swiftdrop.logistics.entity.AddressLabel;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateCustomerAddressRequest(
        @NotNull(message = "Label is required.")
        AddressLabel label,

        @NotBlank(message = "Recipient name is required.")
        @Size(max = 100)
        String recipientName,

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

        @Size(max = 20)
        String postalCode,

        @Size(max = 500)
        String deliveryNotes
) {
}

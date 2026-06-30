package com.swiftdrop.logistics.dto;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateCustomerOrderRequest(
        @NotNull(message = "Merchant ID is required.")
        UUID merchantId,

        @NotNull(message = "Amount is required.")
        @Positive(message = "Amount must be positive.")
        BigDecimal totalAmount
) {
}

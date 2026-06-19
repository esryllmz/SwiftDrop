package com.swiftdrop.logistics.dto;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateCustomerOrderRequest(
        @NotNull(message = "Restoran ID bos olamaz.")
        UUID merchantId,

        @NotNull(message = "Tutar bos olamaz.")
        @Positive(message = "Tutar pozitif bir deger olmalidir.")
        BigDecimal totalAmount
) {
}

package com.swiftdrop.logistics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelOrderRequest(
        @NotBlank
        @Size(min = 5, max = 500)
        String reason
) {
}

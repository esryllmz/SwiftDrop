package com.swiftdrop.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Email must not be blank.")
        String email,

        @NotBlank(message = "Portal must not be blank.")
        String portal
) {
}

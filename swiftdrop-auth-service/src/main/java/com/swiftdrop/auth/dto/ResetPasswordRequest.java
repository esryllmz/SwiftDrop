package com.swiftdrop.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Token must not be blank.")
        String token,

        @NotBlank(message = "New password must not be blank.")
        @Size(min = 8, message = "New password must be at least 8 characters.")
        String newPassword,

        @NotBlank(message = "Confirm password must not be blank.")
        String confirmPassword
) {
}

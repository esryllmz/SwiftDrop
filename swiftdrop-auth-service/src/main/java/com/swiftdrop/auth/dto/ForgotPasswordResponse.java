package com.swiftdrop.auth.dto;

import java.time.Instant;

public record ForgotPasswordResponse(
        String message,
        String devResetToken,
        Instant expiresAt
) {
}

package com.swiftdrop.auth.dto;

public record AuthResult(
        AuthResponse response,
        String refreshToken,
        long refreshTokenMaxAgeSeconds
) {
}

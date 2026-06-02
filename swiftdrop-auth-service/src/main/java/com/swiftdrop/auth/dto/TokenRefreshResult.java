package com.swiftdrop.auth.dto;

public record TokenRefreshResult(
        String accessToken,
        String refreshToken
) {
}

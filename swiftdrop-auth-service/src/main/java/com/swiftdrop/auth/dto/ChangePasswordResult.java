package com.swiftdrop.auth.dto;

public record ChangePasswordResult(
        ChangePasswordResponse response,
        String refreshToken,
        long refreshTokenMaxAgeSeconds
) {
}

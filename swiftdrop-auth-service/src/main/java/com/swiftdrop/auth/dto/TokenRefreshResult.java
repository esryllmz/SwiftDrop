package com.swiftdrop.auth.dto;

import java.util.UUID;

import com.swiftdrop.auth.entity.Role;

public record TokenRefreshResult(
        String accessToken,
        String refreshToken,
        UUID userId,
        String email,
        Role role,
        boolean passwordChangeRequired
) {
}

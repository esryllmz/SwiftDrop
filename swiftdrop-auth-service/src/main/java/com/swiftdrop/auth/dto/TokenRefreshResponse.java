package com.swiftdrop.auth.dto;

import java.util.UUID;

import com.swiftdrop.auth.entity.Role;

public record TokenRefreshResponse(
        String accessToken,
        String tokenType,
        UUID userId,
        String email,
        Role role
) {
}

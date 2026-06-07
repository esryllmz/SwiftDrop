package com.swiftdrop.auth.dto;

import java.util.UUID;

import com.swiftdrop.auth.entity.Role;

public record AuthResponse(
        String accessToken,
        String tokenType,
        UUID userId,
        String email,
        Role role
) {
}

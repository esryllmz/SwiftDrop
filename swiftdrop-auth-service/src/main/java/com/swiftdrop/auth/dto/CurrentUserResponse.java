package com.swiftdrop.auth.dto;

import java.util.UUID;

import com.swiftdrop.auth.entity.Role;

public record CurrentUserResponse(
        UUID userId,
        String email,
        Role role,
        boolean enabled
) {
}

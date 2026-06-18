package com.swiftdrop.auth.dto;

import java.util.UUID;

import com.swiftdrop.auth.entity.Role;

public record ProvisionUserResponse(
        UUID userId,
        String email,
        Role role,
        boolean enabled,
        boolean created,
        String temporaryPassword
) {
}

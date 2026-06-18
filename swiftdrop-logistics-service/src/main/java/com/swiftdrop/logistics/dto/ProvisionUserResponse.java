package com.swiftdrop.logistics.dto;

import java.util.UUID;

public record ProvisionUserResponse(
        UUID userId,
        String email,
        String role,
        boolean enabled,
        boolean created,
        String temporaryPassword
) {
}

package com.swiftdrop.logistics.dto;

import java.util.UUID;

public record ProvisionedAccountResponse(
        UUID userId,
        String email,
        String role,
        boolean created,
        String temporaryPassword
) {
}

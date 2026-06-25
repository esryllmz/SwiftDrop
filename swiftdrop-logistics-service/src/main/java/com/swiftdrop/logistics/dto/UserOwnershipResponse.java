package com.swiftdrop.logistics.dto;

public record UserOwnershipResponse(
        boolean exists,
        String role,
        boolean enabled
) {
}

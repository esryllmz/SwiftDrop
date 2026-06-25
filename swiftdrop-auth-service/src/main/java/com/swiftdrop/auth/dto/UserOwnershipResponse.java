package com.swiftdrop.auth.dto;

import com.swiftdrop.auth.entity.Role;

public record UserOwnershipResponse(
        boolean exists,
        Role role,
        boolean enabled
) {
    public static UserOwnershipResponse notFound() {
        return new UserOwnershipResponse(false, null, false);
    }
}

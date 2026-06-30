package com.swiftdrop.auth.dto;

import com.swiftdrop.auth.entity.Role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProvisionUserRequest(
        @NotBlank(message = "Email is required.")
        String email,

        @NotNull(message = "Role is required.")
        Role role
) {
}

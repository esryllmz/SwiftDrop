package com.swiftdrop.auth.dto;

import com.swiftdrop.auth.entity.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProvisionUserRequest(
        @NotBlank(message = "Email alani bos birakilamaz.")
        @Email(message = "Gecerli bir email adresi giriniz.")
        String email,

        @NotNull(message = "Role alani bos birakilamaz.")
        Role role
) {
}

package com.swiftdrop.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Email alani bos birakilamaz.")
        String email,

        @NotBlank(message = "Sifre alani bos birakilamaz.")
        String password,

        String portal
) {
    public LoginRequest(String email, String password) {
        this(email, password, null);
    }
}

package com.swiftdrop.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Email alani bos birakilamaz.")
        @Email(message = "Gecerli bir email adresi giriniz.")
        String email,

        @NotBlank(message = "Sifre alani bos birakilamaz.")
        @Size(min = 6, message = "Sifre en az 6 karakter olmalidir.")
        String password
) {
}

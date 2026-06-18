package com.swiftdrop.auth.mapper;

import org.springframework.stereotype.Component;

import com.swiftdrop.auth.dto.AuthResponse;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.entity.User;

@Component
public class UserMapper {

    public User toEntity(RegisterRequest request) {
        return User.builder()
                .email(request.email())
                .enabled(true)
                .passwordChangeRequired(false)
                .build();
    }

    public AuthResponse toAuthResponse(User user, String accessToken) {
        return new AuthResponse(
                accessToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.isPasswordChangeRequired()
        );
    }
}

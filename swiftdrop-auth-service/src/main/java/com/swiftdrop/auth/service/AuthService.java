package com.swiftdrop.auth.service;

import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.ChangePasswordRequest;
import com.swiftdrop.auth.dto.ChangePasswordResponse;
import com.swiftdrop.auth.dto.CurrentUserResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.TokenRefreshResult;

public interface AuthService {
    AuthResult register(RegisterRequest request);

    AuthResult login(LoginRequest request);

    TokenRefreshResult refreshToken(String refreshToken);

    CurrentUserResponse getCurrentUserFromToken(String accessToken);

    ChangePasswordResponse changePassword(String accessToken, ChangePasswordRequest request);

    void logout(String refreshToken);
}

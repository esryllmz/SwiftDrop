package com.swiftdrop.auth.service;

import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.TokenRefreshResult;

public interface AuthService {
    AuthResult register(RegisterRequest request);

    AuthResult login(LoginRequest request);

    TokenRefreshResult refreshToken(String refreshToken);

    void logout(String refreshToken);
}

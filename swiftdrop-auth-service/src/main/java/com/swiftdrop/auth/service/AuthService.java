package com.swiftdrop.auth.service;

import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.ChangePasswordRequest;
import com.swiftdrop.auth.dto.ChangePasswordResult;
import com.swiftdrop.auth.dto.CurrentUserResponse;
import com.swiftdrop.auth.dto.ForgotPasswordRequest;
import com.swiftdrop.auth.dto.ForgotPasswordResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.ResetPasswordRequest;
import com.swiftdrop.auth.dto.ResetPasswordResponse;
import com.swiftdrop.auth.dto.TokenRefreshResult;

public interface AuthService {
    AuthResult register(RegisterRequest request);

    AuthResult login(LoginRequest request);

    TokenRefreshResult refreshToken(String refreshToken);

    CurrentUserResponse getCurrentUserFromToken(String accessToken);

    ChangePasswordResult changePassword(String accessToken, ChangePasswordRequest request);

    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);

    ResetPasswordResponse resetPassword(ResetPasswordRequest request);

    void logout(String refreshToken);
}

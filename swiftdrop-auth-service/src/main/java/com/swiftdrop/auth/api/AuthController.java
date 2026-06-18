package com.swiftdrop.auth.api;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import com.swiftdrop.auth.config.RefreshTokenCookieService;
import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.AuthResponse;
import com.swiftdrop.auth.dto.ChangePasswordRequest;
import com.swiftdrop.auth.dto.ChangePasswordResponse;
import com.swiftdrop.auth.dto.CurrentUserResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.TokenRefreshResponse;
import com.swiftdrop.auth.dto.TokenRefreshResult;
import com.swiftdrop.auth.exception.AuthenticationFailedException;
import com.swiftdrop.auth.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieService refreshTokenCookieService;

    public AuthController(AuthService authService, RefreshTokenCookieService refreshTokenCookieService) {
        this.authService = authService;
        this.refreshTokenCookieService = refreshTokenCookieService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return respondWithRefreshCookie(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return respondWithRefreshCookie(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponse> refresh(
            @CookieValue(name = "refreshToken") String refreshToken
    ) {
        TokenRefreshResult result = authService.refreshToken(refreshToken);
        ResponseCookie refreshCookie = refreshTokenCookieService.buildRefreshTokenCookie(result.refreshToken());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(new TokenRefreshResponse(
                        result.accessToken(),
                        "Bearer",
                        result.userId(),
                        result.email(),
                        result.role(),
                        result.passwordChangeRequired()
                ));
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponse> me(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        String accessToken = extractBearerToken(authorizationHeader);
        return ResponseEntity.ok(authService.getCurrentUserFromToken(accessToken));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ChangePasswordResponse> changePassword(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        String accessToken = extractBearerToken(authorizationHeader);
        return ResponseEntity.ok(authService.changePassword(accessToken, request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        ResponseCookie clearCookie = refreshTokenCookieService.buildClearRefreshTokenCookie();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(Map.of("message", "Cikis islemi basarili."));
    }

    private ResponseEntity<AuthResponse> respondWithRefreshCookie(AuthResult result) {
        ResponseCookie refreshCookie = refreshTokenCookieService.buildRefreshTokenCookie(result.refreshToken());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(result.response());
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new AuthenticationFailedException("Authorization header bulunamadi.");
        }

        String prefix = "Bearer ";
        if (!authorizationHeader.startsWith(prefix) || authorizationHeader.length() <= prefix.length()) {
            throw new AuthenticationFailedException("Authorization header Bearer token formatinda olmalidir.");
        }

        return authorizationHeader.substring(prefix.length()).trim();
    }
}

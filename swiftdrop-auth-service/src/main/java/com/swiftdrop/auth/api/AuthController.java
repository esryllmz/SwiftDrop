package com.swiftdrop.auth.api;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import com.swiftdrop.auth.config.RefreshTokenCookieService;
import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.AuthResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.TokenRefreshResponse;
import com.swiftdrop.auth.dto.TokenRefreshResult;
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
                .body(new TokenRefreshResponse(result.accessToken()));
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
}

package com.swiftdrop.auth.config;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenCookieService {

    private final boolean secure;
    private final String sameSite;
    private final Duration refreshTokenLifetime;
    private final String path;

    public RefreshTokenCookieService(
            @Value("${application.security.cookie.secure}") boolean secure,
            @Value("${application.security.cookie.same-site}") String sameSite,
            @Value("${application.security.jwt.refresh-token.expiration}") long refreshExpirationMs,
            @Value("${application.security.cookie.path}") String path
    ) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.refreshTokenLifetime = Duration.ofMillis(refreshExpirationMs);
        this.path = path;
    }

    public ResponseCookie buildRefreshTokenCookie(String token) {
        return baseCookie(token)
                .maxAge(refreshTokenLifetime)
                .build();
    }

    public ResponseCookie buildClearRefreshTokenCookie() {
        return baseCookie("")
                .maxAge(0)
                .build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from("refreshToken", value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path);
    }
}

package com.swiftdrop.auth.config;

import java.time.Duration;
import java.util.Objects;

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
        Duration configuredRefreshTokenLifetime = Duration.ofMillis(refreshExpirationMs);
        this.refreshTokenLifetime = Objects.requireNonNull(
                configuredRefreshTokenLifetime,
                "refresh token lifetime must not be null"
        );
        this.path = Objects.requireNonNull(path, "cookie path must not be null");
        this.sameSite = Objects.requireNonNull(sameSite, "cookie same-site value must not be null");
    }

    public ResponseCookie buildRefreshTokenCookie(String token) {
        String cookieValue = Objects.requireNonNull(token, "refresh token must not be null");
        return baseCookie(cookieValue)
                .maxAge(refreshTokenLifetime)
                .build();
    }

    public ResponseCookie buildClearRefreshTokenCookie() {
        return baseCookie("")
                .maxAge(0)
                .build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        String cookieValue = Objects.requireNonNull(value, "cookie value must not be null");
        return ResponseCookie.from("refreshToken", cookieValue)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path);
    }
}

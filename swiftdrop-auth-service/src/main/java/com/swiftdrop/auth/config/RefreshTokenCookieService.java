package com.swiftdrop.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenCookieService {

    private final boolean secure;
    private final String sameSite;
    private final long maxAgeSeconds;
    private final String path;

    public RefreshTokenCookieService(
            @Value("${application.security.cookie.secure}") boolean secure,
            @Value("${application.security.cookie.same-site}") String sameSite,
            @Value("${application.security.cookie.max-age}") long maxAgeSeconds,
            @Value("${application.security.cookie.path}") String path
    ) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAgeSeconds = maxAgeSeconds;
        this.path = path;
    }

    public ResponseCookie buildRefreshTokenCookie(String token) {
        return baseCookie(token)
                .maxAge(maxAgeSeconds)
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

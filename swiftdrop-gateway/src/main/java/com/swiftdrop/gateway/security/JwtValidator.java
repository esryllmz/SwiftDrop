package com.swiftdrop.gateway.security;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Component
public class JwtValidator {

    private final String secretKey;
    private SecretKey signingKey;

    public JwtValidator(@Value("${application.security.jwt.secret-key}") String secretKey) {
        this.secretKey = secretKey;
    }

    @PostConstruct
    void initializeSigningKey() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("JWT secret key cannot be blank.");
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("JWT secret key must be Base64 encoded.", ex);
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret key must be at least 256 bits for HMAC-SHA.");
        }

        signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public JwtClaims validate(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String email = claims.getSubject();
            if (email == null || email.isBlank()) {
                throw new JwtException("JWT subject is missing.");
            }

            String userId = claims.get("userId", String.class);
            if (userId == null || userId.isBlank()) {
                throw new JwtException("JWT user id is missing.");
            }

            return new JwtClaims(userId, email, claims.get("role", String.class));
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidAccessTokenException("Missing or invalid access token", ex);
        }
    }
}

package com.swiftdrop.gateway.security;

public record JwtClaims(
        String userId,
        String email,
        String role
) {
}

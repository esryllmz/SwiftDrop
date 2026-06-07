package com.swiftdrop.gateway.security;

public record JwtClaims(
        String email,
        String role
) {
}

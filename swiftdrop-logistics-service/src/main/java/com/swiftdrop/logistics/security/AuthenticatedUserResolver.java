package com.swiftdrop.logistics.security;

import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.swiftdrop.logistics.exception.ForbiddenPortalAccessException;
import com.swiftdrop.logistics.exception.MissingAuthenticationContextException;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class AuthenticatedUserResolver {

    private static final String USER_ID_HEADER = "X-Authenticated-User";
    private static final String EMAIL_HEADER = "X-User-Email";
    private static final String ROLE_HEADER = "X-User-Role";
    private static final String ROLE_PREFIX = "ROLE_";

    public AuthenticatedUser resolve(HttpServletRequest request, String expectedRole) {
        String userIdHeader = requiredHeader(request, USER_ID_HEADER);
        String email = requiredHeader(request, EMAIL_HEADER);
        String role = normalizeRole(requiredHeader(request, ROLE_HEADER));
        String normalizedExpectedRole = normalizeRole(expectedRole);

        if (!normalizedExpectedRole.equals(role)) {
            throw new ForbiddenPortalAccessException("Authenticated user role is not allowed for this portal.");
        }

        final UUID userId;
        try {
            userId = UUID.fromString(userIdHeader);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid authenticated user id.");
        }

        return new AuthenticatedUser(userId, email, role);
    }

    private String requiredHeader(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        if (value == null || value.isBlank()) {
            throw new MissingAuthenticationContextException("Missing authenticated user context.");
        }
        return value.trim();
    }

    private String normalizeRole(String role) {
        String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
        if (normalizedRole.startsWith(ROLE_PREFIX)) {
            return normalizedRole.substring(ROLE_PREFIX.length());
        }
        return normalizedRole;
    }
}

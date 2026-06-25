package com.swiftdrop.logistics.util;

import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

public final class EmailNormalizer {

    private static final Pattern SIMPLE_EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private EmailNormalizer() {
    }

    public static String normalizeRequired(String email) {
        String normalized = Objects.requireNonNull(email, "contact email must not be null")
                .trim()
                .toLowerCase(Locale.ROOT);
        if (!SIMPLE_EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Enter a valid email address.");
        }
        return normalized;
    }
}

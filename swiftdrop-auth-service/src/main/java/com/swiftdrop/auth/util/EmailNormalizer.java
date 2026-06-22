package com.swiftdrop.auth.util;

import java.util.Locale;
import java.util.regex.Pattern;

public final class EmailNormalizer {

    private static final Pattern SIMPLE_EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private EmailNormalizer() {
    }

    public static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean isValidNormalizedEmail(String email) {
        return email != null && SIMPLE_EMAIL_PATTERN.matcher(email).matches();
    }
}

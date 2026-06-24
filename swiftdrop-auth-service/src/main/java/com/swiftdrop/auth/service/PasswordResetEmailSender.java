package com.swiftdrop.auth.service;

import java.time.Instant;

/**
 * Abstraction for sending password reset emails.
 * Implementations should handle email delivery to users initiating password resets.
 */
public interface PasswordResetEmailSender {

    /**
     * Send a password reset email to the specified recipient.
     *
     * @param recipientEmail the email address to send the reset link to
     * @param resetUrl the URL the user should visit to reset their password
     * @param expiresAt the instant when the reset token expires
     * @param requestId unique request ID for logging/tracing
     * @throws RuntimeException if email delivery fails
     */
    void sendPasswordResetEmail(
            String recipientEmail,
            String resetUrl,
            Instant expiresAt,
            String requestId
    );
}

package com.swiftdrop.auth.service.impl;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import com.swiftdrop.auth.service.PasswordResetEmailSender;

/**
 * No-op implementation of PasswordResetEmailSender.
 * Used when email sending is disabled or not configured.
 */
@Service("noOpPasswordResetEmailSender")
@ConditionalOnProperty(
        name = "application.password-reset.email.provider",
        havingValue = "none",
        matchIfMissing = false
)
public class NoOpPasswordResetEmailSender implements PasswordResetEmailSender {

    private static final Logger LOG = LoggerFactory.getLogger(NoOpPasswordResetEmailSender.class);

    @Override
    public void sendPasswordResetEmail(
            String recipientEmail,
            String resetUrl,
            Instant expiresAt,
            String requestId
    ) {
        LOG.info("Email sending disabled - skipping password reset email [requestId={}]", requestId);
    }
}

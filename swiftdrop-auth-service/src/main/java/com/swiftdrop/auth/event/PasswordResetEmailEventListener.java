package com.swiftdrop.auth.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import com.swiftdrop.auth.service.PasswordResetEmailSender;

/**
 * Listener for PasswordResetTokenCreatedEvent that sends the password reset email.
 * Email sending is executed asynchronously after transaction commit.
 */
@Component
public class PasswordResetEmailEventListener {

    private static final Logger LOG = LoggerFactory.getLogger(PasswordResetEmailEventListener.class);

    private final PasswordResetEmailSender emailSender;
    private final String resetPasswordBaseUrl;

    public PasswordResetEmailEventListener(
            PasswordResetEmailSender emailSender,
            @Value("${application.password-reset.reset-password-url:http://localhost:3001}") String resetPasswordBaseUrl
    ) {
        this.emailSender = emailSender;
        this.resetPasswordBaseUrl = resetPasswordBaseUrl;
    }

    @Async
    @EventListener
    public void handlePasswordResetTokenCreated(PasswordResetTokenCreatedEvent event) {
        try {
            String resetUrl = String.format(
                    "%s/reset-password?portal=%s&token=%s",
                    resetPasswordBaseUrl,
                    event.getPortal().toLowerCase(),
                    event.getRawToken()
            );

            emailSender.sendPasswordResetEmail(
                    event.getRecipientEmail(),
                    resetUrl,
                    event.getExpiresAt(),
                    event.getRequestId()
            );
            
            LOG.debug("Password reset email sent successfully for request [requestId={}]", event.getRequestId());
        } catch (Exception e) {
            LOG.error("Failed to send password reset email [requestId={}]", event.getRequestId(), e);
            // Error is logged but not thrown to prevent breaking the password reset flow
        }
    }
}

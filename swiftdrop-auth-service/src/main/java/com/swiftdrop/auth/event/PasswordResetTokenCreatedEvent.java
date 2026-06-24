package com.swiftdrop.auth.event;

import java.time.Instant;
import org.springframework.context.ApplicationEvent;

/**
 * Event published after a password reset token is successfully created.
 * Listeners can use this event to trigger email sending or other async operations.
 */
public class PasswordResetTokenCreatedEvent extends ApplicationEvent {

    private final String recipientEmail;
    private final String rawToken;
    private final Instant expiresAt;
    private final String portal;
    private final String requestId;

    public PasswordResetTokenCreatedEvent(
            Object source,
            String recipientEmail,
            String rawToken,
            Instant expiresAt,
            String portal,
            String requestId
    ) {
        super(source);
        this.recipientEmail = recipientEmail;
        this.rawToken = rawToken;
        this.expiresAt = expiresAt;
        this.portal = portal;
        this.requestId = requestId;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public String getRawToken() {
        return rawToken;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public String getPortal() {
        return portal;
    }

    public String getRequestId() {
        return requestId;
    }
}

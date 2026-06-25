package com.swiftdrop.auth.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.lang.reflect.Method;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.swiftdrop.auth.service.PasswordResetEmailSender;

class PasswordResetEmailEventListenerTest {

    @Test
    void listenerRunsAsynchronouslyAfterCommit() throws NoSuchMethodException {
        Method listenerMethod = PasswordResetEmailEventListener.class.getMethod(
                "handlePasswordResetTokenCreated",
                PasswordResetTokenCreatedEvent.class
        );

        assertThat(listenerMethod.getAnnotation(Async.class)).isNotNull();
        TransactionalEventListener annotation =
                listenerMethod.getAnnotation(TransactionalEventListener.class);
        assertThat(annotation).isNotNull();
        assertThat(annotation.phase()).isEqualTo(TransactionPhase.AFTER_COMMIT);
    }

    @Test
    void listenerBuildsPortalSpecificResetLink() {
        PasswordResetEmailSender sender = mock(PasswordResetEmailSender.class);
        PasswordResetEmailEventListener listener =
                new PasswordResetEmailEventListener(sender, "http://localhost:3001");
        Instant expiresAt = Instant.parse("2026-06-26T12:00:00Z");

        listener.handlePasswordResetTokenCreated(event(expiresAt));

        verify(sender).sendPasswordResetEmail(
                eq("merchant@swiftdrop.com"),
                eq("http://localhost:3001/reset-password?portal=merchant&token=raw-token"),
                eq(expiresAt),
                eq("request-id")
        );
    }

    @Test
    void senderFailureDoesNotEscapeListener() {
        PasswordResetEmailSender sender = mock(PasswordResetEmailSender.class);
        doThrow(new IllegalStateException("SMTP unavailable"))
                .when(sender)
                .sendPasswordResetEmail(
                        eq("merchant@swiftdrop.com"),
                        contains("/reset-password?"),
                        eq(Instant.parse("2026-06-26T12:00:00Z")),
                        eq("request-id")
                );
        PasswordResetEmailEventListener listener =
                new PasswordResetEmailEventListener(sender, "http://localhost:3001");

        assertThatCode(() -> listener.handlePasswordResetTokenCreated(
                event(Instant.parse("2026-06-26T12:00:00Z"))
        )).doesNotThrowAnyException();
    }

    private PasswordResetTokenCreatedEvent event(Instant expiresAt) {
        return new PasswordResetTokenCreatedEvent(
                this,
                "merchant@swiftdrop.com",
                "raw-token",
                expiresAt,
                "MERCHANT",
                "request-id"
        );
    }
}

package com.swiftdrop.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.client.RestClient;

import com.swiftdrop.auth.service.impl.NoOpPasswordResetEmailSender;
import com.swiftdrop.auth.service.impl.OneSignalPasswordResetEmailSender;
import com.swiftdrop.auth.service.impl.SmtpMailProperties;
import com.swiftdrop.auth.service.impl.SmtpPasswordResetEmailSender;

class PasswordResetEmailProviderSelectionTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(JavaMailSender.class, () -> mock(JavaMailSender.class))
            .withBean(RestClient.Builder.class, RestClient::builder)
            .withBean(SmtpMailProperties.class, SmtpMailProperties::new)
            .withUserConfiguration(
                    SmtpPasswordResetEmailSender.class,
                    NoOpPasswordResetEmailSender.class,
                    OneSignalPasswordResetEmailSender.class
            );

    @Test
    void smtpSelectsOnlySmtpSender() {
        contextRunner
                .withPropertyValues("application.password-reset.email.provider=smtp")
                .run(context -> {
                    assertThat(context).hasSingleBean(PasswordResetEmailSender.class);
                    assertThat(context).hasSingleBean(SmtpPasswordResetEmailSender.class);
                });
    }

    @Test
    void noneSelectsOnlyNoOpSender() {
        contextRunner
                .withPropertyValues("application.password-reset.email.provider=none")
                .run(context -> {
                    assertThat(context).hasSingleBean(PasswordResetEmailSender.class);
                    assertThat(context).hasSingleBean(NoOpPasswordResetEmailSender.class);
                });
    }

    @Test
    void missingProviderFallsBackToNoOpSender() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(PasswordResetEmailSender.class);
            assertThat(context).hasSingleBean(NoOpPasswordResetEmailSender.class);
        });
    }

    @Test
    void oneSignalSelectsOnlyOneSignalSender() {
        contextRunner
                .withPropertyValues(
                        "application.password-reset.email.provider=onesignal",
                        "application.password-reset.email.onesignal.api-url=https://example.invalid"
                )
                .run(context -> {
                    assertThat(context).hasSingleBean(PasswordResetEmailSender.class);
                    assertThat(context).hasSingleBean(OneSignalPasswordResetEmailSender.class);
                });
    }
}

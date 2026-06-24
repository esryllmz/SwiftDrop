package com.swiftdrop.notification.config.properties;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class NotificationConfigurationPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(PropertiesConfiguration.class);

    @Test
    void bindsNotificationConfigurationProperties() {
        contextRunner
                .withPropertyValues(
                        "application.idempotency.processed-event-ttl=168",
                        "application.kafka.retry.max-attempts=5",
                        "application.kafka.retry.backoff=1500",
                        "application.onesignal.mock-enabled=false",
                        "application.onesignal.app-id=app-id",
                        "application.onesignal.api-key=api-key"
                )
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(IdempotencyProperties.class).processedEventTtl())
                            .isEqualTo(Duration.ofDays(7));
                    assertThat(context.getBean(KafkaRetryProperties.class).maxAttempts()).isEqualTo(5);
                    assertThat(context.getBean(KafkaRetryProperties.class).backoff())
                            .isEqualTo(Duration.ofMillis(1500));
                    assertThat(context.getBean(OneSignalProperties.class).mockEnabled()).isFalse();
                    assertThat(context.getBean(OneSignalProperties.class).appId()).isEqualTo("app-id");
                    assertThat(context.getBean(OneSignalProperties.class).apiKey()).isEqualTo("api-key");
                });
    }

    @Test
    void allowsBlankOneSignalCredentialsWhenMockModeIsEnabled() {
        contextRunner
                .withPropertyValues(
                        "application.idempotency.processed-event-ttl=24",
                        "application.kafka.retry.max-attempts=3",
                        "application.kafka.retry.backoff=1000",
                        "application.onesignal.mock-enabled=true",
                        "application.onesignal.app-id=",
                        "application.onesignal.api-key="
                )
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    OneSignalProperties properties = context.getBean(OneSignalProperties.class);
                    assertThat(properties.mockEnabled()).isTrue();
                    assertThat(properties.appId()).isEmpty();
                    assertThat(properties.apiKey()).isEmpty();
                });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties({
            IdempotencyProperties.class,
            KafkaRetryProperties.class,
            OneSignalProperties.class
    })
    static class PropertiesConfiguration {
    }
}

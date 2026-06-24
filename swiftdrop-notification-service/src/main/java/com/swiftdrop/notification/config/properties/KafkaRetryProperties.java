package com.swiftdrop.notification.config.properties;

import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.convert.DurationUnit;

@ConfigurationProperties(prefix = "application.kafka.retry")
public record KafkaRetryProperties(
        int maxAttempts,
        @DurationUnit(ChronoUnit.MILLIS) Duration backoff
) {

    public KafkaRetryProperties {
        if (maxAttempts < 1) {
            throw new IllegalArgumentException("Kafka retry max attempts must be at least 1");
        }
        backoff = Objects.requireNonNull(backoff, "Kafka retry backoff must not be null");
        if (backoff.isNegative()) {
            throw new IllegalArgumentException("Kafka retry backoff must not be negative");
        }
    }
}

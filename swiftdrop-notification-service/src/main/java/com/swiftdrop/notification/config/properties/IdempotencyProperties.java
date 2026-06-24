package com.swiftdrop.notification.config.properties;

import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.convert.DurationUnit;

@ConfigurationProperties(prefix = "application.idempotency")
public record IdempotencyProperties(
        @DurationUnit(ChronoUnit.HOURS) Duration processedEventTtl
) {

    public IdempotencyProperties {
        processedEventTtl = Objects.requireNonNull(
                processedEventTtl,
                "processed event ttl must not be null"
        );
        if (processedEventTtl.isZero() || processedEventTtl.isNegative()) {
            throw new IllegalArgumentException("processed event ttl must be positive");
        }
    }
}

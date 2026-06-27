package com.swiftdrop.gateway.monitoring;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "application.monitoring")
public record MonitoringProperties(
        long timeoutMs,
        String authServiceUrl,
        String logisticsServiceUrl,
        String notificationServiceUrl,
        String internalApiKey,
        Outbox outbox,
        Kafka kafka
) {

    public MonitoringProperties {
        if (timeoutMs <= 0) {
            timeoutMs = 1500;
        }
        outbox = outbox == null ? new Outbox(10, 60) : outbox;
        kafka = kafka == null ? new Kafka(10) : kafka;
    }

    public record Outbox(long pendingWarningThreshold, long oldestAgeWarningSeconds) {
    }

    public record Kafka(long lagWarningThreshold) {
    }
}

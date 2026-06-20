package com.swiftdrop.notification.service;

import java.util.Objects;

public record KafkaMessageMetadata(
        String topic,
        Integer partition,
        Long offset,
        String key
) {

    public KafkaMessageMetadata {
        Objects.requireNonNull(topic, "Kafka topic must not be null");
        Objects.requireNonNull(partition, "Kafka partition must not be null");
        Objects.requireNonNull(offset, "Kafka offset must not be null");
    }
}

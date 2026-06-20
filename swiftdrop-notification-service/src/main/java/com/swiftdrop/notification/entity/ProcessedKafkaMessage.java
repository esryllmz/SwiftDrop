package com.swiftdrop.notification.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "processed_kafka_messages",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_processed_kafka_message_topic_partition_offset",
                        columnNames = {"topic", "message_partition", "message_offset"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProcessedKafkaMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "message_key", length = 200)
    private String messageKey;

    @Column(nullable = false, length = 200)
    private String topic;

    @Column(name = "message_partition", nullable = false)
    private Integer partition;

    @Column(name = "message_offset", nullable = false)
    private Long offset;

    @Column(name = "event_type", nullable = false, length = 120)
    private String eventType;

    @Column(name = "aggregate_id", nullable = false, length = 80)
    private String aggregateId;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (processedAt == null) {
            processedAt = now;
        }
        createdAt = now;
    }
}

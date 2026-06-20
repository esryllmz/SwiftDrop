package com.swiftdrop.notification.repository;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swiftdrop.notification.entity.ProcessedKafkaMessage;

public interface ProcessedKafkaMessageRepository extends JpaRepository<ProcessedKafkaMessage, UUID> {

    boolean existsByTopicAndPartitionAndOffset(String topic, Integer partition, Long offset);

    @Modifying
    @Query(
            value = """
                    INSERT INTO processed_kafka_messages (
                        id,
                        message_key,
                        topic,
                        message_partition,
                        message_offset,
                        event_type,
                        aggregate_id,
                        processed_at,
                        created_at
                    )
                    VALUES (
                        :id,
                        :messageKey,
                        :topic,
                        :partition,
                        :offset,
                        :eventType,
                        :aggregateId,
                        :processedAt,
                        :createdAt
                    )
                    ON CONFLICT ON CONSTRAINT uk_processed_kafka_message_topic_partition_offset DO NOTHING
                    """,
            nativeQuery = true
    )
    int insertIfAbsent(
            @Param("id") UUID id,
            @Param("messageKey") String messageKey,
            @Param("topic") String topic,
            @Param("partition") Integer partition,
            @Param("offset") Long offset,
            @Param("eventType") String eventType,
            @Param("aggregateId") String aggregateId,
            @Param("processedAt") Instant processedAt,
            @Param("createdAt") Instant createdAt
    );
}

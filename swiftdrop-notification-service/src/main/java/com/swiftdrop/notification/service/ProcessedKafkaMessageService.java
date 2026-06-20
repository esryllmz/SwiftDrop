package com.swiftdrop.notification.service;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.notification.dto.OrderKafkaEvent;
import com.swiftdrop.notification.repository.ProcessedKafkaMessageRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProcessedKafkaMessageService {

    private static final String ORDER_AGGREGATE_EVENT_PREFIX = "ORDER_";

    private final ProcessedKafkaMessageRepository repository;

    @Transactional(readOnly = true)
    public boolean isProcessed(KafkaMessageMetadata metadata) {
        KafkaMessageMetadata messageMetadata = Objects.requireNonNull(metadata, "Kafka metadata must not be null");
        boolean processed = repository.existsByTopicAndPartitionAndOffset(
                messageMetadata.topic(),
                messageMetadata.partition(),
                messageMetadata.offset()
        );
        if (processed) {
            log.info(
                    "Skipping duplicate Kafka message from database. topic={}, partition={}, offset={}",
                    messageMetadata.topic(),
                    messageMetadata.partition(),
                    messageMetadata.offset()
            );
        }
        return processed;
    }

    @Transactional
    public void markProcessed(KafkaMessageMetadata metadata, OrderKafkaEvent event) {
        KafkaMessageMetadata messageMetadata = Objects.requireNonNull(metadata, "Kafka metadata must not be null");
        OrderKafkaEvent orderEvent = Objects.requireNonNull(event, "order event must not be null");
        Instant processedAt = Instant.now();
        String eventType = eventType(orderEvent);
        String aggregateId = Objects.requireNonNull(orderEvent.orderId(), "order event id must not be null").toString();

        int insertedRows = repository.insertIfAbsent(
                UUID.randomUUID(),
                messageMetadata.key(),
                messageMetadata.topic(),
                messageMetadata.partition(),
                messageMetadata.offset(),
                eventType,
                aggregateId,
                processedAt,
                processedAt
        );

        if (insertedRows > 0) {
            log.info(
                    "Saved processed Kafka message. topic={}, partition={}, offset={}, eventType={}, aggregateId={}",
                    messageMetadata.topic(),
                    messageMetadata.partition(),
                    messageMetadata.offset(),
                    eventType,
                    aggregateId
            );
            return;
        }

        log.info(
                "Processed Kafka message already exists; ignoring duplicate race. topic={}, partition={}, offset={}",
                messageMetadata.topic(),
                messageMetadata.partition(),
                messageMetadata.offset()
        );
    }

    private String eventType(OrderKafkaEvent event) {
        String status = Objects.requireNonNull(event.status(), "order event status must not be null");
        return ORDER_AGGREGATE_EVENT_PREFIX + status;
    }
}

package com.swiftdrop.logistics.service.impl;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.logistics.dto.EventEnvelope;
import com.swiftdrop.logistics.dto.OrderKafkaEvent;
import com.swiftdrop.logistics.entity.OutboxEvent;
import com.swiftdrop.logistics.entity.OutboxStatus;
import com.swiftdrop.logistics.service.OutboxService;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OutboxServiceImpl implements OutboxService {

    private static final String ORDER_TOPIC = "order-events";
    private static final String ORDER_AGGREGATE_TYPE = "ORDER";
    private static final int EVENT_VERSION = 1;

    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void saveOrderEvent(
            String eventType,
            UUID aggregateId,
            String eventKey,
            OrderKafkaEvent payload,
            String correlationId
    ) {
        UUID eventId = UUID.randomUUID();
        EventEnvelope envelope = new EventEnvelope(
                eventId,
                eventType,
                EVENT_VERSION,
                LocalDateTime.now(),
                correlationId,
                payload
        );

        OutboxEvent outboxEvent = OutboxEvent.builder()
                .id(eventId)
                .aggregateType(ORDER_AGGREGATE_TYPE)
                .aggregateId(aggregateId)
                .eventType(eventType)
                .topic(ORDER_TOPIC)
                .eventKey(eventKey)
                .payload(serialize(envelope))
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .correlationId(correlationId)
                .version(EVENT_VERSION)
                .build();
        OutboxEvent eventToPersist = Objects.requireNonNull(outboxEvent, "outbox event must not be null");
        entityManager.persist(eventToPersist);
    }

    private String serialize(EventEnvelope envelope) {
        try {
            return objectMapper.writeValueAsString(envelope);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Outbox event serialize edilemedi.", ex);
        }
    }
}

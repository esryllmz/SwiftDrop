package com.swiftdrop.logistics.service.outbox;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.logistics.dto.OrderKafkaEvent;
import com.swiftdrop.logistics.entity.OutboxEvent;
import com.swiftdrop.logistics.entity.OutboxStatus;
import com.swiftdrop.logistics.repository.OutboxEventRepository;
import com.swiftdrop.logistics.service.kafka.LogisticsKafkaProducer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {

    private static final long KAFKA_SEND_TIMEOUT_SECONDS = 10;

    private final OutboxEventRepository outboxEventRepository;
    private final LogisticsKafkaProducer kafkaProducer;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Value("${application.outbox.max-retry-attempts:5}")
    private int maxRetryAttempts;

    @Value("${application.outbox.publish-batch-size:25}")
    private int publishBatchSize;

    @Scheduled(fixedDelayString = "${application.outbox.publisher-fixed-delay-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        if (!running.compareAndSet(false, true)) {
            log.debug("Outbox publisher is already running; skipping this tick.");
            return;
        }

        try {
            List<OutboxEvent> events = outboxEventRepository.findPendingForPublishForUpdateSkipLocked(publishBatchSize);

            for (OutboxEvent event : events) {
                publish(event);
            }
        } finally {
            running.set(false);
        }
    }

    private void publish(OutboxEvent event) {
        try {
            OrderKafkaEvent payload = extractLegacyPayload(event);
            kafkaProducer.sendOrderEvent(event.getTopic(), event.getEventKey(), payload)
                    .get(KAFKA_SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);

            event.setStatus(OutboxStatus.SENT);
            event.setSentAt(LocalDateTime.now());
            event.setLastError(null);
            Objects.requireNonNull(
                    outboxEventRepository.save(event),
                    "sent outbox event must not be null"
            );
        } catch (Exception ex) {
            markFailedOrRetry(event, ex);
        }
    }

    private OrderKafkaEvent extractLegacyPayload(OutboxEvent event) throws java.io.IOException {
        JsonNode envelope = objectMapper.readTree(event.getPayload());
        JsonNode payloadNode = envelope.get("payload");
        if (payloadNode == null || payloadNode.isNull()) {
            throw new IllegalStateException("Outbox payload is required.");
        }
        return objectMapper.treeToValue(payloadNode, OrderKafkaEvent.class);
    }

    private void markFailedOrRetry(OutboxEvent event, Exception ex) {
        int retryCount = event.getRetryCount() + 1;
        event.setRetryCount(retryCount);
        event.setLastError(limitError(ex));

        if (retryCount >= maxRetryAttempts) {
            event.setStatus(OutboxStatus.FAILED);
        }

        OutboxEvent savedEvent = Objects.requireNonNull(
                outboxEventRepository.save(event),
                "failed outbox event must not be null"
        );
        log.warn(
                "Outbox event publish failed. eventId={}, retryCount={}, status={}",
                savedEvent.getId(),
                savedEvent.getRetryCount(),
                savedEvent.getStatus(),
                ex
        );
    }

    private String limitError(Exception ex) {
        String message = ex.getMessage() == null ? ex.getClass().getName() : ex.getMessage();
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }
}

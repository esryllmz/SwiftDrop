package com.swiftdrop.logistics.service.outbox;

import java.time.LocalDateTime;
import java.util.List;
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

    @Value("${application.outbox.max-retry-attempts:5}")
    private int maxRetryAttempts;

    @Scheduled(fixedDelayString = "${application.outbox.publisher-fixed-delay-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> events = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);

        for (OutboxEvent event : events) {
            publish(event);
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
            outboxEventRepository.save(event);
        } catch (Exception ex) {
            markFailedOrRetry(event, ex);
        }
    }

    private OrderKafkaEvent extractLegacyPayload(OutboxEvent event) throws java.io.IOException {
        JsonNode envelope = objectMapper.readTree(event.getPayload());
        JsonNode payloadNode = envelope.get("payload");
        if (payloadNode == null || payloadNode.isNull()) {
            throw new IllegalStateException("Outbox payload alani bos.");
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

        outboxEventRepository.save(event);
        log.warn(
                "Outbox event publish failed. eventId={}, retryCount={}, status={}",
                event.getId(),
                event.getRetryCount(),
                event.getStatus(),
                ex
        );
    }

    private String limitError(Exception ex) {
        String message = ex.getMessage() == null ? ex.getClass().getName() : ex.getMessage();
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }
}

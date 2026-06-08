package com.swiftdrop.logistics.service.kafka;

import java.util.Objects;
import java.util.concurrent.CompletableFuture;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import com.swiftdrop.logistics.dto.OrderKafkaEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class LogisticsKafkaProducer {

    private static final String TOPIC = "order-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public CompletableFuture<SendResult<String, Object>> sendOrderEvent(OrderKafkaEvent event) {
        OrderKafkaEvent orderEvent = Objects.requireNonNull(event, "order event must not be null");
        return sendOrderEvent(TOPIC, orderEvent.orderId().toString(), orderEvent);
    }

    public CompletableFuture<SendResult<String, Object>> sendOrderEvent(String topic, String eventKey, OrderKafkaEvent event) {
        String resolvedTopic = Objects.requireNonNull(topic, "Kafka topic must not be null");
        String resolvedEventKey = Objects.requireNonNull(eventKey, "Kafka event key must not be null");
        OrderKafkaEvent orderEvent = Objects.requireNonNull(event, "order event must not be null");
        log.info("Sending order event. topic={}, status={}, orderId={}", resolvedTopic, orderEvent.status(), orderEvent.orderId());
        return Objects.requireNonNull(
                kafkaTemplate.send(resolvedTopic, resolvedEventKey, orderEvent),
                "Kafka send future must not be null"
        );
    }
}

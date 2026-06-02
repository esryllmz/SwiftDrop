package com.swiftdrop.logistics.service.kafka;

import java.util.concurrent.CompletableFuture;

import org.springframework.kafka.support.SendResult;
import org.springframework.kafka.core.KafkaTemplate;
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
        return sendOrderEvent(TOPIC, event.orderId().toString(), event);
    }

    public CompletableFuture<SendResult<String, Object>> sendOrderEvent(String topic, String eventKey, OrderKafkaEvent event) {
        log.info("Sending order event. topic={}, status={}, orderId={}", topic, event.status(), event.orderId());
        return kafkaTemplate.send(topic, eventKey, event);
    }
}

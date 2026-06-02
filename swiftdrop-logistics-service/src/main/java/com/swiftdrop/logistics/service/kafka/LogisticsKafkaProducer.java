package com.swiftdrop.logistics.service.kafka;

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

    public void sendOrderEvent(OrderKafkaEvent event) {
        log.info("Sending order event. topic={}, status={}, orderId={}", TOPIC, event.status(), event.orderId());
        kafkaTemplate.send(TOPIC, event.orderId().toString(), event);
    }
}

package com.swiftdrop.notification.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class OrderKafkaEventTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void deserializesCancellationEventWithExtendedFields() throws Exception {
        UUID orderId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        String payload = """
                {
                  "orderId": "%s",
                  "status": "CANCELLED",
                  "message": "Cancelled",
                  "targetUserId": "%s",
                  "previousStatus": "PREPARING",
                  "newStatus": "CANCELLED",
                  "actorType": "MERCHANT",
                  "reason": "The store cannot prepare this order.",
                  "occurredAt": "2026-06-27T10:15:30",
                  "ignoredField": "safe"
                }
                """.formatted(orderId, targetUserId);

        OrderKafkaEvent event = objectMapper.readValue(payload, OrderKafkaEvent.class);

        assertThat(event.orderId()).isEqualTo(orderId);
        assertThat(event.status()).isEqualTo("CANCELLED");
        assertThat(event.previousStatus()).isEqualTo("PREPARING");
        assertThat(event.newStatus()).isEqualTo("CANCELLED");
        assertThat(event.actorType()).isEqualTo("MERCHANT");
        assertThat(event.reason()).isEqualTo("The store cannot prepare this order.");
    }

    @Test
    void deserializesOnTheWayEventWithoutReason() throws Exception {
        UUID orderId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        String payload = """
                {
                  "orderId": "%s",
                  "status": "ON_THE_WAY",
                  "message": "On the way",
                  "targetUserId": "%s",
                  "previousStatus": "PICKED_UP",
                  "newStatus": "ON_THE_WAY",
                  "actorType": "COURIER",
                  "occurredAt": "2026-06-27T10:20:30"
                }
                """.formatted(orderId, targetUserId);

        OrderKafkaEvent event = objectMapper.readValue(payload, OrderKafkaEvent.class);

        assertThat(event.status()).isEqualTo("ON_THE_WAY");
        assertThat(event.reason()).isNull();
        assertThat(event.actorType()).isEqualTo("COURIER");
    }
}

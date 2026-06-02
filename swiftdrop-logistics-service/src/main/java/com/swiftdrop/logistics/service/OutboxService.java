package com.swiftdrop.logistics.service;

import java.util.UUID;

import com.swiftdrop.logistics.dto.OrderKafkaEvent;

public interface OutboxService {

    void saveOrderEvent(String eventType, UUID aggregateId, String eventKey, OrderKafkaEvent payload, String correlationId);
}

package com.swiftdrop.notification.service;

import com.swiftdrop.notification.dto.OrderKafkaEvent;

public interface ProcessedEventService {

    boolean isProcessed(OrderKafkaEvent event);

    void markProcessed(OrderKafkaEvent event);
}

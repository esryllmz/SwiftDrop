package com.swiftdrop.notification.service.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.swiftdrop.notification.dto.OrderKafkaEvent;
import com.swiftdrop.notification.service.OneSignalService;
import com.swiftdrop.notification.service.ProcessedEventService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventListener {

    private final OneSignalService oneSignalService;
    private final ProcessedEventService processedEventService;

    @KafkaListener(topics = "order-events", groupId = "swiftdrop-notification-group")
    public void consumeOrderEvent(OrderKafkaEvent event) {
        log.info("Received order event. orderId={}, status={}", event.orderId(), event.status());

        if (processedEventService.isProcessed(event)) {
            log.info(
                    "Skipping duplicate order notification event. orderId={}, status={}, targetUserId={}",
                    event.orderId(),
                    event.status(),
                    event.targetUserId()
            );
            return;
        }

        oneSignalService.sendWebPushNotification(event);
        processedEventService.markProcessed(event);
    }
}

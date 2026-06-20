package com.swiftdrop.notification.service.kafka;

import java.util.Objects;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.swiftdrop.notification.dto.OrderKafkaEvent;
import com.swiftdrop.notification.service.KafkaMessageMetadata;
import com.swiftdrop.notification.service.OneSignalService;
import com.swiftdrop.notification.service.ProcessedEventService;
import com.swiftdrop.notification.service.ProcessedKafkaMessageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventListener {

    private final OneSignalService oneSignalService;
    private final ProcessedEventService processedEventService;
    private final ProcessedKafkaMessageService processedKafkaMessageService;

    @KafkaListener(topics = "order-events", groupId = "swiftdrop-notification-group")
    public void consumeOrderEvent(ConsumerRecord<String, OrderKafkaEvent> record) {
        ConsumerRecord<String, OrderKafkaEvent> consumerRecord = Objects.requireNonNull(
                record,
                "Kafka consumer record must not be null"
        );
        OrderKafkaEvent event = Objects.requireNonNull(consumerRecord.value(), "order event must not be null");
        KafkaMessageMetadata metadata = new KafkaMessageMetadata(
                consumerRecord.topic(),
                consumerRecord.partition(),
                consumerRecord.offset(),
                consumerRecord.key()
        );

        log.info("Received order event. orderId={}, status={}", event.orderId(), event.status());

        if (processedKafkaMessageService.isProcessed(metadata)) {
            return;
        }

        if (processedEventService.isProcessed(event)) {
            log.info(
                    "Skipping duplicate order notification event from Redis. orderId={}, status={}, targetUserId={}",
                    event.orderId(),
                    event.status(),
                    event.targetUserId()
            );
            processedKafkaMessageService.markProcessed(metadata, event);
            return;
        }

        oneSignalService.sendWebPushNotification(event);
        processedEventService.markProcessed(event);
        processedKafkaMessageService.markProcessed(metadata, event);
    }
}

package com.swiftdrop.notification.service.impl;

import java.time.Duration;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.swiftdrop.notification.dto.OrderKafkaEvent;
import com.swiftdrop.notification.service.ProcessedEventService;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class RedisProcessedEventService implements ProcessedEventService {

    private final StringRedisTemplate redisTemplate;
    private final Duration ttl;

    public RedisProcessedEventService(
            StringRedisTemplate redisTemplate,
            @Value("${application.notification.processed-event-ttl-hours:24}") long ttlHours
    ) {
        this.redisTemplate = Objects.requireNonNull(redisTemplate, "redisTemplate must not be null");
        Duration processedEventTtl = Duration.ofHours(ttlHours);
        this.ttl = Objects.requireNonNull(processedEventTtl, "processed event ttl must not be null");
    }

    @Override
    public boolean isProcessed(OrderKafkaEvent event) {
        try {
            final String key = buildKey(event);
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (RuntimeException ex) {
            log.error("Processed event lookup failed. orderId={}, status={}", event.orderId(), event.status(), ex);
            throw ex;
        }
    }

    @Override
    public void markProcessed(OrderKafkaEvent event) {
        try {
            final String key = buildKey(event);
            redisTemplate.opsForValue().set(key, "processed", ttl);
        } catch (RuntimeException ex) {
            log.error("Processed event mark failed. orderId={}, status={}", event.orderId(), event.status(), ex);
            throw ex;
        }
    }

    private String buildKey(OrderKafkaEvent event) {
        OrderKafkaEvent notificationEvent = Objects.requireNonNull(event, "order event must not be null");
        final String key = "notification:processed:%s:%s:%s".formatted(
                notificationEvent.orderId(),
                notificationEvent.status(),
                notificationEvent.targetUserId()
        );
        return Objects.requireNonNull(key, "processed event key must not be null");
    }
}

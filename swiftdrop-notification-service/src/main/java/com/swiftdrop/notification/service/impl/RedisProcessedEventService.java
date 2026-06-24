package com.swiftdrop.notification.service.impl;

import java.time.Duration;
import java.util.Objects;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.swiftdrop.notification.config.properties.IdempotencyProperties;
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
            IdempotencyProperties idempotencyProperties
    ) {
        this.redisTemplate = Objects.requireNonNull(redisTemplate, "redisTemplate must not be null");
        final IdempotencyProperties properties = Objects.requireNonNull(
                idempotencyProperties,
                "idempotency properties must not be null"
        );
        this.ttl = Objects.requireNonNull(
                properties.processedEventTtl(),
                "processed event ttl must not be null"
        );
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
            final String processedValue = "processed";
            redisTemplate.opsForValue().set(key, processedValue, ttl);
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

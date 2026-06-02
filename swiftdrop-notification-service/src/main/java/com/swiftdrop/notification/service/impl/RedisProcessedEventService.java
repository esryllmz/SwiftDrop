package com.swiftdrop.notification.service.impl;

import java.time.Duration;

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
        this.redisTemplate = redisTemplate;
        this.ttl = Duration.ofHours(ttlHours);
    }

    @Override
    public boolean isProcessed(OrderKafkaEvent event) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(buildKey(event)));
        } catch (RuntimeException ex) {
            log.error("Processed event lookup failed. orderId={}, status={}", event.orderId(), event.status(), ex);
            throw ex;
        }
    }

    @Override
    public void markProcessed(OrderKafkaEvent event) {
        try {
            redisTemplate.opsForValue().set(buildKey(event), "processed", ttl);
        } catch (RuntimeException ex) {
            log.error("Processed event mark failed. orderId={}, status={}", event.orderId(), event.status(), ex);
            throw ex;
        }
    }

    private String buildKey(OrderKafkaEvent event) {
        return "notification:processed:%s:%s:%s".formatted(
                event.orderId(),
                event.status(),
                event.targetUserId()
        );
    }
}

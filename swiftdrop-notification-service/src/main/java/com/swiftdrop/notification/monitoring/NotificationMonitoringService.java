package com.swiftdrop.notification.monitoring;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.swiftdrop.notification.repository.ProcessedKafkaMessageRepository;

@Service
public class NotificationMonitoringService {

    private static final String ORDER_EVENTS_TOPIC = "order-events";

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final ProcessedKafkaMessageRepository processedKafkaMessageRepository;
    private final String kafkaBootstrapServers;
    private final String consumerGroupId;
    private final long timeoutMs;

    public NotificationMonitoringService(
            JdbcTemplate jdbcTemplate,
            StringRedisTemplate redisTemplate,
            ProcessedKafkaMessageRepository processedKafkaMessageRepository,
            @Value("${spring.kafka.bootstrap-servers}") String kafkaBootstrapServers,
            @Value("${spring.kafka.consumer.group-id}") String consumerGroupId,
            @Value("${application.monitoring.timeout-ms:1500}") long timeoutMs
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
        this.processedKafkaMessageRepository = processedKafkaMessageRepository;
        this.kafkaBootstrapServers = kafkaBootstrapServers;
        this.consumerGroupId = consumerGroupId;
        this.timeoutMs = timeoutMs;
    }

    public NotificationMonitoringResponse getMonitoring() {
        KafkaResult kafkaResult = checkKafkaAndLag();
        return new NotificationMonitoringResponse(
                checkDatabase(),
                checkRedis(),
                kafkaResult.component(),
                processedKafkaMessageRepository.count(),
                kafkaResult.consumerLag()
        );
    }

    private MonitoringComponent checkDatabase() {
        long startedAt = System.nanoTime();
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return new MonitoringComponent(
                    Integer.valueOf(1).equals(result) ? HealthStatus.UP : HealthStatus.DOWN,
                    elapsedMilliseconds(startedAt),
                    null
            );
        } catch (Exception ex) {
            return new MonitoringComponent(HealthStatus.DOWN, elapsedMilliseconds(startedAt), "Service is unavailable.");
        }
    }

    private MonitoringComponent checkRedis() {
        long startedAt = System.nanoTime();
        try {
            String response = redisTemplate.execute((RedisCallback<String>) connection -> connection.ping());
            return new MonitoringComponent(
                    "PONG".equalsIgnoreCase(response) ? HealthStatus.UP : HealthStatus.DOWN,
                    elapsedMilliseconds(startedAt),
                    null
            );
        } catch (Exception ex) {
            return new MonitoringComponent(HealthStatus.DOWN, elapsedMilliseconds(startedAt), "Service is unavailable.");
        }
    }

    private KafkaResult checkKafkaAndLag() {
        long startedAt = System.nanoTime();
        Map<String, Object> config = Map.of(
                AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaBootstrapServers,
                AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, String.valueOf(timeoutMs),
                AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, String.valueOf(timeoutMs)
        );
        try (AdminClient adminClient = AdminClient.create(config)) {
            var topicDescription = adminClient.describeTopics(java.util.List.of(ORDER_EVENTS_TOPIC))
                    .allTopicNames()
                    .get(timeoutMs, TimeUnit.MILLISECONDS)
                    .get(ORDER_EVENTS_TOPIC);

            Map<TopicPartition, OffsetSpec> latestOffsetSpecs = new HashMap<>();
            topicDescription.partitions().forEach(partition -> latestOffsetSpecs.put(
                    new TopicPartition(ORDER_EVENTS_TOPIC, partition.partition()),
                    OffsetSpec.latest()
            ));

            Map<TopicPartition, Long> latestOffsets = new HashMap<>();
            adminClient.listOffsets(latestOffsetSpecs)
                    .all()
                    .get(timeoutMs, TimeUnit.MILLISECONDS)
                    .forEach((partition, info) -> latestOffsets.put(partition, info.offset()));

            Map<TopicPartition, OffsetAndMetadata> committedOffsets = adminClient
                    .listConsumerGroupOffsets(consumerGroupId)
                    .partitionsToOffsetAndMetadata()
                    .get(timeoutMs, TimeUnit.MILLISECONDS);

            Long lag = calculateLag(latestOffsets, committedOffsets);
            return new KafkaResult(
                    new MonitoringComponent(HealthStatus.UP, elapsedMilliseconds(startedAt), null),
                    lag
            );
        } catch (Exception ex) {
            return new KafkaResult(
                    new MonitoringComponent(HealthStatus.DOWN, elapsedMilliseconds(startedAt), "Service is unavailable."),
                    null
            );
        }
    }

    private Long calculateLag(
            Map<TopicPartition, Long> latestOffsets,
            Map<TopicPartition, OffsetAndMetadata> committedOffsets
    ) {
        if (latestOffsets.isEmpty() || committedOffsets.isEmpty()) {
            return null;
        }

        long lag = 0;
        for (Map.Entry<TopicPartition, Long> entry : latestOffsets.entrySet()) {
            OffsetAndMetadata committed = committedOffsets.get(entry.getKey());
            if (committed == null) {
                return null;
            }
            lag += Math.max(0, entry.getValue() - committed.offset());
        }
        return lag;
    }

    private long elapsedMilliseconds(long startedAt) {
        return Math.max(0, Duration.ofNanos(System.nanoTime() - startedAt).toMillis());
    }

    private record KafkaResult(MonitoringComponent component, Long consumerLag) {
    }
}

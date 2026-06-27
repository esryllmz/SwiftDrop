package com.swiftdrop.logistics.monitoring;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.swiftdrop.logistics.entity.OutboxStatus;
import com.swiftdrop.logistics.repository.OutboxEventRepository;

@Service
public class LogisticsMonitoringService {

    private static final String ORDER_EVENTS_TOPIC = "order-events";

    private final JdbcTemplate jdbcTemplate;
    private final OutboxEventRepository outboxEventRepository;
    private final String kafkaBootstrapServers;
    private final long timeoutMs;

    public LogisticsMonitoringService(
            JdbcTemplate jdbcTemplate,
            OutboxEventRepository outboxEventRepository,
            @Value("${spring.kafka.bootstrap-servers}") String kafkaBootstrapServers,
            @Value("${application.monitoring.timeout-ms:1500}") long timeoutMs
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaBootstrapServers = kafkaBootstrapServers;
        this.timeoutMs = timeoutMs;
    }

    public LogisticsMonitoringResponse getMonitoring() {
        return new LogisticsMonitoringResponse(
                checkDatabase(),
                checkKafka(),
                getOutboxMetrics()
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

    private MonitoringComponent checkKafka() {
        long startedAt = System.nanoTime();
        Map<String, Object> config = Map.of(
                AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaBootstrapServers,
                AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, String.valueOf(timeoutMs),
                AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, String.valueOf(timeoutMs)
        );
        try (AdminClient adminClient = AdminClient.create(config)) {
            adminClient.describeTopics(java.util.List.of(ORDER_EVENTS_TOPIC))
                    .allTopicNames()
                    .get(timeoutMs, java.util.concurrent.TimeUnit.MILLISECONDS);
            return new MonitoringComponent(HealthStatus.UP, elapsedMilliseconds(startedAt), null);
        } catch (Exception ex) {
            return new MonitoringComponent(HealthStatus.DOWN, elapsedMilliseconds(startedAt), "Service is unavailable.");
        }
    }

    private OutboxMonitoringMetrics getOutboxMetrics() {
        long pendingCount = outboxEventRepository.countByStatus(OutboxStatus.PENDING);
        long failedCount = outboxEventRepository.countByStatus(OutboxStatus.FAILED);
        LocalDateTime oldestPending = outboxEventRepository.findOldestCreatedAtByStatus(OutboxStatus.PENDING).orElse(null);
        Long oldestAgeSeconds = oldestPending == null
                ? null
                : Math.max(0, Duration.between(oldestPending, LocalDateTime.now()).toSeconds());
        return new OutboxMonitoringMetrics(pendingCount, failedCount, oldestAgeSeconds);
    }

    private long elapsedMilliseconds(long startedAt) {
        return Math.max(0, Duration.ofNanos(System.nanoTime() - startedAt).toMillis());
    }
}

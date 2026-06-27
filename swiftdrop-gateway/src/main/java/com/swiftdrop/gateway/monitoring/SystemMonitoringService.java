package com.swiftdrop.gateway.monitoring;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.databind.JsonNode;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

@Service
public class SystemMonitoringService {

    private static final String INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key";

    private final WebClient webClient;
    private final MonitoringProperties properties;

    public SystemMonitoringService(WebClient.Builder webClientBuilder, MonitoringProperties properties) {
        this.webClient = webClientBuilder.build();
        this.properties = properties;
    }

    public Mono<SystemMonitoringResponse> getSystemMonitoring() {
        Mono<HealthComponentResponse> gateway = Mono.just(
                new HealthComponentResponse("gateway", "API Gateway", HealthStatus.UP, 0L, null)
        );
        Mono<HealthComponentResponse> auth = checkActuator("auth", "Auth Service", properties.authServiceUrl());
        Mono<HealthComponentResponse> logistics = checkActuator(
                "logistics",
                "Logistics Service",
                properties.logisticsServiceUrl()
        );
        Mono<HealthComponentResponse> notification = checkActuator(
                "notification",
                "Notification Service",
                properties.notificationServiceUrl()
        );
        Mono<InternalMonitoringResponse> logisticsInternal = checkInternal(properties.logisticsServiceUrl());
        Mono<InternalMonitoringResponse> notificationInternal = checkInternal(properties.notificationServiceUrl());

        return Mono.zip(gateway, auth, logistics, notification, logisticsInternal, notificationInternal)
                .map(tuple -> buildResponse(
                        tuple.getT1(),
                        tuple.getT2(),
                        tuple.getT3(),
                        tuple.getT4(),
                        tuple.getT5(),
                        tuple.getT6()
                ));
    }

    private SystemMonitoringResponse buildResponse(
            HealthComponentResponse gateway,
            HealthComponentResponse auth,
            HealthComponentResponse logistics,
            HealthComponentResponse notification,
            InternalMonitoringResponse logisticsInternal,
            InternalMonitoringResponse notificationInternal
    ) {
        List<HealthComponentResponse> services = List.of(gateway, auth, logistics, notification);
        List<HealthComponentResponse> infrastructure = List.of(
                component("postgresql", "PostgreSQL", logisticsInternal.database()),
                component("redis", "Redis", notificationInternal.redis()),
                component("kafka", "Kafka", worst(logisticsInternal.kafka(), notificationInternal.kafka()))
        );
        MonitoringMetricsResponse metrics = new MonitoringMetricsResponse(
                outboxValue(logisticsInternal.outbox(), "pending"),
                outboxValue(logisticsInternal.outbox(), "failed"),
                outboxValue(logisticsInternal.outbox(), "oldest"),
                notificationInternal.processedEventCount(),
                notificationInternal.consumerLag()
        );

        return new SystemMonitoringResponse(
                deriveOverallStatus(services, infrastructure, metrics),
                Instant.now(),
                services,
                infrastructure,
                metrics
        );
    }

    private Mono<HealthComponentResponse> checkActuator(String key, String name, String baseUrl) {
        long startedAt = System.nanoTime();
        return webClient.get()
                .uri(trimTrailingSlash(baseUrl) + "/actuator/health")
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(body -> new HealthComponentResponse(
                        key,
                        name,
                        normalizeStatus(body.path("status").asText()),
                        elapsedMilliseconds(startedAt),
                        null
                ))
                .timeout(Duration.ofMillis(properties.timeoutMs()))
                .onErrorReturn(new HealthComponentResponse(
                        key,
                        name,
                        HealthStatus.DOWN,
                        elapsedMilliseconds(startedAt),
                        "Service is unavailable."
                ));
    }

    private Mono<InternalMonitoringResponse> checkInternal(String baseUrl) {
        return webClient.get()
                .uri(trimTrailingSlash(baseUrl) + "/internal/monitoring")
                .header(INTERNAL_API_KEY_HEADER, properties.internalApiKey())
                .header(HttpHeaders.ACCEPT, "application/json")
                .retrieve()
                .bodyToMono(InternalMonitoringResponse.class)
                .timeout(Duration.ofMillis(properties.timeoutMs()))
                .onErrorReturn(emptyInternal());
    }

    private HealthComponentResponse component(String key, String name, InternalComponent component) {
        InternalComponent resolved = component == null
                ? new InternalComponent(HealthStatus.UNKNOWN, null, "Health data is not available.")
                : component;
        return new HealthComponentResponse(
                key,
                name,
                resolved.status() == null ? HealthStatus.UNKNOWN : resolved.status(),
                resolved.responseTimeMs(),
                resolved.details()
        );
    }

    private InternalComponent worst(InternalComponent first, InternalComponent second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return severity(second.status()) > severity(first.status()) ? second : first;
    }

    private HealthStatus deriveOverallStatus(
            List<HealthComponentResponse> services,
            List<HealthComponentResponse> infrastructure,
            MonitoringMetricsResponse metrics
    ) {
        List<HealthComponentResponse> critical = services.stream()
                .filter(component -> !Objects.equals(component.key(), "gateway"))
                .toList();
        critical = new java.util.ArrayList<>(critical);
        critical.addAll(infrastructure);

        if (critical.stream().anyMatch(component -> component.status() == HealthStatus.DOWN)) {
            return HealthStatus.DOWN;
        }
        if (critical.stream().anyMatch(component -> component.status() == HealthStatus.UNKNOWN)
                || exceeds(metrics.outboxPendingCount(), properties.outbox().pendingWarningThreshold())
                || exceeds(metrics.oldestPendingOutboxAgeSeconds(), properties.outbox().oldestAgeWarningSeconds())
                || exceeds(metrics.consumerLag(), properties.kafka().lagWarningThreshold())) {
            return HealthStatus.DEGRADED;
        }
        return HealthStatus.UP;
    }

    private boolean exceeds(Long value, long threshold) {
        return value != null && value > threshold;
    }

    private int severity(HealthStatus status) {
        if (status == HealthStatus.DOWN) {
            return 3;
        }
        if (status == HealthStatus.DEGRADED) {
            return 2;
        }
        if (status == HealthStatus.UNKNOWN) {
            return 1;
        }
        return 0;
    }

    private Long outboxValue(InternalMonitoringResponse.OutboxMetrics outbox, String field) {
        if (outbox == null) {
            return null;
        }
        return switch (field) {
            case "pending" -> outbox.pendingCount();
            case "failed" -> outbox.failedCount();
            case "oldest" -> outbox.oldestPendingAgeSeconds();
            default -> null;
        };
    }

    private HealthStatus normalizeStatus(String value) {
        if ("UP".equalsIgnoreCase(value)) {
            return HealthStatus.UP;
        }
        if ("DOWN".equalsIgnoreCase(value)) {
            return HealthStatus.DOWN;
        }
        if ("DEGRADED".equalsIgnoreCase(value)) {
            return HealthStatus.DEGRADED;
        }
        return HealthStatus.UNKNOWN;
    }

    private InternalMonitoringResponse emptyInternal() {
        InternalComponent unavailable = new InternalComponent(
                HealthStatus.UNKNOWN,
                null,
                "Health data is not available."
        );
        return new InternalMonitoringResponse(unavailable, unavailable, unavailable, null, null, null);
    }

    private long elapsedMilliseconds(long startedAt) {
        return Math.max(0, Duration.ofNanos(System.nanoTime() - startedAt).toMillis());
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}

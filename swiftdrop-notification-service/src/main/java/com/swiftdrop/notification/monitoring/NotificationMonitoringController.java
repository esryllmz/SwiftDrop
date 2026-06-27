package com.swiftdrop.notification.monitoring;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/monitoring")
public class NotificationMonitoringController {

    private static final String INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key";

    private final NotificationMonitoringService monitoringService;
    private final String internalApiKey;

    public NotificationMonitoringController(
            NotificationMonitoringService monitoringService,
            @Value("${application.internal.api-key}") String internalApiKey
    ) {
        this.monitoringService = Objects.requireNonNull(monitoringService, "monitoring service must not be null");
        this.internalApiKey = Objects.requireNonNull(internalApiKey, "internal api key must not be null");
    }

    @GetMapping
    public ResponseEntity<NotificationMonitoringResponse> getMonitoring(
            @RequestHeader(name = INTERNAL_API_KEY_HEADER, required = false) String providedApiKey
    ) {
        if (!StringUtils.hasText(providedApiKey) || !Objects.equals(internalApiKey, providedApiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(monitoringService.getMonitoring());
    }
}

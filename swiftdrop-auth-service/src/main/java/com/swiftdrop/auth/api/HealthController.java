package com.swiftdrop.auth.api;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/v1/health")
    public Map<String, Object> health() {
        return Map.of(
                "service", "swiftdrop-auth-service",
                "status", "UP",
                "timestamp", Instant.now()
        );
    }
}

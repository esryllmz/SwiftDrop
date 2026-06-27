package com.swiftdrop.gateway.monitoring;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/admin/system-monitoring")
public class MonitoringController {

    private final SystemMonitoringService monitoringService;

    public MonitoringController(SystemMonitoringService monitoringService) {
        this.monitoringService = monitoringService;
    }

    @GetMapping
    public Mono<SystemMonitoringResponse> getSystemMonitoring() {
        return monitoringService.getSystemMonitoring();
    }
}

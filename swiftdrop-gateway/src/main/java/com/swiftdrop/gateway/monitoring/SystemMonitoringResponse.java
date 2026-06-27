package com.swiftdrop.gateway.monitoring;

import java.time.Instant;
import java.util.List;

public record SystemMonitoringResponse(
        HealthStatus overallStatus,
        Instant checkedAt,
        List<HealthComponentResponse> services,
        List<HealthComponentResponse> infrastructure,
        MonitoringMetricsResponse metrics
) {
}

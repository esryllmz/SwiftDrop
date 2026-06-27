package com.swiftdrop.gateway.monitoring;

import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import reactor.core.publisher.Mono;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MonitoringAuthorizationTest {

    private static final String SECRET_KEY = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final String ADMIN_MONITORING_PATH = "/api/v1/admin/system-monitoring";

    @Autowired
    private WebTestClient webTestClient;

    @MockitoBean
    private SystemMonitoringService monitoringService;

    @BeforeEach
    void setUp() {
        reset(monitoringService);
        when(monitoringService.getSystemMonitoring()).thenReturn(Mono.just(response()));
    }

    @Test
    void noTokenReturnsUnauthorizedAndDoesNotCallMonitoringService() {
        webTestClient.get()
                .uri(ADMIN_MONITORING_PATH)
                .exchange()
                .expectStatus()
                .isUnauthorized();

        verifyNoInteractions(monitoringService);
    }

    @Test
    void invalidTokenReturnsUnauthorizedAndDoesNotCallMonitoringService() {
        webTestClient.get()
                .uri(ADMIN_MONITORING_PATH)
                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                .exchange()
                .expectStatus()
                .isUnauthorized();

        verifyNoInteractions(monitoringService);
    }

    @Test
    void customerTokenReturnsForbiddenAndDoesNotCallMonitoringService() {
        assertForbiddenWithoutServiceCall("CUSTOMER");
    }

    @Test
    void merchantTokenReturnsForbiddenAndDoesNotCallMonitoringService() {
        assertForbiddenWithoutServiceCall("MERCHANT");
    }

    @Test
    void courierTokenReturnsForbiddenAndDoesNotCallMonitoringService() {
        assertForbiddenWithoutServiceCall("DRIVER");
    }

    @Test
    void adminTokenReturnsOkAndCallsMonitoringService() {
        webTestClient.get()
                .uri(ADMIN_MONITORING_PATH)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor("ADMIN"))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.overallStatus")
                .isEqualTo("UP");

        verify(monitoringService).getSystemMonitoring();
    }

    private void assertForbiddenWithoutServiceCall(String role) {
        webTestClient.get()
                .uri(ADMIN_MONITORING_PATH)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(role))
                .exchange()
                .expectStatus()
                .isForbidden();

        verifyNoInteractions(monitoringService);
    }

    private SystemMonitoringResponse response() {
        return new SystemMonitoringResponse(
                HealthStatus.UP,
                Instant.parse("2026-06-27T10:00:00Z"),
                List.of(new HealthComponentResponse("gateway", "API Gateway", HealthStatus.UP, 1L, null)),
                List.of(),
                new MonitoringMetricsResponse(null, null, null, null, null)
        );
    }

    private String tokenFor(String role) {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET_KEY));
        return Jwts.builder()
                .subject("user@swiftdrop.test")
                .claim("userId", "00000000-0000-0000-0000-000000000001")
                .claim("role", role)
                .signWith(key)
                .compact();
    }
}

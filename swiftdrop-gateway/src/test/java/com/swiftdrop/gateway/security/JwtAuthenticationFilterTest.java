package com.swiftdrop.gateway.security;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilterChain;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import reactor.core.publisher.Mono;

class JwtAuthenticationFilterTest {

    private static final String SECRET_KEY = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final String ADMIN_MONITORING_PATH = "/api/v1/admin/system-monitoring";

    private JwtAuthenticationFilter filter;
    private WebFilterChain chain;

    @BeforeEach
    void setUp() {
        JwtValidator jwtValidator = new JwtValidator(SECRET_KEY);
        jwtValidator.initializeSigningKey();
        filter = new JwtAuthenticationFilter(jwtValidator);
        chain = mock(WebFilterChain.class);
        when(chain.filter(any(ServerWebExchange.class))).thenReturn(Mono.empty());
    }

    @Test
    void adminMonitoringRequiresToken() {
        ServerWebExchange exchange = exchange(ADMIN_MONITORING_PATH, null);

        filter.filter(exchange, chain).block();

        assertStatus(exchange, HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(any(ServerWebExchange.class));
    }

    @Test
    void adminMonitoringRejectsInvalidToken() {
        ServerWebExchange exchange = exchange(ADMIN_MONITORING_PATH, "not-a-jwt");

        filter.filter(exchange, chain).block();

        assertStatus(exchange, HttpStatus.UNAUTHORIZED);
        verify(chain, never()).filter(any(ServerWebExchange.class));
    }

    @Test
    void adminMonitoringRejectsCustomerToken() {
        ServerWebExchange exchange = exchange(ADMIN_MONITORING_PATH, tokenFor("CUSTOMER"));

        filter.filter(exchange, chain).block();

        assertStatus(exchange, HttpStatus.FORBIDDEN);
        verify(chain, never()).filter(any(ServerWebExchange.class));
    }

    @Test
    void adminMonitoringRejectsMerchantToken() {
        ServerWebExchange exchange = exchange(ADMIN_MONITORING_PATH, tokenFor("MERCHANT"));

        filter.filter(exchange, chain).block();

        assertStatus(exchange, HttpStatus.FORBIDDEN);
        verify(chain, never()).filter(any(ServerWebExchange.class));
    }

    @Test
    void adminMonitoringRejectsCourierToken() {
        ServerWebExchange exchange = exchange(ADMIN_MONITORING_PATH, tokenFor("DRIVER"));

        filter.filter(exchange, chain).block();

        assertStatus(exchange, HttpStatus.FORBIDDEN);
        verify(chain, never()).filter(any(ServerWebExchange.class));
    }

    @Test
    void adminMonitoringAllowsAdminToken() {
        ServerWebExchange exchange = exchange(ADMIN_MONITORING_PATH, tokenFor("ADMIN"));

        filter.filter(exchange, chain).block();

        verify(chain).filter(any(ServerWebExchange.class));
    }

    @Test
    void adminMonitoringAllowsRolePrefixedAdminToken() {
        ServerWebExchange exchange = exchange(ADMIN_MONITORING_PATH, tokenFor("ROLE_ADMIN"));

        filter.filter(exchange, chain).block();

        verify(chain).filter(any(ServerWebExchange.class));
    }

    @Test
    void apiHealthRemainsPublic() {
        ServerWebExchange exchange = exchange("/api/health", null);

        filter.filter(exchange, chain).block();

        verify(chain).filter(exchange);
    }

    private ServerWebExchange exchange(String path, String token) {
        MockServerHttpRequest.BaseBuilder<?> request = MockServerHttpRequest.get(path);
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return MockServerWebExchange.from(request);
    }

    private String tokenFor(String role) {
        Instant now = Instant.now();
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET_KEY));
        return Jwts.builder()
                .subject("user@swiftdrop.test")
                .claim("userId", "00000000-0000-0000-0000-000000000001")
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(300)))
                .signWith(key)
                .compact();
    }

    private void assertStatus(ServerWebExchange exchange, HttpStatus expectedStatus) {
        org.assertj.core.api.Assertions.assertThat(exchange.getResponse().getStatusCode()).isEqualTo(expectedStatus);
    }
}

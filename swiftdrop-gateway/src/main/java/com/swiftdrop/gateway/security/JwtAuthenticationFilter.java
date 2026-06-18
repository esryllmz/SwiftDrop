package com.swiftdrop.gateway.security;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import reactor.core.publisher.Mono;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AUTHENTICATED_USER_HEADER = "X-Authenticated-User";
    private static final String USER_EMAIL_HEADER = "X-User-Email";
    private static final String USER_ROLE_HEADER = "X-User-Role";
    private static final String ADMIN_ROLE = "ADMIN";

    private static final String[] ADMIN_ONLY_PATH_PREFIXES = {
            "/api/v1/dashboard",
            "/api/v1/orders",
            "/api/v1/drivers",
            "/api/v1/merchants",
            "/api/v1/admin/applications",
            "/api/v1/outbox-events"
    };

    private final JwtValidator jwtValidator;

    public JwtAuthenticationFilter(JwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (isPublicRequest(request.getMethod(), path)) {
            return chain.filter(exchange);
        }

        String authorization = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            return unauthorized(exchange, path);
        }

        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        if (token.isBlank()) {
            return unauthorized(exchange, path);
        }

        try {
            JwtClaims claims = jwtValidator.validate(token);
            if (isAdminOnlyPath(path) && !hasAdminRole(claims.role())) {
                return forbidden(exchange, path);
            }

            ServerHttpRequest.Builder requestBuilder = request.mutate()
                    .headers(headers -> {
                        headers.remove(AUTHENTICATED_USER_HEADER);
                        headers.remove(USER_EMAIL_HEADER);
                        headers.remove(USER_ROLE_HEADER);
                    })
                    .header(AUTHENTICATED_USER_HEADER, claims.email())
                    .header(USER_EMAIL_HEADER, claims.email());

            if (claims.role() != null && !claims.role().isBlank()) {
                requestBuilder.header(USER_ROLE_HEADER, claims.role());
            }

            return chain.filter(exchange.mutate().request(requestBuilder.build()).build());
        } catch (InvalidAccessTokenException ex) {
            return unauthorized(exchange, path);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private boolean isPublicRequest(HttpMethod method, String path) {
        if (HttpMethod.OPTIONS.equals(method)) {
            return true;
        }

        return isAuthEndpoint(method, path, "/api/v1/auth/register", HttpMethod.POST)
                || isAuthEndpoint(method, path, "/api/v1/auth/login", HttpMethod.POST)
                || isAuthEndpoint(method, path, "/api/v1/auth/refresh", HttpMethod.POST)
                || isAuthEndpoint(method, path, "/api/v1/auth/logout", HttpMethod.POST)
                || isPublicApplicationEndpoint(method, path)
                || isEndpoint(method, path, "/actuator/health", HttpMethod.GET)
                || isEndpoint(method, path, "/actuator/info", HttpMethod.GET)
                || isEndpoint(method, path, "/api/v1/health", HttpMethod.GET);
    }

    private boolean isAuthEndpoint(HttpMethod method, String path, String expectedPath, HttpMethod expectedMethod) {
        return isEndpoint(method, path, expectedPath, expectedMethod);
    }

    private boolean isEndpoint(HttpMethod method, String path, String expectedPath, HttpMethod expectedMethod) {
        return expectedMethod.equals(method) && expectedPath.equals(path);
    }

    private boolean isPublicApplicationEndpoint(HttpMethod method, String path) {
        return HttpMethod.POST.equals(method)
                && ("/api/v1/applications/merchant".equals(path) || "/api/v1/applications/courier".equals(path));
    }

    private boolean isAdminOnlyPath(String path) {
        for (String prefix : ADMIN_ONLY_PATH_PREFIXES) {
            if (path.equals(prefix) || path.startsWith(prefix + "/")) {
                return true;
            }
        }

        return false;
    }

    private boolean hasAdminRole(String role) {
        if (role == null || role.isBlank()) {
            return false;
        }

        String normalizedRole = role.startsWith("ROLE_") ? role.substring("ROLE_".length()) : role;
        return ADMIN_ROLE.equals(normalizedRole);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String path) {
        return writeErrorResponse(
                exchange,
                path,
                HttpStatus.UNAUTHORIZED,
                "Unauthorized",
                "Missing or invalid access token"
        );
    }

    private Mono<Void> forbidden(ServerWebExchange exchange, String path) {
        return writeErrorResponse(
                exchange,
                path,
                HttpStatus.FORBIDDEN,
                "Forbidden",
                "Admin role is required"
        );
    }

    private Mono<Void> writeErrorResponse(
            ServerWebExchange exchange,
            String path,
            HttpStatus status,
            String error,
            String message
    ) {
        var response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = """
                {"timestamp":"%s","status":%d,"error":"%s","message":"%s","path":"%s"}\
                """.formatted(LocalDateTime.now(), status.value(), error, message, path);

        final byte[] responseBytes = body.getBytes(StandardCharsets.UTF_8);
        final DataBuffer responseBuffer = response.bufferFactory().wrap(responseBytes);
        final Mono<DataBuffer> responseBody = Mono.just(responseBuffer);
        return response.writeWith(responseBody);
    }
}

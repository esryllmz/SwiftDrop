package com.swiftdrop.gateway.security;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import org.reactivestreams.Publisher;
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
    private static final String CUSTOMER_ROLE = "CUSTOMER";
    private static final String MERCHANT_ROLE = "MERCHANT";
    private static final String DRIVER_ROLE = "DRIVER";

    private static final RouteAuthorizationRule[] ADMIN_ROUTE_RULES = {
            new RouteAuthorizationRule("/api/v1/dashboard", ADMIN_ROLE),
            new RouteAuthorizationRule("/api/v1/orders", ADMIN_ROLE),
            new RouteAuthorizationRule("/api/v1/drivers", ADMIN_ROLE),
            new RouteAuthorizationRule("/api/v1/merchants", ADMIN_ROLE),
            new RouteAuthorizationRule("/api/v1/admin/applications", ADMIN_ROLE),
            new RouteAuthorizationRule("/api/v1/outbox-events", ADMIN_ROLE)
    };

    private static final RouteAuthorizationRule[] SCOPED_PORTAL_ROUTE_RULES = {
            new RouteAuthorizationRule("/api/v1/customer", CUSTOMER_ROLE),
            new RouteAuthorizationRule("/api/v1/merchant", MERCHANT_ROLE),
            new RouteAuthorizationRule("/api/v1/courier", DRIVER_ROLE)
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
            RouteAuthorizationRule authorizationRule = findAuthorizationRule(path);
            if (authorizationRule != null && !hasRequiredRole(claims.role(), authorizationRule.requiredRole())) {
                return forbidden(exchange, path, authorizationRule.requiredRole());
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

    private RouteAuthorizationRule findAuthorizationRule(String path) {
        RouteAuthorizationRule adminRule = findMatchingRule(path, ADMIN_ROUTE_RULES);
        if (adminRule != null) {
            return adminRule;
        }

        return findMatchingRule(path, SCOPED_PORTAL_ROUTE_RULES);
    }

    private RouteAuthorizationRule findMatchingRule(String path, RouteAuthorizationRule[] rules) {
        for (RouteAuthorizationRule rule : rules) {
            if (rule.matches(path)) {
                return rule;
            }
        }

        return null;
    }

    private boolean hasRequiredRole(String actualRole, String requiredRole) {
        return requiredRole.equals(normalizeRole(actualRole));
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "";
        }

        return role.startsWith("ROLE_") ? role.substring("ROLE_".length()) : role;
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

    private Mono<Void> forbidden(ServerWebExchange exchange, String path, String requiredRole) {
        return writeErrorResponse(
                exchange,
                path,
                HttpStatus.FORBIDDEN,
                "Forbidden",
                requiredRole + " role is required"
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
        final Publisher<? extends DataBuffer> responseBody = Mono.just(responseBuffer);
        return response.writeWith(responseBody);
    }

    private record RouteAuthorizationRule(String pathPrefix, String requiredRole) {

        private boolean matches(String path) {
            return path.equals(pathPrefix) || path.startsWith(pathPrefix + "/");
        }
    }
}

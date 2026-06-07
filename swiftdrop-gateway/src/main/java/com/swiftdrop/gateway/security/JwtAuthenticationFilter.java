package com.swiftdrop.gateway.security;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

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

    private Mono<Void> unauthorized(ServerWebExchange exchange, String path) {
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = """
                {"timestamp":"%s","status":401,"error":"Unauthorized","message":"Missing or invalid access token","path":"%s"}\
                """.formatted(LocalDateTime.now(), path);

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
    }
}

package com.swiftdrop.logistics.controller;

import java.util.Map;
import java.util.Objects;

import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.DriverLocationUpdateRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/drivers")
@RequiredArgsConstructor
public class DriverLocationController {

    private static final String DRIVER_GEO_KEY = "drivers:locations";

    private final StringRedisTemplate redisTemplate;

    @PostMapping("/location")
    public ResponseEntity<Map<String, String>> updateLocation(
            @Valid @RequestBody DriverLocationUpdateRequest request
    ) {
        var geoOperations = Objects.requireNonNull(redisTemplate.opsForGeo(), "Redis Geo operations must not be null");
        geoOperations.add(
                DRIVER_GEO_KEY,
                new Point(request.longitude(), request.latitude()),
                request.driverId().toString()
        );

        return ResponseEntity.ok(Map.of("message", "Driver location updated in Redis."));
    }
}

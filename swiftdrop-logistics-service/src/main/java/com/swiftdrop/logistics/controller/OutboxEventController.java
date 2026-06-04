package com.swiftdrop.logistics.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.OutboxEventResponse;
import com.swiftdrop.logistics.entity.OutboxStatus;
import com.swiftdrop.logistics.service.OutboxQueryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/outbox-events")
@RequiredArgsConstructor
public class OutboxEventController {

    private final OutboxQueryService outboxQueryService;

    @GetMapping
    public ResponseEntity<List<OutboxEventResponse>> findEvents(
            @RequestParam(required = false) OutboxStatus status,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(outboxQueryService.findEvents(status, limit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OutboxEventResponse> findEvent(@PathVariable UUID id) {
        return ResponseEntity.ok(outboxQueryService.findEvent(id));
    }
}

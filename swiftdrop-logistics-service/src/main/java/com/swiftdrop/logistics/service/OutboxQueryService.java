package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.OutboxEventResponse;
import com.swiftdrop.logistics.entity.OutboxEvent;
import com.swiftdrop.logistics.entity.OutboxStatus;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.OutboxEventRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OutboxQueryService {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 100;

    private final OutboxEventRepository outboxEventRepository;

    @Transactional(readOnly = true)
    public List<OutboxEventResponse> findEvents(OutboxStatus status, Integer limit) {
        Pageable pageable = PageRequest.of(0, normalizeLimit(limit));
        List<OutboxEvent> events = status == null
                ? outboxEventRepository.findAllByOrderByCreatedAtDesc(pageable)
                : outboxEventRepository.findByStatusOrderByCreatedAtDesc(status, pageable);

        return Objects.requireNonNull(events, "outbox events must not be null").stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OutboxEventResponse findEvent(UUID id) {
        final UUID eventId = Objects.requireNonNull(id, "outbox event id must not be null");
        OutboxEvent event = outboxEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Outbox event was not found."));

        return toResponse(event);
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        if (limit < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private OutboxEventResponse toResponse(OutboxEvent event) {
        return new OutboxEventResponse(
                event.getId(),
                event.getAggregateType(),
                event.getAggregateId(),
                event.getEventType(),
                event.getTopic(),
                event.getEventKey(),
                event.getPayload(),
                event.getStatus(),
                event.getRetryCount(),
                event.getLastError(),
                event.getCreatedAt(),
                event.getSentAt(),
                event.getCorrelationId(),
                event.getVersion()
        );
    }
}

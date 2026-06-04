package com.swiftdrop.logistics.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.swiftdrop.logistics.entity.OutboxEvent;
import com.swiftdrop.logistics.entity.OutboxStatus;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    List<OutboxEvent> findTop50ByStatusOrderByCreatedAtAsc(OutboxStatus status);

    long countByStatus(OutboxStatus status);

    List<OutboxEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<OutboxEvent> findByStatusOrderByCreatedAtDesc(OutboxStatus status, Pageable pageable);
}

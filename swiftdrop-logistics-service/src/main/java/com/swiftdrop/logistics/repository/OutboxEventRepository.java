package com.swiftdrop.logistics.repository;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swiftdrop.logistics.entity.OutboxEvent;
import com.swiftdrop.logistics.entity.OutboxStatus;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query(
            value = """
                    SELECT *
                    FROM outbox_events
                    WHERE status = 'PENDING'
                    ORDER BY created_at ASC
                    LIMIT :limit
                    FOR UPDATE SKIP LOCKED
                    """,
            nativeQuery = true
    )
    List<OutboxEvent> findPendingForPublishForUpdateSkipLocked(@Param("limit") int limit);

    long countByStatus(OutboxStatus status);

    @Query("select min(event.createdAt) from OutboxEvent event where event.status = :status")
    Optional<LocalDateTime> findOldestCreatedAtByStatus(@Param("status") OutboxStatus status);

    List<OutboxEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<OutboxEvent> findByStatusOrderByCreatedAtDesc(OutboxStatus status, Pageable pageable);
}

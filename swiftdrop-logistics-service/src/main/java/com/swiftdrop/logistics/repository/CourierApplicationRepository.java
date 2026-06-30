package com.swiftdrop.logistics.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.CourierApplication;

public interface CourierApplicationRepository extends JpaRepository<CourierApplication, UUID> {

    List<CourierApplication> findAllByOrderByCreatedAtDesc();

    List<CourierApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status);

    Optional<CourierApplication> findByProvisionedUserId(UUID provisionedUserId);

    boolean existsByContactEmailAndStatusIn(String contactEmail, List<ApplicationStatus> statuses);

    boolean existsByContactEmailAndStatusInAndIdNot(
            String contactEmail,
            List<ApplicationStatus> statuses,
            UUID id
    );
}

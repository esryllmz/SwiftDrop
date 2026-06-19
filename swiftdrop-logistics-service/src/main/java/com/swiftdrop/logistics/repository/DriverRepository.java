package com.swiftdrop.logistics.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
    List<Driver> findByStatus(DriverStatus status);

    long countByStatus(DriverStatus status);

    Optional<Driver> findByUserId(UUID userId);
}

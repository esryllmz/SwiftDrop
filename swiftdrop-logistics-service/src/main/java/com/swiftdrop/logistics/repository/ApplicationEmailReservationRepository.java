package com.swiftdrop.logistics.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swiftdrop.logistics.entity.ApplicationEmailReservation;

public interface ApplicationEmailReservationRepository
        extends JpaRepository<ApplicationEmailReservation, String> {
}

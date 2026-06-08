package com.swiftdrop.logistics.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.MerchantApplication;

public interface MerchantApplicationRepository extends JpaRepository<MerchantApplication, UUID> {

    List<MerchantApplication> findAllByOrderByCreatedAtDesc();

    List<MerchantApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status);

    boolean existsByContactEmailAndStatus(String contactEmail, ApplicationStatus status);
}

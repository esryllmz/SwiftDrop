package com.swiftdrop.logistics.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swiftdrop.logistics.entity.CustomerAddress;

public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, UUID> {

    List<CustomerAddress> findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(UUID customerId);

    Optional<CustomerAddress> findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(UUID customerId);

    Optional<CustomerAddress> findByIdAndCustomerId(UUID id, UUID customerId);
}

package com.swiftdrop.logistics.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.swiftdrop.logistics.entity.Merchant;

public interface MerchantRepository extends JpaRepository<Merchant, UUID> {
    Optional<Merchant> findByUserId(UUID userId);

    @Query("""
            select m.id as id, m.name as name
            from Merchant m
            where m.acceptingOrders = true
            order by m.name asc
            """)
    List<CustomerMerchantOptionView> findCustomerMerchantOptions();

    interface CustomerMerchantOptionView {
        UUID getId();

        String getName();
    }
}

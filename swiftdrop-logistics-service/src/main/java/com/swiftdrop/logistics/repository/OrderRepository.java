package com.swiftdrop.logistics.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swiftdrop.logistics.entity.Order;
import com.swiftdrop.logistics.entity.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    long countByStatus(OrderStatus status);

    @Query("""
            select o from Order o
            left join fetch o.merchant
            left join fetch o.driver
            where (:status is null or o.status = :status)
              and (:merchantId is null or o.merchant.id = :merchantId)
              and (:driverId is null or o.driver.id = :driverId)
            order by o.createdAt desc
            """)
    List<Order> findAllForDashboard(
            @Param("status") OrderStatus status,
            @Param("merchantId") UUID merchantId,
            @Param("driverId") UUID driverId
    );

    @Query("""
            select o from Order o
            left join fetch o.merchant
            left join fetch o.driver
            where o.id = :id
            """)
    Optional<Order> findByIdForDashboard(@Param("id") UUID id);

    @Query("""
            select o from Order o
            left join fetch o.merchant
            left join fetch o.driver
            where o.customerId = :customerId
            order by o.createdAt desc
            """)
    List<Order> findByCustomerIdOrderByCreatedAtDesc(@Param("customerId") UUID customerId);

    @Query("""
            select o from Order o
            left join fetch o.merchant
            left join fetch o.driver
            where o.merchant.id = :merchantId
            order by o.createdAt desc
            """)
    List<Order> findByMerchantIdOrderByCreatedAtDesc(@Param("merchantId") UUID merchantId);

    @Query("""
            select o from Order o
            left join fetch o.merchant
            left join fetch o.driver
            where o.driver.id = :driverId
            order by o.createdAt desc
            """)
    List<Order> findByDriverIdOrderByCreatedAtDesc(@Param("driverId") UUID driverId);

    long countByCustomerId(UUID customerId);

    long countByCustomerIdAndStatus(UUID customerId, OrderStatus status);

    long countByMerchant_Id(UUID merchantId);

    long countByMerchant_IdAndStatus(UUID merchantId, OrderStatus status);

    long countByDriver_Id(UUID driverId);

    long countByDriver_IdAndStatus(UUID driverId, OrderStatus status);

    long countByDriver_IdAndStatusNot(UUID driverId, OrderStatus status);

    long countByDriver_IdAndStatusIn(UUID driverId, Collection<OrderStatus> statuses);
}

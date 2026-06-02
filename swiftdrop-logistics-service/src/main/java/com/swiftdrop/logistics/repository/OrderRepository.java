package com.swiftdrop.logistics.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swiftdrop.logistics.entity.Order;

public interface OrderRepository extends JpaRepository<Order, UUID> {
}

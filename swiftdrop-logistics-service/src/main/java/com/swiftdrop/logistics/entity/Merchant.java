package com.swiftdrop.logistics.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "merchants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Merchant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(length = 30)
    private String phone;

    @Column(name = "address_line", length = 250)
    private String addressLine;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String city;

    @Column(length = 500)
    private String description;

    @Column(name = "accepting_orders", nullable = false, columnDefinition = "boolean not null default false")
    private boolean acceptingOrders;

    @Column(name = "average_preparation_minutes")
    private Integer averagePreparationMinutes;
}

package com.swiftdrop.logistics.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.DriverResponse;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.OrderRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverService {

    private static final List<OrderStatus> ACTIVE_COURIER_STATUSES = List.of(
            OrderStatus.DRIVER_ASSIGNED,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.PICKED_UP,
            OrderStatus.ON_THE_WAY
    );

    private final DriverRepository driverRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public List<DriverResponse> findDrivers(DriverStatus status) {
        List<Driver> drivers = status == null
                ? driverRepository.findAll()
                : driverRepository.findByStatus(status);

        return drivers.stream()
                .map(this::toResponse)
                .toList();
    }

    private DriverResponse toResponse(Driver driver) {
        long activeAssignmentCount = orderRepository.countByDriver_IdAndStatusIn(driver.getId(), ACTIVE_COURIER_STATUSES);
        return new DriverResponse(
                driver.getId(),
                driver.getUserId(),
                driver.getFullName(),
                driver.getEmail(),
                driver.getStatus(),
                driver.getServiceZone(),
                activeAssignmentCount
        );
    }
}

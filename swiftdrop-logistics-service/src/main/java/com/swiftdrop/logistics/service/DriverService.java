package com.swiftdrop.logistics.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.DriverResponse;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.repository.DriverRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;

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
        return new DriverResponse(
                driver.getId(),
                driver.getUserId(),
                driver.getFullName(),
                driver.getStatus()
        );
    }
}

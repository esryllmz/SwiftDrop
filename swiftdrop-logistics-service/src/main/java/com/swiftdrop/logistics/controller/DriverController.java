package com.swiftdrop.logistics.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.DriverResponse;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.service.DriverService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @GetMapping
    public ResponseEntity<List<DriverResponse>> findDrivers(
            @RequestParam(required = false) DriverStatus status
    ) {
        return ResponseEntity.ok(driverService.findDrivers(status));
    }
}

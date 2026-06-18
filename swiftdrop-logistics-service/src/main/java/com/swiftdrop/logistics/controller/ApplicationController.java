package com.swiftdrop.logistics.controller;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.CourierApplicationRequest;
import com.swiftdrop.logistics.dto.CourierApplicationResponse;
import com.swiftdrop.logistics.dto.MerchantApplicationRequest;
import com.swiftdrop.logistics.dto.MerchantApplicationResponse;
import com.swiftdrop.logistics.service.ApplicationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping("/merchant")
    public ResponseEntity<MerchantApplicationResponse> createMerchantApplication(
            @Valid @RequestBody MerchantApplicationRequest request
    ) {
        MerchantApplicationResponse response = applicationService.createMerchantApplication(request);
        final URI location = URI.create("/api/v1/applications/merchant/" + response.id());
        return ResponseEntity.created(location)
                .body(response);
    }

    @PostMapping("/courier")
    public ResponseEntity<CourierApplicationResponse> createCourierApplication(
            @Valid @RequestBody CourierApplicationRequest request
    ) {
        CourierApplicationResponse response = applicationService.createCourierApplication(request);
        final URI location = URI.create("/api/v1/applications/courier/" + response.id());
        return ResponseEntity.created(location)
                .body(response);
    }
}

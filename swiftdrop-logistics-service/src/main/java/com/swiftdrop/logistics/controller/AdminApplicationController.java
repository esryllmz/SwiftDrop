package com.swiftdrop.logistics.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.ApplicationReviewRequest;
import com.swiftdrop.logistics.dto.CourierApplicationReviewResponse;
import com.swiftdrop.logistics.dto.CourierApplicationResponse;
import com.swiftdrop.logistics.dto.MerchantApplicationReviewResponse;
import com.swiftdrop.logistics.dto.MerchantApplicationResponse;
import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.service.ApplicationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/applications")
@RequiredArgsConstructor
public class AdminApplicationController {

    private final ApplicationService applicationService;

    @GetMapping("/merchants")
    public ResponseEntity<List<MerchantApplicationResponse>> findMerchantApplications(
            @RequestParam(required = false) ApplicationStatus status
    ) {
        return ResponseEntity.ok(applicationService.findMerchantApplications(status));
    }

    @GetMapping("/couriers")
    public ResponseEntity<List<CourierApplicationResponse>> findCourierApplications(
            @RequestParam(required = false) ApplicationStatus status
    ) {
        return ResponseEntity.ok(applicationService.findCourierApplications(status));
    }

    @PostMapping("/merchants/{id}/approve")
    public ResponseEntity<MerchantApplicationReviewResponse> approveMerchantApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationReviewRequest request
    ) {
        return ResponseEntity.ok(applicationService.approveMerchantApplication(id, request));
    }

    @PostMapping("/merchants/{id}/reject")
    public ResponseEntity<MerchantApplicationResponse> rejectMerchantApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationReviewRequest request
    ) {
        return ResponseEntity.ok(applicationService.rejectMerchantApplication(id, request));
    }

    @PostMapping("/couriers/{id}/approve")
    public ResponseEntity<CourierApplicationReviewResponse> approveCourierApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationReviewRequest request
    ) {
        return ResponseEntity.ok(applicationService.approveCourierApplication(id, request));
    }

    @PostMapping("/couriers/{id}/reject")
    public ResponseEntity<CourierApplicationResponse> rejectCourierApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationReviewRequest request
    ) {
        return ResponseEntity.ok(applicationService.rejectCourierApplication(id, request));
    }
}

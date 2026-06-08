package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.ApplicationReviewRequest;
import com.swiftdrop.logistics.dto.CourierApplicationRequest;
import com.swiftdrop.logistics.dto.CourierApplicationResponse;
import com.swiftdrop.logistics.dto.MerchantApplicationRequest;
import com.swiftdrop.logistics.dto.MerchantApplicationResponse;
import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.CourierApplication;
import com.swiftdrop.logistics.entity.MerchantApplication;
import com.swiftdrop.logistics.exception.ApplicationAlreadyReviewedException;
import com.swiftdrop.logistics.exception.DuplicateApplicationException;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.CourierApplicationRepository;
import com.swiftdrop.logistics.repository.MerchantApplicationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final MerchantApplicationRepository merchantApplicationRepository;
    private final CourierApplicationRepository courierApplicationRepository;

    @Transactional
    public MerchantApplicationResponse createMerchantApplication(MerchantApplicationRequest request) {
        String contactEmail = normalizeEmail(request.contactEmail());
        validateNoDuplicateMerchantApplication(contactEmail);

        MerchantApplication application = MerchantApplication.builder()
                .businessName(request.businessName().trim())
                .contactEmail(contactEmail)
                .message(trimToNull(request.message()))
                .status(ApplicationStatus.PENDING)
                .build();

        MerchantApplication savedApplication = Objects.requireNonNull(
                merchantApplicationRepository.save(application),
                "saved merchant application must not be null"
        );
        return toMerchantResponse(savedApplication);
    }

    @Transactional
    public CourierApplicationResponse createCourierApplication(CourierApplicationRequest request) {
        String contactEmail = normalizeEmail(request.contactEmail());
        validateNoDuplicateCourierApplication(contactEmail);

        CourierApplication application = CourierApplication.builder()
                .fullName(request.fullName().trim())
                .contactEmail(contactEmail)
                .vehicleType(request.vehicleType())
                .message(trimToNull(request.message()))
                .status(ApplicationStatus.PENDING)
                .build();

        CourierApplication savedApplication = Objects.requireNonNull(
                courierApplicationRepository.save(application),
                "saved courier application must not be null"
        );
        return toCourierResponse(savedApplication);
    }

    @Transactional(readOnly = true)
    public List<MerchantApplicationResponse> findMerchantApplications(ApplicationStatus status) {
        List<MerchantApplication> applications = status == null
                ? merchantApplicationRepository.findAllByOrderByCreatedAtDesc()
                : merchantApplicationRepository.findByStatusOrderByCreatedAtDesc(status);

        return applications.stream()
                .map(this::toMerchantResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourierApplicationResponse> findCourierApplications(ApplicationStatus status) {
        List<CourierApplication> applications = status == null
                ? courierApplicationRepository.findAllByOrderByCreatedAtDesc()
                : courierApplicationRepository.findByStatusOrderByCreatedAtDesc(status);

        return applications.stream()
                .map(this::toCourierResponse)
                .toList();
    }

    @Transactional
    public MerchantApplicationResponse approveMerchantApplication(UUID id, ApplicationReviewRequest request) {
        return reviewMerchantApplication(id, ApplicationStatus.APPROVED, request);
    }

    @Transactional
    public MerchantApplicationResponse rejectMerchantApplication(UUID id, ApplicationReviewRequest request) {
        return reviewMerchantApplication(id, ApplicationStatus.REJECTED, request);
    }

    @Transactional
    public CourierApplicationResponse approveCourierApplication(UUID id, ApplicationReviewRequest request) {
        return reviewCourierApplication(id, ApplicationStatus.APPROVED, request);
    }

    @Transactional
    public CourierApplicationResponse rejectCourierApplication(UUID id, ApplicationReviewRequest request) {
        return reviewCourierApplication(id, ApplicationStatus.REJECTED, request);
    }

    private MerchantApplicationResponse reviewMerchantApplication(
            UUID id,
            ApplicationStatus status,
            ApplicationReviewRequest request
    ) {
        MerchantApplication application = merchantApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant application not found."));
        ensurePending(application.getStatus());

        application.setStatus(status);
        application.setReviewedAt(java.time.LocalDateTime.now());
        application.setReviewNote(trimToNull(request.reviewNote()));

        MerchantApplication savedApplication = Objects.requireNonNull(
                merchantApplicationRepository.save(application),
                "reviewed merchant application must not be null"
        );
        return toMerchantResponse(savedApplication);
    }

    private CourierApplicationResponse reviewCourierApplication(
            UUID id,
            ApplicationStatus status,
            ApplicationReviewRequest request
    ) {
        CourierApplication application = courierApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Courier application not found."));
        ensurePending(application.getStatus());

        application.setStatus(status);
        application.setReviewedAt(java.time.LocalDateTime.now());
        application.setReviewNote(trimToNull(request.reviewNote()));

        CourierApplication savedApplication = Objects.requireNonNull(
                courierApplicationRepository.save(application),
                "reviewed courier application must not be null"
        );
        return toCourierResponse(savedApplication);
    }

    private void validateNoDuplicateMerchantApplication(String contactEmail) {
        if (merchantApplicationRepository.existsByContactEmailAndStatus(contactEmail, ApplicationStatus.PENDING)) {
            throw new DuplicateApplicationException("A pending merchant application already exists for this email.");
        }
        if (merchantApplicationRepository.existsByContactEmailAndStatus(contactEmail, ApplicationStatus.APPROVED)) {
            throw new DuplicateApplicationException("An approved merchant application already exists for this email.");
        }
    }

    private void validateNoDuplicateCourierApplication(String contactEmail) {
        if (courierApplicationRepository.existsByContactEmailAndStatus(contactEmail, ApplicationStatus.PENDING)) {
            throw new DuplicateApplicationException("A pending courier application already exists for this email.");
        }
        if (courierApplicationRepository.existsByContactEmailAndStatus(contactEmail, ApplicationStatus.APPROVED)) {
            throw new DuplicateApplicationException("An approved courier application already exists for this email.");
        }
    }

    private void ensurePending(ApplicationStatus status) {
        if (status != ApplicationStatus.PENDING) {
            throw new ApplicationAlreadyReviewedException("Application has already been reviewed.");
        }
    }

    private MerchantApplicationResponse toMerchantResponse(MerchantApplication application) {
        return new MerchantApplicationResponse(
                application.getId(),
                application.getBusinessName(),
                application.getContactEmail(),
                application.getMessage(),
                application.getStatus(),
                application.getCreatedAt(),
                application.getReviewedAt(),
                application.getReviewNote()
        );
    }

    private CourierApplicationResponse toCourierResponse(CourierApplication application) {
        return new CourierApplicationResponse(
                application.getId(),
                application.getFullName(),
                application.getContactEmail(),
                application.getVehicleType(),
                application.getMessage(),
                application.getStatus(),
                application.getCreatedAt(),
                application.getReviewedAt(),
                application.getReviewNote()
        );
    }

    private String normalizeEmail(String email) {
        return Objects.requireNonNull(email, "contact email must not be null").trim().toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

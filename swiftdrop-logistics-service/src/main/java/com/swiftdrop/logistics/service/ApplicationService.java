package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.ApplicationReviewRequest;
import com.swiftdrop.logistics.dto.CourierApplicationReviewResponse;
import com.swiftdrop.logistics.dto.CourierApplicationRequest;
import com.swiftdrop.logistics.dto.CourierApplicationResponse;
import com.swiftdrop.logistics.dto.MerchantApplicationReviewResponse;
import com.swiftdrop.logistics.dto.MerchantApplicationRequest;
import com.swiftdrop.logistics.dto.MerchantApplicationResponse;
import com.swiftdrop.logistics.dto.ProvisionUserResponse;
import com.swiftdrop.logistics.dto.ProvisionedAccountResponse;
import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.ApplicationType;
import com.swiftdrop.logistics.entity.CourierApplication;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.MerchantApplication;
import com.swiftdrop.logistics.client.AuthProvisioningClient;
import com.swiftdrop.logistics.exception.ApplicationAlreadyReviewedException;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.CourierApplicationRepository;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.MerchantApplicationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final MerchantApplicationRepository merchantApplicationRepository;
    private final CourierApplicationRepository courierApplicationRepository;
    private final AuthProvisioningClient authProvisioningClient;
    private final MerchantRepository merchantRepository;
    private final DriverRepository driverRepository;
    private final ApplicationEmailOwnershipService emailOwnershipService;

    @Transactional
    public MerchantApplicationResponse createMerchantApplication(MerchantApplicationRequest request) {
        final MerchantApplicationRequest applicationRequest = Objects.requireNonNull(
                request,
                "merchant application request must not be null"
        );
        String contactEmail = emailOwnershipService.normalize(applicationRequest.contactEmail());
        emailOwnershipService.reserveForSubmission(contactEmail, ApplicationType.MERCHANT);

        MerchantApplication application = MerchantApplication.builder()
                .businessName(applicationRequest.businessName().trim())
                .contactEmail(contactEmail)
                .message(trimToNull(applicationRequest.message()))
                .status(ApplicationStatus.PENDING)
                .build();

        MerchantApplication savedApplication = Objects.requireNonNull(
                merchantApplicationRepository.saveAndFlush(application),
                "saved merchant application must not be null"
        );
        emailOwnershipService.bindReservation(
                contactEmail,
                Objects.requireNonNull(savedApplication.getId(), "merchant application id must not be null")
        );
        return toMerchantResponse(savedApplication);
    }

    @Transactional
    public CourierApplicationResponse createCourierApplication(CourierApplicationRequest request) {
        final CourierApplicationRequest applicationRequest = Objects.requireNonNull(
                request,
                "courier application request must not be null"
        );
        String contactEmail = emailOwnershipService.normalize(applicationRequest.contactEmail());
        emailOwnershipService.reserveForSubmission(contactEmail, ApplicationType.COURIER);

        CourierApplication application = CourierApplication.builder()
                .fullName(applicationRequest.fullName().trim())
                .contactEmail(contactEmail)
                .vehicleType(applicationRequest.vehicleType())
                .message(trimToNull(applicationRequest.message()))
                .status(ApplicationStatus.PENDING)
                .build();

        CourierApplication savedApplication = Objects.requireNonNull(
                courierApplicationRepository.saveAndFlush(application),
                "saved courier application must not be null"
        );
        emailOwnershipService.bindReservation(
                contactEmail,
                Objects.requireNonNull(savedApplication.getId(), "courier application id must not be null")
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
    public MerchantApplicationReviewResponse approveMerchantApplication(UUID id, ApplicationReviewRequest request) {
        MerchantApplication application = merchantApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant application not found."));
        ensurePending(application.getStatus());
        emailOwnershipService.assertApprovalAllowed(
                application.getContactEmail(),
                ApplicationType.MERCHANT,
                application.getId()
        );

        final ProvisionUserResponse provisionedUser = Objects.requireNonNull(
                authProvisioningClient.provisionUser(
                        application.getContactEmail(),
                        "MERCHANT"
                ),
                "provisioned merchant user must not be null"
        );
        final UUID provisionedUserId = Objects.requireNonNull(
                provisionedUser.userId(),
                "provisioned merchant user id must not be null"
        );
        final ApplicationReviewRequest reviewRequest = Objects.requireNonNull(
                request,
                "merchant review request must not be null"
        );

        application.setStatus(ApplicationStatus.APPROVED);
        application.setReviewedAt(java.time.LocalDateTime.now());
        application.setReviewNote(trimToNull(reviewRequest.reviewNote()));
        application.setProvisionedUserId(provisionedUserId);

        ensureMerchantProfile(application, provisionedUserId);

        MerchantApplication savedApplication = Objects.requireNonNull(
                merchantApplicationRepository.save(application),
                "approved merchant application must not be null"
        );
        emailOwnershipService.markApproved(application.getContactEmail());
        return new MerchantApplicationReviewResponse(
                toMerchantResponse(savedApplication),
                toProvisionedAccountResponse(provisionedUser)
        );
    }

    @Transactional
    public MerchantApplicationResponse rejectMerchantApplication(UUID id, ApplicationReviewRequest request) {
        return reviewMerchantApplication(id, ApplicationStatus.REJECTED, request);
    }

    @Transactional
    public CourierApplicationReviewResponse approveCourierApplication(UUID id, ApplicationReviewRequest request) {
        CourierApplication application = courierApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Courier application not found."));
        ensurePending(application.getStatus());
        emailOwnershipService.assertApprovalAllowed(
                application.getContactEmail(),
                ApplicationType.COURIER,
                application.getId()
        );

        final ProvisionUserResponse provisionedUser = Objects.requireNonNull(
                authProvisioningClient.provisionUser(
                        application.getContactEmail(),
                        "DRIVER"
                ),
                "provisioned courier user must not be null"
        );
        final UUID provisionedUserId = Objects.requireNonNull(
                provisionedUser.userId(),
                "provisioned courier user id must not be null"
        );
        final ApplicationReviewRequest reviewRequest = Objects.requireNonNull(
                request,
                "courier review request must not be null"
        );

        application.setStatus(ApplicationStatus.APPROVED);
        application.setReviewedAt(java.time.LocalDateTime.now());
        application.setReviewNote(trimToNull(reviewRequest.reviewNote()));
        application.setProvisionedUserId(provisionedUserId);

        ensureDriverProfile(application, provisionedUserId);

        CourierApplication savedApplication = Objects.requireNonNull(
                courierApplicationRepository.save(application),
                "approved courier application must not be null"
        );
        emailOwnershipService.markApproved(application.getContactEmail());
        return new CourierApplicationReviewResponse(
                toCourierResponse(savedApplication),
                toProvisionedAccountResponse(provisionedUser)
        );
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
        final ApplicationReviewRequest reviewRequest = Objects.requireNonNull(
                request,
                "merchant review request must not be null"
        );
        application.setReviewNote(trimToNull(reviewRequest.reviewNote()));

        MerchantApplication savedApplication = Objects.requireNonNull(
                merchantApplicationRepository.save(application),
                "reviewed merchant application must not be null"
        );
        if (status == ApplicationStatus.REJECTED) {
            emailOwnershipService.release(application.getContactEmail());
        }
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
        final ApplicationReviewRequest reviewRequest = Objects.requireNonNull(
                request,
                "courier review request must not be null"
        );
        application.setReviewNote(trimToNull(reviewRequest.reviewNote()));

        CourierApplication savedApplication = Objects.requireNonNull(
                courierApplicationRepository.save(application),
                "reviewed courier application must not be null"
        );
        if (status == ApplicationStatus.REJECTED) {
            emailOwnershipService.release(application.getContactEmail());
        }
        return toCourierResponse(savedApplication);
    }

    private void ensurePending(ApplicationStatus status) {
        if (status != ApplicationStatus.PENDING) {
            throw new ApplicationAlreadyReviewedException("Application has already been reviewed.");
        }
    }

    private void ensureMerchantProfile(MerchantApplication application, UUID provisionedUserId) {
        if (merchantRepository.findByUserId(provisionedUserId).isPresent()) {
            return;
        }

        Merchant merchant = Merchant.builder()
                .userId(provisionedUserId)
                .name(application.getBusinessName())
                .latitude(0.0)
                .longitude(0.0)
                .build();
        final Merchant savedMerchant = Objects.requireNonNull(
                merchantRepository.save(merchant),
                "approved merchant profile must not be null"
        );
        Objects.requireNonNull(savedMerchant.getId(), "approved merchant profile id must not be null");
    }

    private void ensureDriverProfile(CourierApplication application, UUID provisionedUserId) {
        if (driverRepository.findByUserId(provisionedUserId).isPresent()) {
            return;
        }

        Driver driver = Driver.builder()
                .userId(provisionedUserId)
                .fullName(application.getFullName())
                .email(application.getContactEmail())
                .status(DriverStatus.OFFLINE)
                .build();
        final Driver savedDriver = Objects.requireNonNull(
                driverRepository.save(driver),
                "approved courier profile must not be null"
        );
        Objects.requireNonNull(savedDriver.getId(), "approved courier profile id must not be null");
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
                application.getReviewNote(),
                application.getProvisionedUserId()
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
                application.getReviewNote(),
                application.getProvisionedUserId()
        );
    }

    private ProvisionedAccountResponse toProvisionedAccountResponse(ProvisionUserResponse response) {
        ProvisionUserResponse provisionedUser = Objects.requireNonNull(
                response,
                "provision user response must not be null"
        );
        return new ProvisionedAccountResponse(
                provisionedUser.userId(),
                provisionedUser.email(),
                provisionedUser.role(),
                provisionedUser.created(),
                provisionedUser.temporaryPassword()
        );
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

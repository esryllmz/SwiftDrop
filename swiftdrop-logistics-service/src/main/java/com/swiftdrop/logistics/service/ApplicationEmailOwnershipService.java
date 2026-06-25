package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.swiftdrop.logistics.client.AuthProvisioningClient;
import com.swiftdrop.logistics.dto.UserOwnershipResponse;
import com.swiftdrop.logistics.entity.ApplicationEmailReservation;
import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.ApplicationType;
import com.swiftdrop.logistics.exception.ApplicationEmailConflictException;
import com.swiftdrop.logistics.repository.ApplicationEmailReservationRepository;
import com.swiftdrop.logistics.repository.CourierApplicationRepository;
import com.swiftdrop.logistics.repository.MerchantApplicationRepository;
import com.swiftdrop.logistics.util.EmailNormalizer;

@Service
public class ApplicationEmailOwnershipService {

    public static final String PUBLIC_CONFLICT_MESSAGE =
            "This email address cannot be used for this application. Please use a different email address.";
    public static final String ADMIN_CONFLICT_MESSAGE =
            "The application cannot be approved because the email is already assigned to another account.";
    private static final List<ApplicationStatus> ACTIVE_STATUSES =
            List.of(ApplicationStatus.PENDING, ApplicationStatus.APPROVED);
    private static final Logger LOG = LoggerFactory.getLogger(ApplicationEmailOwnershipService.class);

    private final MerchantApplicationRepository merchantApplications;
    private final CourierApplicationRepository courierApplications;
    private final ApplicationEmailReservationRepository reservations;
    private final AuthProvisioningClient authClient;

    public ApplicationEmailOwnershipService(
            MerchantApplicationRepository merchantApplications,
            CourierApplicationRepository courierApplications,
            ApplicationEmailReservationRepository reservations,
            AuthProvisioningClient authClient
    ) {
        this.merchantApplications = merchantApplications;
        this.courierApplications = courierApplications;
        this.reservations = reservations;
        this.authClient = authClient;
    }

    public String normalize(String email) {
        return EmailNormalizer.normalizeRequired(email);
    }

    public void reserveForSubmission(String email, ApplicationType type) {
        try {
            reservations.saveAndFlush(ApplicationEmailReservation.builder()
                    .normalizedEmail(email)
                    .applicationType(type)
                    .status(ApplicationStatus.PENDING)
                    .build());
        } catch (DataIntegrityViolationException exception) {
            conflict("EMAIL_RESERVED", false);
        }

        assertNoAuthOwnership(email, false);
        if (merchantApplications.existsByContactEmailAndStatusIn(email, ACTIVE_STATUSES)) {
            conflict(type == ApplicationType.MERCHANT
                    ? "SAME_APPLICATION_ACTIVE"
                    : "CROSS_ROLE_APPLICATION_ACTIVE", false);
        }
        if (courierApplications.existsByContactEmailAndStatusIn(email, ACTIVE_STATUSES)) {
            conflict(type == ApplicationType.COURIER
                    ? "SAME_APPLICATION_ACTIVE"
                    : "CROSS_ROLE_APPLICATION_ACTIVE", false);
        }
    }

    public void bindReservation(String email, UUID applicationId) {
        ApplicationEmailReservation reservation = reservations.findById(email)
                .orElseThrow(() -> new IllegalStateException("Application email reservation is missing."));
        reservation.setApplicationId(applicationId);
        reservations.save(reservation);
    }

    public void assertApprovalAllowed(String email, ApplicationType type, UUID applicationId) {
        assertNoAuthOwnership(email, true);
        boolean merchantConflict = merchantApplications.existsByContactEmailAndStatusInAndIdNot(
                email,
                ACTIVE_STATUSES,
                applicationId
        );
        boolean courierConflict = courierApplications.existsByContactEmailAndStatusInAndIdNot(
                email,
                ACTIVE_STATUSES,
                applicationId
        );
        if (merchantConflict || courierConflict) {
            conflict(type.name() + "_APPROVAL_OWNERSHIP_CHANGED", true);
        }
    }

    public void markApproved(String email) {
        reservations.findById(email).ifPresent(reservation -> {
            reservation.setStatus(ApplicationStatus.APPROVED);
            reservations.save(reservation);
        });
    }

    public void release(String email) {
        reservations.deleteById(email);
    }

    private void assertNoAuthOwnership(String email, boolean adminOperation) {
        UserOwnershipResponse ownership = Objects.requireNonNull(
                authClient.findOwnership(email),
                "auth ownership response must not be null"
        );
        if (ownership.exists()) {
            conflict("AUTH_ACCOUNT_EXISTS", adminOperation);
        }
    }

    private void conflict(String reason, boolean adminOperation) {
        LOG.warn("Application email ownership conflict [reason={}]", reason);
        throw new ApplicationEmailConflictException(
                adminOperation ? ADMIN_CONFLICT_MESSAGE : PUBLIC_CONFLICT_MESSAGE
        );
    }
}

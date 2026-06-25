package com.swiftdrop.logistics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import com.swiftdrop.logistics.client.AuthProvisioningClient;
import com.swiftdrop.logistics.dto.UserOwnershipResponse;
import com.swiftdrop.logistics.entity.ApplicationEmailReservation;
import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.ApplicationType;
import com.swiftdrop.logistics.exception.ApplicationEmailConflictException;
import com.swiftdrop.logistics.exception.UserProvisioningUnavailableException;
import com.swiftdrop.logistics.repository.ApplicationEmailReservationRepository;
import com.swiftdrop.logistics.repository.CourierApplicationRepository;
import com.swiftdrop.logistics.repository.MerchantApplicationRepository;

@ExtendWith(MockitoExtension.class)
class ApplicationEmailOwnershipServiceTest {

    @Mock
    private MerchantApplicationRepository merchantApplications;
    @Mock
    private CourierApplicationRepository courierApplications;
    @Mock
    private ApplicationEmailReservationRepository reservations;
    @Mock
    private AuthProvisioningClient authClient;

    private ApplicationEmailOwnershipService service;

    @BeforeEach
    void setUp() {
        service = new ApplicationEmailOwnershipService(
                merchantApplications,
                courierApplications,
                reservations,
                authClient
        );
    }

    @Test
    void newEmailCanBeReservedWithCanonicalNormalization() {
        when(authClient.findOwnership("user@example.com"))
                .thenReturn(new UserOwnershipResponse(false, null, false));

        String normalized = service.normalize("  User@Example.COM  ");
        service.reserveForSubmission(normalized, ApplicationType.MERCHANT);

        assertThat(normalized).isEqualTo("user@example.com");
        verify(reservations).saveAndFlush(any(ApplicationEmailReservation.class));
    }

    @Test
    void existingAuthAccountConflictsWithoutExposingRole() {
        when(authClient.findOwnership("owned@example.com"))
                .thenReturn(new UserOwnershipResponse(true, "CUSTOMER", true));

        assertPublicConflict(() ->
                service.reserveForSubmission("owned@example.com", ApplicationType.MERCHANT));
    }

    @Test
    void pendingMerchantConflictsWithCourierSubmission() {
        when(authClient.findOwnership("shared@example.com"))
                .thenReturn(new UserOwnershipResponse(false, null, false));
        when(merchantApplications.existsByContactEmailAndStatusIn(eq("shared@example.com"), anyList()))
                .thenReturn(true);

        assertPublicConflict(() ->
                service.reserveForSubmission("shared@example.com", ApplicationType.COURIER));
    }

    @Test
    void pendingCourierConflictsWithMerchantSubmission() {
        when(authClient.findOwnership("shared@example.com"))
                .thenReturn(new UserOwnershipResponse(false, null, false));
        when(courierApplications.existsByContactEmailAndStatusIn(eq("shared@example.com"), anyList()))
                .thenReturn(true);

        assertPublicConflict(() ->
                service.reserveForSubmission("shared@example.com", ApplicationType.MERCHANT));
    }

    @Test
    void uniqueReservationConflictStopsConcurrentSubmission() {
        when(reservations.saveAndFlush(any(ApplicationEmailReservation.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        assertPublicConflict(() ->
                service.reserveForSubmission("race@example.com", ApplicationType.COURIER));
        verify(authClient, never()).findOwnership(any());
    }

    @Test
    void authUnavailableFailsClosed() {
        when(authClient.findOwnership("unavailable@example.com"))
                .thenThrow(new UserProvisioningUnavailableException("unavailable"));

        assertThatThrownBy(() ->
                service.reserveForSubmission("unavailable@example.com", ApplicationType.MERCHANT))
                .isInstanceOf(UserProvisioningUnavailableException.class);
    }

    @Test
    void approvalRechecksAuthOwnershipWithOperationalMessage() {
        UUID applicationId = UUID.randomUUID();
        when(authClient.findOwnership("owned@example.com"))
                .thenReturn(new UserOwnershipResponse(true, "DRIVER", true));

        assertThatThrownBy(() -> service.assertApprovalAllowed(
                "owned@example.com",
                ApplicationType.MERCHANT,
                applicationId
        )).isInstanceOf(ApplicationEmailConflictException.class)
                .hasMessage(ApplicationEmailOwnershipService.ADMIN_CONFLICT_MESSAGE);
    }

    @Test
    void rejectedApplicationReleasesReservation() {
        service.release("retry@example.com");
        verify(reservations).deleteById("retry@example.com");
    }

    @Test
    void approvedApplicationKeepsReservation() {
        ApplicationEmailReservation reservation = ApplicationEmailReservation.builder()
                .normalizedEmail("approved@example.com")
                .applicationType(ApplicationType.MERCHANT)
                .status(ApplicationStatus.PENDING)
                .build();
        when(reservations.findById("approved@example.com")).thenReturn(Optional.of(reservation));

        service.markApproved("approved@example.com");

        assertThat(reservation.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        verify(reservations).save(reservation);
    }

    private void assertPublicConflict(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(ApplicationEmailConflictException.class)
                .hasMessage(ApplicationEmailOwnershipService.PUBLIC_CONFLICT_MESSAGE)
                .hasMessageNotContaining("CUSTOMER")
                .hasMessageNotContaining("MERCHANT")
                .hasMessageNotContaining("DRIVER");
    }
}

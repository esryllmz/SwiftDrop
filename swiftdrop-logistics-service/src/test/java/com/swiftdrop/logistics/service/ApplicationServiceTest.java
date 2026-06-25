package com.swiftdrop.logistics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.swiftdrop.logistics.client.AuthProvisioningClient;
import com.swiftdrop.logistics.dto.CourierApplicationRequest;
import com.swiftdrop.logistics.dto.MerchantApplicationRequest;
import com.swiftdrop.logistics.entity.ApplicationStatus;
import com.swiftdrop.logistics.entity.ApplicationType;
import com.swiftdrop.logistics.entity.CourierApplication;
import com.swiftdrop.logistics.entity.MerchantApplication;
import com.swiftdrop.logistics.entity.VehicleType;
import com.swiftdrop.logistics.repository.CourierApplicationRepository;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantApplicationRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private MerchantApplicationRepository merchantApplications;
    @Mock
    private CourierApplicationRepository courierApplications;
    @Mock
    private AuthProvisioningClient authClient;
    @Mock
    private MerchantRepository merchants;
    @Mock
    private DriverRepository drivers;
    @Mock
    private ApplicationEmailOwnershipService ownership;

    private ApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ApplicationService(
                merchantApplications,
                courierApplications,
                authClient,
                merchants,
                drivers,
                ownership
        );
    }

    @Test
    void newMerchantApplicationUsesCanonicalEmailAndReservation() {
        UUID id = UUID.randomUUID();
        when(ownership.normalize("  User@Example.COM  ")).thenReturn("user@example.com");
        when(merchantApplications.saveAndFlush(any(MerchantApplication.class)))
                .thenAnswer(invocation -> {
                    MerchantApplication application = invocation.getArgument(0);
                    application.setId(id);
                    return application;
                });

        var response = service.createMerchantApplication(
                new MerchantApplicationRequest("Store", "  User@Example.COM  ", null)
        );

        assertThat(response.contactEmail()).isEqualTo("user@example.com");
        assertThat(response.status()).isEqualTo(ApplicationStatus.PENDING);
        verify(ownership).reserveForSubmission("user@example.com", ApplicationType.MERCHANT);
        verify(ownership).bindReservation("user@example.com", id);
    }

    @Test
    void newCourierApplicationUsesCanonicalEmailAndReservation() {
        UUID id = UUID.randomUUID();
        when(ownership.normalize(" Courier@Example.COM ")).thenReturn("courier@example.com");
        when(courierApplications.saveAndFlush(any(CourierApplication.class)))
                .thenAnswer(invocation -> {
                    CourierApplication application = invocation.getArgument(0);
                    application.setId(id);
                    return application;
                });

        var response = service.createCourierApplication(
                new CourierApplicationRequest(
                        "Courier",
                        " Courier@Example.COM ",
                        VehicleType.BICYCLE,
                        null
                )
        );

        assertThat(response.contactEmail()).isEqualTo("courier@example.com");
        verify(ownership).reserveForSubmission("courier@example.com", ApplicationType.COURIER);
        verify(ownership).bindReservation("courier@example.com", id);
    }
}

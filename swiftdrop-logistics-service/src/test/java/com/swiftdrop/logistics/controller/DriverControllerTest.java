package com.swiftdrop.logistics.controller;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.swiftdrop.logistics.dto.DriverResponse;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.security.AuthenticatedUserResolver;
import com.swiftdrop.logistics.service.DriverService;

@WebMvcTest(DriverController.class)
@Import(AuthenticatedUserResolver.class)
class DriverControllerTest {

    private static final String USER_ID_HEADER = "X-Authenticated-User";
    private static final String EMAIL_HEADER = "X-User-Email";
    private static final String ROLE_HEADER = "X-User-Role";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DriverService driverService;

    @Test
    void findDrivers_withoutAuthenticationHeaders_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/drivers"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(driverService);
    }

    @Test
    void findDrivers_withNonAdminRole_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/drivers")
                        .header(USER_ID_HEADER, UUID.randomUUID().toString())
                        .header(EMAIL_HEADER, "merchant@example.com")
                        .header(ROLE_HEADER, "MERCHANT"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(driverService);
    }

    @Test
    void findDrivers_withAdminRole_returnsDriverList() throws Exception {
        when(driverService.findDrivers(null)).thenReturn(List.of(
                new DriverResponse(UUID.randomUUID(), UUID.randomUUID(), "Test Courier", "courier@example.com", DriverStatus.AVAILABLE, "Kadikoy", 0)
        ));

        mockMvc.perform(get("/api/v1/drivers")
                        .header(USER_ID_HEADER, UUID.randomUUID().toString())
                        .header(EMAIL_HEADER, "admin@example.com")
                        .header(ROLE_HEADER, "ADMIN"))
                .andExpect(status().isOk());
    }
}

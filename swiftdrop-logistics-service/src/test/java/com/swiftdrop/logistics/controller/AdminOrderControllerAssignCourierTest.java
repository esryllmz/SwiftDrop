package com.swiftdrop.logistics.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.security.AuthenticatedUserResolver;
import com.swiftdrop.logistics.service.OrderService;

@WebMvcTest(AdminOrderController.class)
@Import(AuthenticatedUserResolver.class)
class AdminOrderControllerAssignCourierTest {

    private static final String USER_ID_HEADER = "X-Authenticated-User";
    private static final String EMAIL_HEADER = "X-User-Email";
    private static final String ROLE_HEADER = "X-User-Role";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private OrderService orderService;

    @Test
    void assignCourier_withoutAuthenticationHeaders_isUnauthorized() throws Exception {
        UUID orderId = UUID.randomUUID();
        UUID courierId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/admin/orders/{orderId}/assign-courier", orderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignCourierRequestBody(courierId))))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(orderService);
    }

    @Test
    void assignCourier_withNonAdminRole_isForbidden() throws Exception {
        UUID orderId = UUID.randomUUID();
        UUID courierId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/admin/orders/{orderId}/assign-courier", orderId)
                        .header(USER_ID_HEADER, UUID.randomUUID().toString())
                        .header(EMAIL_HEADER, "merchant@example.com")
                        .header(ROLE_HEADER, "MERCHANT")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignCourierRequestBody(courierId))))
                .andExpect(status().isForbidden());

        verifyNoInteractions(orderService);
    }

    @Test
    void assignCourier_withAdminRoleButMissingCourierId_isBadRequest() throws Exception {
        UUID orderId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/admin/orders/{orderId}/assign-courier", orderId)
                        .header(USER_ID_HEADER, UUID.randomUUID().toString())
                        .header(EMAIL_HEADER, "admin@example.com")
                        .header(ROLE_HEADER, "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(orderService);
    }

    @Test
    void assignCourier_withAdminRoleAndValidBody_assignsCourier() throws Exception {
        UUID orderId = UUID.randomUUID();
        UUID courierId = UUID.randomUUID();
        UUID adminUserId = UUID.randomUUID();
        OrderResponse response = new OrderResponse(
                orderId,
                UUID.randomUUID(),
                "Test Merchant",
                "Test Courier",
                "courier@example.com",
                OrderStatus.DRIVER_ASSIGNED,
                BigDecimal.TEN,
                LocalDateTime.now(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        when(orderService.assignCourier(eq(adminUserId), eq(orderId), eq(courierId))).thenReturn(response);

        mockMvc.perform(post("/api/v1/admin/orders/{orderId}/assign-courier", orderId)
                        .header(USER_ID_HEADER, adminUserId.toString())
                        .header(EMAIL_HEADER, "admin@example.com")
                        .header(ROLE_HEADER, "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignCourierRequestBody(courierId))))
                .andExpect(status().isOk());

        verify(orderService).assignCourier(any(), eq(orderId), eq(courierId));
    }

    private record AssignCourierRequestBody(UUID courierId) {
    }
}

package com.swiftdrop.logistics.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.CancelOrderRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.security.AuthenticatedUser;
import com.swiftdrop.logistics.security.AuthenticatedUserResolver;
import com.swiftdrop.logistics.service.OrderService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private static final String ADMIN_ROLE = "ADMIN";

    private final AuthenticatedUserResolver authenticatedUserResolver;
    private final OrderService orderService;

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            HttpServletRequest request,
            @PathVariable UUID orderId,
            @Valid @RequestBody CancelOrderRequest cancelRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, ADMIN_ROLE);
        return ResponseEntity.ok(orderService.cancelAdminOrder(user.userId(), orderId, cancelRequest));
    }

    @PostMapping("/{orderId}/assign-demo-courier")
    public ResponseEntity<OrderResponse> assignDemoCourier(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, ADMIN_ROLE);
        return ResponseEntity.ok(orderService.assignDemoCourier(user.userId(), orderId));
    }
}

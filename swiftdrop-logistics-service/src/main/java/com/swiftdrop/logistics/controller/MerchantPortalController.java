package com.swiftdrop.logistics.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.MerchantProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.security.AuthenticatedUser;
import com.swiftdrop.logistics.security.AuthenticatedUserResolver;
import com.swiftdrop.logistics.service.PortalService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/merchant")
@RequiredArgsConstructor
public class MerchantPortalController {

    private static final String MERCHANT_ROLE = "MERCHANT";

    private final AuthenticatedUserResolver authenticatedUserResolver;
    private final PortalService portalService;

    @GetMapping("/profile")
    public ResponseEntity<MerchantProfileResponse> getProfile(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, MERCHANT_ROLE);
        return ResponseEntity.ok(portalService.getMerchantProfile(user));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> findOrders(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, MERCHANT_ROLE);
        return ResponseEntity.ok(portalService.findMerchantOrders(user));
    }

    @PostMapping("/orders/{orderId}/preparing")
    public ResponseEntity<OrderResponse> markOrderPreparing(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, MERCHANT_ROLE);
        return ResponseEntity.ok(portalService.markMerchantOrderPreparing(user, orderId));
    }

    @PostMapping("/orders/{orderId}/ready-for-pickup")
    public ResponseEntity<OrderResponse> markOrderReadyForPickup(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, MERCHANT_ROLE);
        return ResponseEntity.ok(portalService.markMerchantOrderReadyForPickup(user, orderId));
    }
}

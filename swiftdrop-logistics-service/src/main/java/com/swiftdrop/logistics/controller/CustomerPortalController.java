package com.swiftdrop.logistics.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.CancelOrderRequest;
import com.swiftdrop.logistics.dto.CustomerMerchantOptionResponse;
import com.swiftdrop.logistics.dto.CustomerProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.security.AuthenticatedUser;
import com.swiftdrop.logistics.security.AuthenticatedUserResolver;
import com.swiftdrop.logistics.service.PortalService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
public class CustomerPortalController {

    private static final String CUSTOMER_ROLE = "CUSTOMER";

    private final AuthenticatedUserResolver authenticatedUserResolver;
    private final PortalService portalService;

    @GetMapping("/profile")
    public ResponseEntity<CustomerProfileResponse> getProfile(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.getCustomerProfile(user));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> findOrders(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.findCustomerOrders(user));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponse> findOrder(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.findCustomerOrder(user, orderId));
    }

    @GetMapping("/merchants")
    public ResponseEntity<List<CustomerMerchantOptionResponse>> findMerchants(HttpServletRequest request) {
        authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.findCustomerMerchantOptions());
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> createOrder(
            HttpServletRequest request,
            @Valid @RequestBody CreateCustomerOrderRequest orderRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return new ResponseEntity<>(portalService.createCustomerOrder(user, orderRequest), HttpStatus.CREATED);
    }

    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            HttpServletRequest request,
            @PathVariable UUID orderId,
            @Valid @RequestBody CancelOrderRequest cancelRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.cancelCustomerOrder(user, orderId, cancelRequest));
    }
}

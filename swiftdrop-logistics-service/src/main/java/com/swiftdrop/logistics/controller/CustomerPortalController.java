package com.swiftdrop.logistics.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.CreateCustomerAddressRequest;
import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.CancelOrderRequest;
import com.swiftdrop.logistics.dto.CustomerAddressResponse;
import com.swiftdrop.logistics.dto.CustomerMerchantOptionResponse;
import com.swiftdrop.logistics.dto.CustomerProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.UpdateCustomerAddressRequest;
import com.swiftdrop.logistics.dto.UpdateCustomerProfileRequest;
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

    @PutMapping("/profile")
    public ResponseEntity<CustomerProfileResponse> updateProfile(
            HttpServletRequest request,
            @Valid @RequestBody UpdateCustomerProfileRequest profileRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.updateCustomerProfile(user, profileRequest));
    }

    @GetMapping("/addresses")
    public ResponseEntity<List<CustomerAddressResponse>> findAddresses(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.findCustomerAddresses(user));
    }

    @PostMapping("/addresses")
    public ResponseEntity<CustomerAddressResponse> createAddress(
            HttpServletRequest request,
            @Valid @RequestBody CreateCustomerAddressRequest addressRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return new ResponseEntity<>(portalService.createCustomerAddress(user, addressRequest), HttpStatus.CREATED);
    }

    @PutMapping("/addresses/{addressId}")
    public ResponseEntity<CustomerAddressResponse> updateAddress(
            HttpServletRequest request,
            @PathVariable UUID addressId,
            @Valid @RequestBody UpdateCustomerAddressRequest addressRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.updateCustomerAddress(user, addressId, addressRequest));
    }

    @DeleteMapping("/addresses/{addressId}")
    public ResponseEntity<Void> deleteAddress(
            HttpServletRequest request,
            @PathVariable UUID addressId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        portalService.deleteCustomerAddress(user, addressId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/addresses/{addressId}/default")
    public ResponseEntity<CustomerAddressResponse> setDefaultAddress(
            HttpServletRequest request,
            @PathVariable UUID addressId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, CUSTOMER_ROLE);
        return ResponseEntity.ok(portalService.setDefaultCustomerAddress(user, addressId));
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

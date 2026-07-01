package com.swiftdrop.logistics.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.CourierProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.UpdateCourierAvailabilityRequest;
import com.swiftdrop.logistics.dto.UpdateCourierProfileRequest;
import com.swiftdrop.logistics.security.AuthenticatedUser;
import com.swiftdrop.logistics.security.AuthenticatedUserResolver;
import com.swiftdrop.logistics.service.PortalService;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/courier")
@RequiredArgsConstructor
public class CourierPortalController {

    private static final String DRIVER_ROLE = "DRIVER";

    private final AuthenticatedUserResolver authenticatedUserResolver;
    private final PortalService portalService;

    @GetMapping("/profile")
    public ResponseEntity<CourierProfileResponse> getProfile(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.getCourierProfile(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<CourierProfileResponse> updateProfile(
            HttpServletRequest request,
            @Valid @RequestBody UpdateCourierProfileRequest profileRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.updateCourierProfile(user, profileRequest));
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<OrderResponse>> findAssignments(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.findCourierAssignments(user));
    }

    @GetMapping("/assignments/{orderId}")
    public ResponseEntity<OrderResponse> findAssignment(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.findCourierAssignment(user, orderId));
    }

    @PostMapping("/availability")
    public ResponseEntity<CourierProfileResponse> updateAvailability(
            HttpServletRequest request,
            @Valid @RequestBody UpdateCourierAvailabilityRequest availabilityRequest
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.updateCourierAvailability(user, availabilityRequest));
    }

    @PostMapping("/orders/{orderId}/picked-up")
    public ResponseEntity<OrderResponse> markOrderPickedUp(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.markCourierOrderPickedUp(user, orderId));
    }

    @PostMapping("/assignments/{orderId}/on-the-way")
    public ResponseEntity<OrderResponse> markOrderOnTheWay(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.markCourierOrderOnTheWay(user, orderId));
    }

    @PostMapping("/orders/{orderId}/delivered")
    public ResponseEntity<OrderResponse> markOrderDelivered(
            HttpServletRequest request,
            @PathVariable UUID orderId
    ) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.markCourierOrderDelivered(user, orderId));
    }
}

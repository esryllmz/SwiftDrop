package com.swiftdrop.logistics.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.CourierProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.security.AuthenticatedUser;
import com.swiftdrop.logistics.security.AuthenticatedUserResolver;
import com.swiftdrop.logistics.service.PortalService;

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

    @GetMapping("/assignments")
    public ResponseEntity<List<OrderResponse>> findAssignments(HttpServletRequest request) {
        AuthenticatedUser user = authenticatedUserResolver.resolve(request, DRIVER_ROLE);
        return ResponseEntity.ok(portalService.findCourierAssignments(user));
    }
}

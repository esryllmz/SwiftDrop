package com.swiftdrop.auth.api;

import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.auth.dto.ProvisionUserRequest;
import com.swiftdrop.auth.dto.ProvisionUserResponse;
import com.swiftdrop.auth.dto.UserOwnershipResponse;
import com.swiftdrop.auth.service.InternalUserProvisioningService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/internal/users")
public class InternalUserController {

    private static final String INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key";

    private final InternalUserProvisioningService provisioningService;

    public InternalUserController(InternalUserProvisioningService provisioningService) {
        this.provisioningService = Objects.requireNonNull(
                provisioningService,
                "provisioningService must not be null"
        );
    }

    @PostMapping("/provision")
    public ResponseEntity<ProvisionUserResponse> provisionUser(
            @RequestHeader(name = INTERNAL_API_KEY_HEADER, required = false) String internalApiKey,
            @Valid @RequestBody ProvisionUserRequest request
    ) {
        ProvisionUserResponse response = provisioningService.provision(internalApiKey, request);
        HttpStatus status = response.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/ownership")
    public ResponseEntity<UserOwnershipResponse> findOwnership(
            @RequestHeader(name = INTERNAL_API_KEY_HEADER, required = false) String internalApiKey,
            @RequestParam String email
    ) {
        return ResponseEntity.ok(provisioningService.findOwnership(internalApiKey, email));
    }
}

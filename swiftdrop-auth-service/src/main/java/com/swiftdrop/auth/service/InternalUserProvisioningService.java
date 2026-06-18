package com.swiftdrop.auth.service;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.swiftdrop.auth.dto.ProvisionUserRequest;
import com.swiftdrop.auth.dto.ProvisionUserResponse;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.exception.InvalidInternalApiKeyException;
import com.swiftdrop.auth.exception.UnsupportedProvisioningRoleException;
import com.swiftdrop.auth.exception.UserRoleConflictException;
import com.swiftdrop.auth.repository.UserRepository;

@Service
public class InternalUserProvisioningService {

    private static final int MIN_TEMPORARY_PASSWORD_LENGTH = 12;
    private static final char[] PASSWORD_CHARS = (
            "ABCDEFGHJKLMNPQRSTUVWXYZ" +
            "abcdefghijkmnopqrstuvwxyz" +
            "23456789" +
            "!@#$%*_-+="
    ).toCharArray();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom;
    private final String internalApiKey;
    private final int temporaryPasswordLength;

    public InternalUserProvisioningService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${application.internal.api-key}") String internalApiKey,
            @Value("${application.provisioning.temporary-password-length}") int temporaryPasswordLength
    ) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository must not be null");
        this.passwordEncoder = Objects.requireNonNull(passwordEncoder, "passwordEncoder must not be null");
        this.secureRandom = new SecureRandom();
        this.internalApiKey = Objects.requireNonNull(internalApiKey, "internal api key must not be null");
        this.temporaryPasswordLength = Math.max(temporaryPasswordLength, MIN_TEMPORARY_PASSWORD_LENGTH);
    }

    @Transactional
    public ProvisionUserResponse provision(String providedApiKey, ProvisionUserRequest request) {
        validateInternalApiKey(providedApiKey);
        ProvisionUserRequest provisioningRequest = Objects.requireNonNull(request, "provision user request must not be null");
        Role requestedRole = Objects.requireNonNull(provisioningRequest.role(), "provision role must not be null");
        validateProvisioningRole(requestedRole);

        final String email = normalizeEmail(provisioningRequest.email());
        final Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            final User user = Objects.requireNonNull(existingUser.get(), "existing user must not be null");
            return toExistingUserResponse(user, requestedRole);
        }

        return createUser(email, requestedRole);
    }

    private void validateInternalApiKey(String providedApiKey) {
        if (!StringUtils.hasText(providedApiKey) || !Objects.equals(internalApiKey, providedApiKey)) {
            throw new InvalidInternalApiKeyException("Internal API key is missing or invalid.");
        }
    }

    private void validateProvisioningRole(Role role) {
        if (role != Role.MERCHANT && role != Role.DRIVER) {
            throw new UnsupportedProvisioningRoleException("Only MERCHANT and DRIVER users can be provisioned.");
        }
    }

    private ProvisionUserResponse toExistingUserResponse(User existingUser, Role requestedRole) {
        User user = Objects.requireNonNull(existingUser, "existing user must not be null");
        Role existingRole = Objects.requireNonNull(user.getRole(), "existing user role must not be null");
        if (existingRole != requestedRole) {
            throw new UserRoleConflictException("A user with this email already exists with a different role.");
        }

        return new ProvisionUserResponse(
                user.getId(),
                user.getEmail(),
                existingRole,
                user.isEnabled(),
                false,
                null
        );
    }

    private ProvisionUserResponse createUser(String email, Role role) {
        final String temporaryPassword = generateTemporaryPassword();
        final String encodedTemporaryPassword = passwordEncoder.encode(temporaryPassword);
        final User userToSave = User.builder()
                .email(email)
                .password(encodedTemporaryPassword)
                .role(role)
                .enabled(true)
                .build();

        final User savedUser = Objects.requireNonNull(userRepository.save(userToSave), "provisioned user must not be null");
        return new ProvisionUserResponse(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.isEnabled(),
                true,
                temporaryPassword
        );
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(temporaryPasswordLength);
        for (int i = 0; i < temporaryPasswordLength; i++) {
            password.append(PASSWORD_CHARS[secureRandom.nextInt(PASSWORD_CHARS.length)]);
        }
        return password.toString();
    }

    private String normalizeEmail(String email) {
        return Objects.requireNonNull(email, "provision email must not be null").trim().toLowerCase(Locale.ROOT);
    }
}

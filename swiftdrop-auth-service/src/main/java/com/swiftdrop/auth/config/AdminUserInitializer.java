package com.swiftdrop.auth.config;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.entity.RefreshToken;
import com.swiftdrop.auth.repository.RefreshTokenRepository;
import com.swiftdrop.auth.repository.UserRepository;
import com.swiftdrop.auth.util.EmailNormalizer;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class AdminUserInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final String email;
    private final String password;
    private final boolean resetExistingPassword;
    private final boolean forceEnabled;
    private final boolean forceRoleAdmin;
    private final boolean forcePasswordChange;

    public AdminUserInitializer(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            @Value("${application.seed.admin.enabled}") boolean enabled,
            @Value("${application.seed.admin.email}") String email,
            @Value("${application.seed.admin.password}") String password,
            @Value("${application.seed.admin.reset-existing-password}") boolean resetExistingPassword,
            @Value("${application.seed.admin.force-enabled}") boolean forceEnabled,
            @Value("${application.seed.admin.force-role-admin}") boolean forceRoleAdmin,
            @Value("${application.seed.admin.force-password-change}") boolean forcePasswordChange
    ) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository must not be null");
        this.refreshTokenRepository = Objects.requireNonNull(
                refreshTokenRepository,
                "refreshTokenRepository must not be null"
        );
        this.passwordEncoder = Objects.requireNonNull(passwordEncoder, "passwordEncoder must not be null");
        this.enabled = enabled;
        this.email = Objects.requireNonNull(
                EmailNormalizer.normalize(email),
                "seed admin email must not be null"
        );
        this.password = Objects.requireNonNull(password, "seed admin password must not be null");
        this.resetExistingPassword = resetExistingPassword;
        this.forceEnabled = forceEnabled;
        this.forceRoleAdmin = forceRoleAdmin;
        this.forcePasswordChange = forcePasswordChange;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("Local admin seed is disabled.");
            return;
        }

        validateSeedConfig();

        User existingAdmin = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (existingAdmin != null) {
            synchronizeExistingAdmin(existingAdmin);
            return;
        }

        final User adminToSave = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.ADMIN)
                .enabled(true)
                .passwordChangeRequired(false)
                .build();

        final User savedAdmin = Objects.requireNonNull(
                userRepository.save(adminToSave),
                "saved admin user must not be null"
        );
        log.info("Local admin seed user created for email={}.", savedAdmin.getEmail());
    }

    private void synchronizeExistingAdmin(User existingAdmin) {
        boolean passwordReset = false;
        boolean changed = false;

        if (resetExistingPassword) {
            existingAdmin.setPassword(passwordEncoder.encode(password));
            revokeActiveTokens(existingAdmin);
            passwordReset = true;
            changed = true;
        } else {
            log.info("Local admin seed password reset is disabled; existing password was not modified.");
        }

        if (forceRoleAdmin && existingAdmin.getRole() != Role.ADMIN) {
            existingAdmin.setRole(Role.ADMIN);
            changed = true;
        }

        if (forceEnabled && !existingAdmin.isEnabled()) {
            existingAdmin.setEnabled(true);
            changed = true;
        }

        if (existingAdmin.isPasswordChangeRequired() != forcePasswordChange) {
            existingAdmin.setPasswordChangeRequired(forcePasswordChange);
            changed = true;
        }

        if (changed) {
            User savedAdmin = Objects.requireNonNull(
                    userRepository.save(existingAdmin),
                    "synchronized admin user must not be null"
            );
            log.info(
                    "Local admin seed user synchronized for email={}. Password reset applied={}.",
                    savedAdmin.getEmail(),
                    passwordReset
            );
            return;
        }

        log.info("Local admin seed user already synchronized for email={}.", existingAdmin.getEmail());
    }

    private void revokeActiveTokens(User user) {
        if (user.getId() == null) {
            return;
        }

        final java.util.List<RefreshToken> activeTokens =
                refreshTokenRepository.findAllByUser_IdAndRevokedFalse(user.getId());
        activeTokens.forEach(refreshToken -> refreshToken.setRevoked(true));
        Objects.requireNonNull(
                refreshTokenRepository.saveAll(activeTokens),
                "revoked refresh tokens must not be null"
        );
    }

    private void validateSeedConfig() {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Seed admin email cannot be blank.");
        }

        if (password == null || password.isBlank()) {
            throw new IllegalStateException("Seed admin password cannot be blank.");
        }

        if (password.length() < 8) {
            throw new IllegalStateException("Seed admin password must be at least 8 characters.");
        }
    }
}

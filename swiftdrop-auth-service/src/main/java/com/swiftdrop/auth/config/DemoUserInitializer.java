package com.swiftdrop.auth.config;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.auth.entity.RefreshToken;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.repository.RefreshTokenRepository;
import com.swiftdrop.auth.repository.UserRepository;
import com.swiftdrop.auth.util.EmailNormalizer;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DemoUserInitializer implements CommandLineRunner {

    public static final UUID DEMO_CUSTOMER_USER_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    public static final UUID DEMO_MERCHANT_USER_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    public static final UUID DEMO_COURIER_USER_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final boolean enabled;
    private final String password;
    private final boolean resetExistingPassword;

    public DemoUserInitializer(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate,
            @Value("${application.seed.demo.enabled}") boolean enabled,
            @Value("${application.seed.demo.password}") String password,
            @Value("${application.seed.demo.reset-existing-password}") boolean resetExistingPassword
    ) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository must not be null");
        this.refreshTokenRepository = Objects.requireNonNull(
                refreshTokenRepository,
                "refreshTokenRepository must not be null"
        );
        this.passwordEncoder = Objects.requireNonNull(passwordEncoder, "passwordEncoder must not be null");
        this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate must not be null");
        this.enabled = enabled;
        this.password = Objects.requireNonNull(password, "demo seed password must not be null");
        this.resetExistingPassword = resetExistingPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("Local demo user seed is disabled.");
            return;
        }

        validateSeedConfig();
        seedUser(DEMO_CUSTOMER_USER_ID, "customer@swiftdrop.demo", Role.CUSTOMER);
        seedUser(DEMO_MERCHANT_USER_ID, "merchant@swiftdrop.demo", Role.MERCHANT);
        seedUser(DEMO_COURIER_USER_ID, "courier@swiftdrop.demo", Role.DRIVER);
    }

    private void seedUser(UUID userId, String email, Role role) {
        String normalizedEmail = Objects.requireNonNull(
                EmailNormalizer.normalize(email),
                "demo seed email must not be null"
        );
        User existingUser = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);

        if (existingUser == null) {
            jdbcTemplate.update(
                    """
                            INSERT INTO users (
                                id, email, password, role, is_enabled, password_change_required, created_at
                            ) VALUES (?, ?, ?, ?, true, false, CURRENT_TIMESTAMP)
                            """,
                    userId,
                    normalizedEmail,
                    passwordEncoder.encode(password),
                    role.name()
            );
            log.info("Local demo user synchronized for email={}, role={}.", normalizedEmail, role);
            return;
        }

        boolean changed = false;
        boolean passwordReset = false;

        if (!Objects.equals(existingUser.getId(), userId)) {
            log.warn("Local demo user email={} already exists with a different user id; profile linking was not changed.", normalizedEmail);
        }

        if (existingUser.getRole() != role) {
            existingUser.setRole(role);
            changed = true;
        }

        if (!existingUser.isEnabled()) {
            existingUser.setEnabled(true);
            changed = true;
        }

        if (existingUser.isPasswordChangeRequired()) {
            existingUser.setPasswordChangeRequired(false);
            changed = true;
        }

        if (resetExistingPassword) {
            existingUser.setPassword(passwordEncoder.encode(password));
            revokeActiveTokens(existingUser);
            passwordReset = true;
            changed = true;
        }

        if (changed) {
            User savedUser = Objects.requireNonNull(
                    userRepository.save(existingUser),
                    "synchronized demo user must not be null"
            );
            log.info(
                    "Local demo user synchronized for email={}, role={}. Password reset applied={}.",
                    savedUser.getEmail(),
                    role,
                    passwordReset
            );
        }
    }

    private void revokeActiveTokens(User user) {
        if (user.getId() == null) {
            return;
        }

        List<RefreshToken> activeTokens = refreshTokenRepository.findAllByUser_IdAndRevokedFalse(user.getId());
        activeTokens.forEach(refreshToken -> refreshToken.setRevoked(true));
        refreshTokenRepository.saveAll(activeTokens);
    }

    private void validateSeedConfig() {
        if (password.isBlank()) {
            throw new IllegalStateException("Demo seed password cannot be blank.");
        }

        if (password.length() < 8) {
            throw new IllegalStateException("Demo seed password must be at least 8 characters.");
        }
    }
}

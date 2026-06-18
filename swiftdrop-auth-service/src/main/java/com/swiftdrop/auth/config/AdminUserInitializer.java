package com.swiftdrop.auth.config;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class AdminUserInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final String email;
    private final String password;

    public AdminUserInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${application.seed.admin.enabled}") boolean enabled,
            @Value("${application.seed.admin.email}") String email,
            @Value("${application.seed.admin.password}") String password
    ) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository must not be null");
        this.passwordEncoder = Objects.requireNonNull(passwordEncoder, "passwordEncoder must not be null");
        this.enabled = enabled;
        this.email = Objects.requireNonNull(email, "seed admin email must not be null");
        this.password = Objects.requireNonNull(password, "seed admin password must not be null");
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("Local admin seed is disabled.");
            return;
        }

        validateSeedConfig();

        if (userRepository.existsByEmail(email)) {
            log.info("Local admin seed user already exists for email={}. Existing user was not modified.", email);
            return;
        }

        User admin = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.ADMIN)
                .enabled(true)
                .build();

        User savedAdmin = Objects.requireNonNull(userRepository.save(admin), "saved admin user must not be null");
        log.info("Local admin seed user created for email={}.", savedAdmin.getEmail());
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

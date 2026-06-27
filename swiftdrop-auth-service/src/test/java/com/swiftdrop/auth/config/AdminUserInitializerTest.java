package com.swiftdrop.auth.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.swiftdrop.auth.entity.RefreshToken;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.repository.RefreshTokenRepository;
import com.swiftdrop.auth.repository.UserRepository;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class AdminUserInitializerTest {

    private static final UUID ADMIN_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void createsAdminWhenMissing() {
        when(userRepository.findByEmailIgnoreCase("admin@swiftdrop.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Admin123!")).thenReturn("encoded-admin-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0, User.class));

        initializer(true, false, true, true, false).run();

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();
        assertThat(saved.getEmail()).isEqualTo("admin@swiftdrop.com");
        assertThat(saved.getPassword()).isEqualTo("encoded-admin-password");
        assertThat(saved.getRole()).isEqualTo(Role.ADMIN);
        assertThat(saved.isEnabled()).isTrue();
        assertThat(saved.isPasswordChangeRequired()).isFalse();
    }

    @Test
    void doesNotResetExistingPasswordWhenDisabled(CapturedOutput output) {
        User admin = admin("existing-password", Role.ADMIN, true, false);
        when(userRepository.findByEmailIgnoreCase("admin@swiftdrop.com")).thenReturn(Optional.of(admin));

        initializer(true, false, true, true, false).run();

        assertThat(admin.getPassword()).isEqualTo("existing-password");
        verify(passwordEncoder, never()).encode(any());
        verify(refreshTokenRepository, never()).findAllByUser_IdAndRevokedFalse(any());
        verify(userRepository, never()).save(any(User.class));
        assertThat(output).contains("Local admin seed password reset is disabled");
        assertThat(output).doesNotContain("Admin123!");
        assertThat(output).doesNotContain("existing-password");
    }

    @Test
    void resetsExistingPasswordAndRevokesActiveRefreshTokens() {
        User admin = admin("old-password", Role.ADMIN, true, false);
        RefreshToken activeToken = RefreshToken.builder()
                .user(admin)
                .token("refresh-token-value")
                .expiryDate(LocalDateTime.now().plusDays(1))
                .revoked(false)
                .build();
        when(userRepository.findByEmailIgnoreCase("admin@swiftdrop.com")).thenReturn(Optional.of(admin));
        when(passwordEncoder.encode("Admin123!")).thenReturn("encoded-admin-password");
        when(refreshTokenRepository.findAllByUser_IdAndRevokedFalse(ADMIN_ID)).thenReturn(List.of(activeToken));
        when(refreshTokenRepository.saveAll(List.of(activeToken))).thenReturn(List.of(activeToken));
        when(userRepository.save(admin)).thenReturn(admin);

        initializer(true, true, true, true, false).run();

        assertThat(admin.getPassword()).isEqualTo("encoded-admin-password");
        assertThat(activeToken.isRevoked()).isTrue();
        verify(userRepository).save(admin);
    }

    @Test
    void forceEnabledEnablesDisabledExistingAdmin() {
        User admin = admin("existing-password", Role.ADMIN, false, false);
        when(userRepository.findByEmailIgnoreCase("admin@swiftdrop.com")).thenReturn(Optional.of(admin));
        when(userRepository.save(admin)).thenReturn(admin);

        initializer(true, false, true, true, false).run();

        assertThat(admin.isEnabled()).isTrue();
        verify(userRepository).save(admin);
    }

    @Test
    void forceRoleAdminCorrectsWrongRole() {
        User admin = admin("existing-password", Role.CUSTOMER, true, false);
        when(userRepository.findByEmailIgnoreCase("admin@swiftdrop.com")).thenReturn(Optional.of(admin));
        when(userRepository.save(admin)).thenReturn(admin);

        initializer(true, false, true, true, false).run();

        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        verify(userRepository).save(admin);
    }

    @Test
    void forcePasswordChangeSetsConfiguredValue() {
        User admin = admin("existing-password", Role.ADMIN, true, true);
        when(userRepository.findByEmailIgnoreCase("admin@swiftdrop.com")).thenReturn(Optional.of(admin));
        when(userRepository.save(admin)).thenReturn(admin);

        initializer(true, false, true, true, false).run();

        assertThat(admin.isPasswordChangeRequired()).isFalse();
        verify(userRepository).save(admin);
    }

    @Test
    void disabledSeedDoesNothing() {
        initializer(false, true, true, true, false).run();

        verify(userRepository, never()).findByEmailIgnoreCase(any());
        verify(userRepository, never()).save(any(User.class));
    }

    private AdminUserInitializer initializer(
            boolean enabled,
            boolean resetExistingPassword,
            boolean forceEnabled,
            boolean forceRoleAdmin,
            boolean forcePasswordChange
    ) {
        return new AdminUserInitializer(
                userRepository,
                refreshTokenRepository,
                passwordEncoder,
                enabled,
                "Admin@SwiftDrop.COM",
                "Admin123!",
                resetExistingPassword,
                forceEnabled,
                forceRoleAdmin,
                forcePasswordChange
        );
    }

    private User admin(String password, Role role, boolean enabled, boolean passwordChangeRequired) {
        return User.builder()
                .id(ADMIN_ID)
                .email("admin@swiftdrop.com")
                .password(password)
                .role(role)
                .enabled(enabled)
                .passwordChangeRequired(passwordChangeRequired)
                .build();
    }
}

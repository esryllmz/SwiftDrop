package com.swiftdrop.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.swiftdrop.auth.dto.ProvisionUserRequest;
import com.swiftdrop.auth.dto.ProvisionUserResponse;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.exception.InvalidInternalApiKeyException;
import com.swiftdrop.auth.exception.UnsupportedProvisioningRoleException;
import com.swiftdrop.auth.exception.UserRoleConflictException;
import com.swiftdrop.auth.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class InternalUserProvisioningServiceTest {

    private static final String INTERNAL_API_KEY = "test-internal-key";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private InternalUserProvisioningService service;

    @BeforeEach
    void setUp() {
        service = new InternalUserProvisioningService(userRepository, passwordEncoder, INTERNAL_API_KEY, 12);
    }

    @Test
    void provisionRejectsMissingInternalApiKey() {
        ProvisionUserRequest request = new ProvisionUserRequest("merchant.demo@swiftdrop.com", Role.MERCHANT);

        assertThatThrownBy(() -> service.provision(null, request))
                .isInstanceOf(InvalidInternalApiKeyException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void provisionRejectsUnsupportedRole() {
        ProvisionUserRequest request = new ProvisionUserRequest("admin.demo@swiftdrop.com", Role.ADMIN);

        assertThatThrownBy(() -> service.provision(INTERNAL_API_KEY, request))
                .isInstanceOf(UnsupportedProvisioningRoleException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void provisionCreatesMerchantUserWithTemporaryPassword() {
        ProvisionUserRequest request = new ProvisionUserRequest("Merchant.Demo@SwiftDrop.com ", Role.MERCHANT);
        when(userRepository.findByEmail("merchant.demo@swiftdrop.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any(String.class))).thenReturn("encoded-temporary-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
            return user;
        });

        ProvisionUserResponse response = service.provision(INTERNAL_API_KEY, request);

        assertThat(response.userId()).isEqualTo(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        assertThat(response.email()).isEqualTo("merchant.demo@swiftdrop.com");
        assertThat(response.role()).isEqualTo(Role.MERCHANT);
        assertThat(response.enabled()).isTrue();
        assertThat(response.created()).isTrue();
        assertThat(response.temporaryPassword()).isNotBlank().hasSize(12);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getEmail()).isEqualTo("merchant.demo@swiftdrop.com");
        assertThat(savedUser.getRole()).isEqualTo(Role.MERCHANT);
        assertThat(savedUser.getPassword()).isEqualTo("encoded-temporary-password");
        assertThat(savedUser.isEnabled()).isTrue();
    }

    @Test
    void provisionReturnsExistingUserWhenRoleMatches() {
        User existingUser = User.builder()
                .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
                .email("driver.demo@swiftdrop.com")
                .password("existing-password")
                .role(Role.DRIVER)
                .enabled(true)
                .build();
        when(userRepository.findByEmail("driver.demo@swiftdrop.com")).thenReturn(Optional.of(existingUser));

        ProvisionUserResponse response = service.provision(
                INTERNAL_API_KEY,
                new ProvisionUserRequest("driver.demo@swiftdrop.com", Role.DRIVER)
        );

        assertThat(response.userId()).isEqualTo(existingUser.getId());
        assertThat(response.role()).isEqualTo(Role.DRIVER);
        assertThat(response.created()).isFalse();
        assertThat(response.temporaryPassword()).isNull();
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void provisionRejectsExistingUserWithDifferentRole() {
        User existingUser = User.builder()
                .id(UUID.fromString("33333333-3333-3333-3333-333333333333"))
                .email("user.demo@swiftdrop.com")
                .password("existing-password")
                .role(Role.MERCHANT)
                .enabled(true)
                .build();
        when(userRepository.findByEmail("user.demo@swiftdrop.com")).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> service.provision(
                INTERNAL_API_KEY,
                new ProvisionUserRequest("user.demo@swiftdrop.com", Role.DRIVER)
        )).isInstanceOf(UserRoleConflictException.class);

        verify(userRepository, never()).save(any(User.class));
    }
}

package com.swiftdrop.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.ChangePasswordRequest;
import com.swiftdrop.auth.dto.ChangePasswordResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.entity.RefreshToken;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.exception.AuthenticationFailedException;
import com.swiftdrop.auth.mapper.UserMapper;
import com.swiftdrop.auth.repository.RefreshTokenRepository;
import com.swiftdrop.auth.repository.UserRepository;
import com.swiftdrop.auth.service.impl.AuthServiceImpl;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    private static final UUID USER_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(
                userRepository,
                refreshTokenRepository,
                passwordEncoder,
                jwtService,
                new UserMapper(),
                604800000L
        );
    }

    @Test
    void registerCreatesCustomerWithoutPasswordChangeRequirement() {
        when(userRepository.existsByEmail("customer@swiftdrop.com")).thenReturn(false);
        when(passwordEncoder.encode("Customer123")).thenReturn("encoded-customer-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0, User.class);
            user.setId(USER_ID);
            return user;
        });
        when(jwtService.generateToken("customer@swiftdrop.com", "CUSTOMER", false)).thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResult result = service.register(new RegisterRequest("customer@swiftdrop.com", "Customer123"));

        assertThat(result.response().role()).isEqualTo(Role.CUSTOMER);
        assertThat(result.response().passwordChangeRequired()).isFalse();
    }

    @Test
    void loginResponseContainsPasswordChangeRequirement() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(userRepository.findByEmail("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(passwordEncoder.matches("TempPass123", "encoded-temporary-password")).thenReturn(true);
        when(refreshTokenRepository.findAllByUser_IdAndRevokedFalse(USER_ID)).thenReturn(List.of());
        when(jwtService.generateToken("merchant@swiftdrop.com", "MERCHANT", true)).thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResult result = service.login(new LoginRequest("merchant@swiftdrop.com", "TempPass123"));

        assertThat(result.response().role()).isEqualTo(Role.MERCHANT);
        assertThat(result.response().passwordChangeRequired()).isTrue();
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(jwtService.extractEmail("access-token")).thenReturn("merchant@swiftdrop.com");
        when(userRepository.findByEmail("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(jwtService.isTokenValid("access-token", "merchant@swiftdrop.com")).thenReturn(true);
        when(passwordEncoder.matches("Wrong123", "encoded-temporary-password")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(
                "access-token",
                new ChangePasswordRequest("Wrong123", "Merchant123")
        )).isInstanceOf(AuthenticationFailedException.class)
                .hasMessage("Invalid current password");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePasswordRejectsWeakNewPassword() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(jwtService.extractEmail("access-token")).thenReturn("merchant@swiftdrop.com");
        when(userRepository.findByEmail("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(jwtService.isTokenValid("access-token", "merchant@swiftdrop.com")).thenReturn(true);
        when(passwordEncoder.matches("TempPass123", "encoded-temporary-password")).thenReturn(true);

        assertThatThrownBy(() -> service.changePassword(
                "access-token",
                new ChangePasswordRequest("TempPass123", "weakpass")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("New password does not meet requirements");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePasswordSuccessClearsRequirementAndInvalidatesOldPassword() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(jwtService.extractEmail("access-token")).thenReturn("merchant@swiftdrop.com");
        when(userRepository.findByEmail("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(jwtService.isTokenValid("access-token", "merchant@swiftdrop.com")).thenReturn(true);
        when(passwordEncoder.matches("TempPass123", "encoded-temporary-password")).thenReturn(true);
        when(passwordEncoder.encode("Merchant123")).thenReturn("encoded-new-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChangePasswordResponse response = service.changePassword(
                "access-token",
                new ChangePasswordRequest("TempPass123", "Merchant123")
        );

        assertThat(response.passwordChangeRequired()).isFalse();
        assertThat(merchant.getPassword()).isEqualTo("encoded-new-password");
        assertThat(merchant.isPasswordChangeRequired()).isFalse();

        when(userRepository.findByEmail("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(passwordEncoder.matches("TempPass123", "encoded-new-password")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("merchant@swiftdrop.com", "TempPass123")))
                .isInstanceOf(AuthenticationFailedException.class);
    }

    private static User provisionedMerchant(String passwordHash) {
        return User.builder()
                .id(USER_ID)
                .email("merchant@swiftdrop.com")
                .password(passwordHash)
                .role(Role.MERCHANT)
                .enabled(true)
                .passwordChangeRequired(true)
                .build();
    }
}

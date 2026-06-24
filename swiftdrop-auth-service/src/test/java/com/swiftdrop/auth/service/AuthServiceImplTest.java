package com.swiftdrop.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.ChangePasswordRequest;
import com.swiftdrop.auth.dto.ChangePasswordResult;
import com.swiftdrop.auth.dto.ForgotPasswordRequest;
import com.swiftdrop.auth.dto.ForgotPasswordResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.ResetPasswordRequest;
import com.swiftdrop.auth.entity.PasswordResetToken;
import com.swiftdrop.auth.entity.RefreshToken;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.exception.AuthenticationFailedException;
import com.swiftdrop.auth.exception.DuplicateResourceException;
import com.swiftdrop.auth.mapper.UserMapper;
import com.swiftdrop.auth.repository.PasswordResetTokenRepository;
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
    private PasswordResetTokenRepository passwordResetTokenRepository;

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
                passwordResetTokenRepository,
                passwordEncoder,
                jwtService,
                new UserMapper(),
                604800000L,
                15L,
                true
        );
    }

    @Test
    void registerCreatesCustomerWithoutPasswordChangeRequirement() {
        when(userRepository.existsByEmailIgnoreCase("customer@swiftdrop.com")).thenReturn(false);
        when(passwordEncoder.encode("Customer123")).thenReturn("encoded-customer-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = requiredArgument(invocation, 0, User.class);
            user.setId(USER_ID);
            return user;
        });
        when(jwtService.generateToken(USER_ID, "customer@swiftdrop.com", "CUSTOMER", false))
                .thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, RefreshToken.class));

        AuthResult result = service.register(new RegisterRequest("customer@swiftdrop.com", "Customer123"));

        assertThat(result.response().role()).isEqualTo(Role.CUSTOMER);
        assertThat(result.response().passwordChangeRequired()).isFalse();
    }

    @Test
    void registerStoresLowercaseTrimmedEmail() {
        when(userRepository.existsByEmailIgnoreCase("customer@swiftdrop.com")).thenReturn(false);
        when(passwordEncoder.encode("Customer123")).thenReturn("encoded-customer-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = requiredArgument(invocation, 0, User.class);
            user.setId(USER_ID);
            return user;
        });
        when(jwtService.generateToken(USER_ID, "customer@swiftdrop.com", "CUSTOMER", false))
                .thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, RefreshToken.class));

        AuthResult result = service.register(new RegisterRequest("  Customer@SwiftDrop.COM  ", "Customer123"));

        assertThat(result.response().email()).isEqualTo("customer@swiftdrop.com");
        verify(userRepository).existsByEmailIgnoreCase("customer@swiftdrop.com");
    }

    @Test
    void registerRejectsDuplicateEmailWithDifferentCasing() {
        when(userRepository.existsByEmailIgnoreCase("customer@swiftdrop.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register(new RegisterRequest("Customer@SwiftDrop.COM", "Customer123")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Bu email adresi zaten kayitli.");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerRejectsPasswordWithOuterWhitespace() {
        assertThatThrownBy(() -> service.register(new RegisterRequest("customer@swiftdrop.com", "Customer123 ")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must not start or end with whitespace.");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginResponseContainsPasswordChangeRequirement() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(passwordEncoder.matches("TempPass123", "encoded-temporary-password")).thenReturn(true);
        final List<RefreshToken> noActiveTokens = List.of();
        when(refreshTokenRepository.findAllByUser_IdAndRevokedFalse(USER_ID)).thenReturn(noActiveTokens);
        when(refreshTokenRepository.saveAll(noActiveTokens)).thenReturn(noActiveTokens);
        when(jwtService.generateToken(USER_ID, "merchant@swiftdrop.com", "MERCHANT", true))
                .thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, RefreshToken.class));

        AuthResult result = service.login(new LoginRequest("merchant@swiftdrop.com", "TempPass123"));

        assertThat(result.response().role()).isEqualTo(Role.MERCHANT);
        assertThat(result.response().passwordChangeRequired()).isTrue();
    }

    @Test
    void loginAcceptsEmailWithOuterWhitespaceAndUppercase() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(passwordEncoder.matches("TempPass123", "encoded-temporary-password")).thenReturn(true);
        final List<RefreshToken> noActiveTokens = List.of();
        when(refreshTokenRepository.findAllByUser_IdAndRevokedFalse(USER_ID)).thenReturn(noActiveTokens);
        when(refreshTokenRepository.saveAll(noActiveTokens)).thenReturn(noActiveTokens);
        when(jwtService.generateToken(USER_ID, "merchant@swiftdrop.com", "MERCHANT", true))
                .thenReturn("access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, RefreshToken.class));

        AuthResult result = service.login(new LoginRequest("  MERCHANT@SwiftDrop.COM  ", "TempPass123"));

        assertThat(result.response().role()).isEqualTo(Role.MERCHANT);
        verify(userRepository).findByEmailIgnoreCase("merchant@swiftdrop.com");
    }

    @Test
    void loginDoesNotTrimPassword() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(passwordEncoder.matches("TempPass123 ", "encoded-temporary-password")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("merchant@swiftdrop.com", "TempPass123 ")))
                .isInstanceOf(AuthenticationFailedException.class);

        verify(passwordEncoder).matches("TempPass123 ", "encoded-temporary-password");
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(jwtService.extractEmail("access-token")).thenReturn("merchant@swiftdrop.com");
        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
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
        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
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
    void changePasswordRejectsNewPasswordWithOuterWhitespace() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(jwtService.extractEmail("access-token")).thenReturn("merchant@swiftdrop.com");
        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(jwtService.isTokenValid("access-token", "merchant@swiftdrop.com")).thenReturn(true);
        when(passwordEncoder.matches("TempPass123", "encoded-temporary-password")).thenReturn(true);

        assertThatThrownBy(() -> service.changePassword(
                "access-token",
                new ChangePasswordRequest("TempPass123", "Merchant123 ")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must not start or end with whitespace.");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePasswordSuccessClearsRequirementAndInvalidatesOldPassword() {
        User merchant = provisionedMerchant("encoded-temporary-password");
        when(jwtService.extractEmail("access-token")).thenReturn("merchant@swiftdrop.com");
        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(jwtService.isTokenValid("access-token", "merchant@swiftdrop.com")).thenReturn(true);
        when(passwordEncoder.matches("TempPass123", "encoded-temporary-password")).thenReturn(true);
        when(passwordEncoder.encode("Merchant123")).thenReturn("encoded-new-password");
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, User.class));
        final List<RefreshToken> noActiveTokens = List.of();
        when(refreshTokenRepository.findAllByUser_IdAndRevokedFalse(USER_ID)).thenReturn(noActiveTokens);
        when(refreshTokenRepository.saveAll(noActiveTokens)).thenReturn(noActiveTokens);
        when(jwtService.generateToken(USER_ID, "merchant@swiftdrop.com", "MERCHANT", false))
                .thenReturn("new-access-token");
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, RefreshToken.class));

        ChangePasswordResult result = service.changePassword(
                "access-token",
                new ChangePasswordRequest("TempPass123", "Merchant123")
        );

        var response = result.response();
        assertThat(response.accessToken()).isEqualTo("new-access-token");
        assertThat(response.passwordChangeRequired()).isFalse();
        assertThat(merchant.getPassword()).isEqualTo("encoded-new-password");
        assertThat(merchant.isPasswordChangeRequired()).isFalse();

        when(userRepository.findByEmailIgnoreCase("merchant@swiftdrop.com")).thenReturn(Optional.of(merchant));
        when(passwordEncoder.matches("TempPass123", "encoded-new-password")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("merchant@swiftdrop.com", "TempPass123")))
                .isInstanceOf(AuthenticationFailedException.class);
    }

    @Test
    void forgotPasswordExistingCustomerReturnsGenericResponseWithDevToken() {
        User customer = User.builder()
                .id(USER_ID)
                .email("customer@swiftdrop.com")
                .password("encoded-password")
                .role(Role.CUSTOMER)
                .enabled(true)
                .passwordChangeRequired(false)
                .build();
        when(userRepository.findByEmailIgnoreCase("customer@swiftdrop.com")).thenReturn(Optional.of(customer));
        when(passwordResetTokenRepository.findAllByUser_IdAndUsedAtIsNull(USER_ID)).thenReturn(List.of());
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, PasswordResetToken.class));

        ForgotPasswordResponse response = service.forgotPassword(
                new ForgotPasswordRequest("  Customer@SwiftDrop.COM  ", "CUSTOMER")
        );

        assertThat(response.message()).isEqualTo(
                "If an account exists for this portal, password reset instructions will be sent."
        );
        assertThat(response.devResetToken()).isNotBlank();
        assertThat(response.expiresAt()).isNotNull();
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
    }

    @Test
    void forgotPasswordUnknownEmailReturnsGenericResponseWithoutToken() {
        when(userRepository.findByEmailIgnoreCase("missing@swiftdrop.com")).thenReturn(Optional.empty());

        ForgotPasswordResponse response = service.forgotPassword(
                new ForgotPasswordRequest("missing@swiftdrop.com", "CUSTOMER")
        );

        assertThat(response.devResetToken()).isNull();
        assertThat(response.expiresAt()).isNull();
        verify(passwordResetTokenRepository, never()).save(any(PasswordResetToken.class));
    }

    @Test
    void forgotPasswordRoleMismatchReturnsGenericResponseWithoutToken() {
        User driver = provisionedDriver("encoded-password");
        when(userRepository.findByEmailIgnoreCase("driver@swiftdrop.com")).thenReturn(Optional.of(driver));

        ForgotPasswordResponse response = service.forgotPassword(
                new ForgotPasswordRequest("driver@swiftdrop.com", "MERCHANT")
        );

        assertThat(response.devResetToken()).isNull();
        verify(passwordResetTokenRepository, never()).save(any(PasswordResetToken.class));
    }

    @Test
    void resetPasswordWithValidTokenUpdatesPasswordAndRevokesRefreshTokens() {
        User merchant = provisionedMerchant("encoded-old-password");
        RefreshToken refreshToken = RefreshToken.builder().user(merchant).token("refresh").revoked(false).build();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(merchant)
                .tokenHash("hash")
                .expiresAt(Instant.now().plusSeconds(900))
                .build();
        when(passwordResetTokenRepository.findByTokenHashAndUsedAtIsNull(anyString()))
                .thenReturn(Optional.of(resetToken));
        when(passwordEncoder.matches("Merchant123", "encoded-old-password")).thenReturn(false);
        when(passwordEncoder.encode("Merchant123")).thenReturn("encoded-new-password");
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, User.class));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, PasswordResetToken.class));
        when(refreshTokenRepository.findAllByUser_IdAndRevokedFalse(USER_ID)).thenReturn(List.of(refreshToken));
        when(refreshTokenRepository.saveAll(List.of(refreshToken))).thenReturn(List.of(refreshToken));

        var response = service.resetPassword(
                new ResetPasswordRequest("raw-token", "Merchant123", "Merchant123")
        );

        assertThat(response.message()).isEqualTo("Password reset successfully. Please sign in with your new password.");
        assertThat(merchant.getPassword()).isEqualTo("encoded-new-password");
        assertThat(merchant.isPasswordChangeRequired()).isFalse();
        assertThat(resetToken.getUsedAt()).isNotNull();
        assertThat(refreshToken.isRevoked()).isTrue();
    }

    @Test
    void resetPasswordExpiredTokenFailsAndMarksTokenUsed() {
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(provisionedMerchant("encoded-old-password"))
                .tokenHash("hash")
                .expiresAt(Instant.now().minusSeconds(1))
                .build();
        when(passwordResetTokenRepository.findByTokenHashAndUsedAtIsNull(anyString()))
                .thenReturn(Optional.of(resetToken));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> requiredArgument(invocation, 0, PasswordResetToken.class));

        assertThatThrownBy(() -> service.resetPassword(
                new ResetPasswordRequest("raw-token", "Merchant123", "Merchant123")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired password reset token");

        assertThat(resetToken.getUsedAt()).isNotNull();
    }

    @Test
    void resetPasswordWeakPasswordFails() {
        assertThatThrownBy(() -> service.resetPassword(
                new ResetPasswordRequest("raw-token", "weakpass", "weakpass")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("New password does not meet requirements");

        verify(passwordResetTokenRepository, never()).findByTokenHashAndUsedAtIsNull(anyString());
    }

    @Test
    void resetPasswordRejectsNewPasswordWithOuterWhitespace() {
        assertThatThrownBy(() -> service.resetPassword(
                new ResetPasswordRequest("raw-token", "Merchant123 ", "Merchant123 ")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password must not start or end with whitespace.");

        verify(passwordResetTokenRepository, never()).findByTokenHashAndUsedAtIsNull(anyString());
    }

    @Test
    void resetPasswordUsedTokenCannotBeReused() {
        when(passwordResetTokenRepository.findByTokenHashAndUsedAtIsNull(anyString()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.resetPassword(
                new ResetPasswordRequest("raw-token", "Merchant123", "Merchant123")
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired password reset token");
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

    private static User provisionedDriver(String passwordHash) {
        return User.builder()
                .id(USER_ID)
                .email("driver@swiftdrop.com")
                .password(passwordHash)
                .role(Role.DRIVER)
                .enabled(true)
                .passwordChangeRequired(true)
                .build();
    }

    private static <T> T requiredArgument(InvocationOnMock invocation, int index, Class<T> type) {
        return Objects.requireNonNull(
                invocation.getArgument(index, type),
                "mock invocation argument must not be null"
        );
    }
}

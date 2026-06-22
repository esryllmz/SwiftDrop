package com.swiftdrop.auth.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.AuthResponse;
import com.swiftdrop.auth.dto.ChangePasswordRequest;
import com.swiftdrop.auth.dto.ChangePasswordResponse;
import com.swiftdrop.auth.dto.ChangePasswordResult;
import com.swiftdrop.auth.dto.CurrentUserResponse;
import com.swiftdrop.auth.dto.ForgotPasswordRequest;
import com.swiftdrop.auth.dto.ForgotPasswordResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.ResetPasswordRequest;
import com.swiftdrop.auth.dto.ResetPasswordResponse;
import com.swiftdrop.auth.dto.TokenRefreshResult;
import com.swiftdrop.auth.entity.PasswordResetToken;
import com.swiftdrop.auth.entity.RefreshToken;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.exception.AuthenticationFailedException;
import com.swiftdrop.auth.exception.DuplicateResourceException;
import com.swiftdrop.auth.exception.InvalidRefreshTokenException;
import com.swiftdrop.auth.exception.TokenExpiredException;
import com.swiftdrop.auth.mapper.UserMapper;
import com.swiftdrop.auth.repository.PasswordResetTokenRepository;
import com.swiftdrop.auth.repository.RefreshTokenRepository;
import com.swiftdrop.auth.repository.UserRepository;
import com.swiftdrop.auth.service.AuthService;
import com.swiftdrop.auth.service.JwtService;
import com.swiftdrop.auth.util.EmailNormalizer;

import io.jsonwebtoken.JwtException;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final long refreshTokenExpiration;
    private final long passwordResetTokenTtlMinutes;
    private final boolean exposePasswordResetTokenInResponse;
    private final SecureRandom secureRandom;
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int RESET_TOKEN_BYTES = 32;
    private static final String FORGOT_PASSWORD_MESSAGE =
            "If an account exists for this portal, password reset instructions will be sent.";
    private static final String RESET_PASSWORD_SUCCESS_MESSAGE =
            "Password reset successfully. Please sign in with your new password.";

    public AuthServiceImpl(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            UserMapper userMapper,
            @Value("${application.security.jwt.refresh-token.expiration}") long refreshTokenExpiration,
            @Value("${application.password-reset.token-ttl-minutes}") long passwordResetTokenTtlMinutes,
            @Value("${application.password-reset.expose-token-in-response}") boolean exposePasswordResetTokenInResponse
    ) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository must not be null");
        this.refreshTokenRepository = Objects.requireNonNull(refreshTokenRepository, "refreshTokenRepository must not be null");
        this.passwordResetTokenRepository = Objects.requireNonNull(
                passwordResetTokenRepository,
                "passwordResetTokenRepository must not be null"
        );
        this.passwordEncoder = Objects.requireNonNull(passwordEncoder, "passwordEncoder must not be null");
        this.jwtService = Objects.requireNonNull(jwtService, "jwtService must not be null");
        this.userMapper = Objects.requireNonNull(userMapper, "userMapper must not be null");
        this.refreshTokenExpiration = refreshTokenExpiration;
        this.passwordResetTokenTtlMinutes = passwordResetTokenTtlMinutes;
        this.exposePasswordResetTokenInResponse = exposePasswordResetTokenInResponse;
        this.secureRandom = new SecureRandom();
    }

    @Override
    @Transactional
    public AuthResult register(RegisterRequest request) {
        final String normalizedEmail = requireValidEmail(request.email());
        validateRegisterPassword(request.password());

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException("Bu email adresi zaten kayitli.");
        }

        final User user = Objects.requireNonNull(userMapper.toEntity(request), "mapped user must not be null");
        user.setEmail(normalizedEmail);
        user.setRole(Role.CUSTOMER);
        user.setPassword(passwordEncoder.encode(request.password()));
        final User savedUser = Objects.requireNonNull(userRepository.save(user), "saved user must not be null");

        return createAuthResult(savedUser);
    }

    @Override
    @Transactional
    public AuthResult login(LoginRequest request) {
        final String normalizedEmail = requireValidEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new AuthenticationFailedException("Email veya sifre hatali."));

        if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new AuthenticationFailedException("Email veya sifre hatali.");
        }

        revokeActiveTokens(user);
        return createAuthResult(user);
    }

    @Override
    @Transactional
    public TokenRefreshResult refreshToken(String token) {
        final RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new InvalidRefreshTokenException("Gecersiz refresh token."));

        if (refreshToken.isRevoked()) {
            throw new InvalidRefreshTokenException("Refresh token iptal edilmis.");
        }

        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshToken.setRevoked(true);
            Objects.requireNonNull(
                    refreshTokenRepository.save(refreshToken),
                    "revoked expired refresh token must not be null"
            );
            throw new TokenExpiredException("Refresh token suresi dolmus. Lutfen tekrar giris yapin.");
        }

        refreshToken.setRevoked(true);
        final RefreshToken revokedRefreshToken = Objects.requireNonNull(
                refreshTokenRepository.save(refreshToken),
                "revoked refresh token must not be null"
        );

        final User user = Objects.requireNonNull(revokedRefreshToken.getUser(), "refresh token user must not be null");
        final String newAccessToken = jwtService.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.isPasswordChangeRequired()
        );
        final RefreshToken newRefreshToken = createRefreshToken(user);
        return new TokenRefreshResult(
                newAccessToken,
                newRefreshToken.getToken(),
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.isPasswordChangeRequired()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUserFromToken(String accessToken) {
        String email = EmailNormalizer.normalize(extractEmail(accessToken));
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AuthenticationFailedException("Gecersiz access token."));

        if (!jwtService.isTokenValid(accessToken, user.getEmail()) || !user.isEnabled()) {
            throw new AuthenticationFailedException("Gecersiz access token.");
        }

        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.isPasswordChangeRequired()
        );
    }

    @Override
    @Transactional
    public ChangePasswordResult changePassword(String accessToken, ChangePasswordRequest request) {
        ChangePasswordRequest changePasswordRequest = Objects.requireNonNull(
                request,
                "change password request must not be null"
        );
        final User user = findValidUser(accessToken);

        if (!passwordEncoder.matches(changePasswordRequest.currentPassword(), user.getPassword())) {
            throw new AuthenticationFailedException("Invalid current password");
        }

        validateNewPassword(changePasswordRequest.currentPassword(), changePasswordRequest.newPassword());

        user.setPassword(passwordEncoder.encode(changePasswordRequest.newPassword()));
        user.setPasswordChangeRequired(false);
        final User savedUser = Objects.requireNonNull(
                userRepository.save(user),
                "changed password user must not be null"
        );
        revokeActiveTokens(savedUser);
        final String newAccessToken = jwtService.generateToken(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.isPasswordChangeRequired()
        );
        final RefreshToken newRefreshToken = createRefreshToken(savedUser);

        return new ChangePasswordResult(
                new ChangePasswordResponse(
                        newAccessToken,
                        "Bearer",
                        savedUser.getId(),
                        savedUser.getEmail(),
                        savedUser.getRole(),
                        savedUser.isPasswordChangeRequired(),
                        "Password changed successfully."
                ),
                newRefreshToken.getToken(),
                refreshTokenExpiration / 1000
        );
    }

    @Override
    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        ForgotPasswordRequest forgotPasswordRequest = Objects.requireNonNull(
                request,
                "forgot password request must not be null"
        );
        final Role requestedRole = resolvePortalRole(forgotPasswordRequest.portal());
        final String email = requireValidEmail(forgotPasswordRequest.email());
        final Instant expiresAt = Instant.now().plusSeconds(passwordResetTokenTtlMinutes * 60);

        return userRepository.findByEmailIgnoreCase(email)
                .filter(User::isEnabled)
                .filter(user -> user.getRole() == requestedRole)
                .map(user -> createPasswordResetResponse(user, expiresAt))
                .orElseGet(() -> new ForgotPasswordResponse(FORGOT_PASSWORD_MESSAGE, null, null));
    }

    @Override
    @Transactional
    public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
        ResetPasswordRequest resetPasswordRequest = Objects.requireNonNull(
                request,
                "reset password request must not be null"
        );
        validateResetPasswordRequest(resetPasswordRequest);

        final String tokenHash = hashToken(resetPasswordRequest.token());
        final PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHashAndUsedAtIsNull(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired password reset token"));

        final Instant now = Instant.now();
        if (resetToken.getExpiresAt().isBefore(now)) {
            resetToken.setUsedAt(now);
            passwordResetTokenRepository.save(resetToken);
            throw new IllegalArgumentException("Invalid or expired password reset token");
        }

        final User user = Objects.requireNonNull(resetToken.getUser(), "password reset user must not be null");
        if (!user.isEnabled()) {
            throw new IllegalArgumentException("Invalid or expired password reset token");
        }

        if (passwordEncoder.matches(resetPasswordRequest.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(resetPasswordRequest.newPassword()));
        user.setPasswordChangeRequired(false);
        resetToken.setUsedAt(now);
        userRepository.save(user);
        passwordResetTokenRepository.save(resetToken);
        revokeActiveTokens(user);

        return new ResetPasswordResponse(RESET_PASSWORD_SUCCESS_MESSAGE);
    }

    @Override
    @Transactional
    public void logout(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        refreshTokenRepository.findByToken(token).ifPresent(refreshToken -> {
            final RefreshToken tokenToRevoke = Objects.requireNonNull(
                    refreshToken,
                    "logout refresh token must not be null"
            );
            tokenToRevoke.setRevoked(true);
            Objects.requireNonNull(
                    refreshTokenRepository.save(tokenToRevoke),
                    "logout refresh token must not be null"
            );
        });
    }

    private AuthResult createAuthResult(User user) {
        String accessToken = jwtService.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.isPasswordChangeRequired()
        );
        RefreshToken refreshToken = createRefreshToken(user);
        AuthResponse response = userMapper.toAuthResponse(user, accessToken);
        return new AuthResult(response, refreshToken.getToken(), refreshTokenExpiration / 1000);
    }

    private void revokeActiveTokens(User user) {
        final List<RefreshToken> activeTokens = refreshTokenRepository.findAllByUser_IdAndRevokedFalse(user.getId());
        activeTokens.forEach(refreshToken -> refreshToken.setRevoked(true));
        refreshTokenRepository.saveAll(activeTokens);
    }

    private RefreshToken createRefreshToken(User user) {
        final RefreshToken refreshTokenToSave = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(LocalDateTime.now().plusNanos(refreshTokenExpiration * 1_000_000))
                .revoked(false)
                .build();
        final RefreshToken savedRefreshToken = Objects.requireNonNull(
                refreshTokenRepository.save(refreshTokenToSave),
                "saved refresh token must not be null"
        );
        return savedRefreshToken;
    }

    private User findValidUser(String accessToken) {
        String email = EmailNormalizer.normalize(extractEmail(accessToken));
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AuthenticationFailedException("Gecersiz access token."));

        if (!jwtService.isTokenValid(accessToken, user.getEmail()) || !user.isEnabled()) {
            throw new AuthenticationFailedException("Gecersiz access token.");
        }

        return user;
    }

    private void validateNewPassword(String currentPassword, String newPassword) {
        if (Objects.equals(currentPassword, newPassword)) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        validatePasswordOuterWhitespace(newPassword);

        if (!meetsPasswordPolicy(newPassword)) {
            throw new IllegalArgumentException("New password does not meet requirements");
        }
    }

    private boolean meetsPasswordPolicy(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            return false;
        }

        boolean hasUppercase = false;
        boolean hasLowercase = false;
        boolean hasDigit = false;
        for (int i = 0; i < password.length(); i++) {
            char character = password.charAt(i);
            hasUppercase = hasUppercase || Character.isUpperCase(character);
            hasLowercase = hasLowercase || Character.isLowerCase(character);
            hasDigit = hasDigit || Character.isDigit(character);
        }

        return hasUppercase && hasLowercase && hasDigit;
    }

    private ForgotPasswordResponse createPasswordResetResponse(User user, Instant expiresAt) {
        revokeUnusedPasswordResetTokens(user);
        final String rawToken = generateRawResetToken();
        final PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .tokenHash(hashToken(rawToken))
                .expiresAt(expiresAt)
                .build();
        passwordResetTokenRepository.save(resetToken);

        return new ForgotPasswordResponse(
                FORGOT_PASSWORD_MESSAGE,
                exposePasswordResetTokenInResponse ? rawToken : null,
                expiresAt
        );
    }

    private void revokeUnusedPasswordResetTokens(User user) {
        final Instant now = Instant.now();
        final List<PasswordResetToken> activeTokens =
                passwordResetTokenRepository.findAllByUser_IdAndUsedAtIsNull(user.getId());
        activeTokens.forEach(resetToken -> resetToken.setUsedAt(now));
        passwordResetTokenRepository.saveAll(activeTokens);
    }

    private void validateResetPasswordRequest(ResetPasswordRequest request) {
        if (!Objects.equals(request.newPassword(), request.confirmPassword())) {
            throw new IllegalArgumentException("New password and confirmation do not match");
        }

        validatePasswordOuterWhitespace(request.newPassword());

        if (!meetsPasswordPolicy(request.newPassword())) {
            throw new IllegalArgumentException("New password does not meet requirements");
        }
    }

    private Role resolvePortalRole(String portal) {
        final String normalizedPortal = Objects.requireNonNull(portal, "portal must not be null")
                .trim()
                .toUpperCase(Locale.ROOT);
        return switch (normalizedPortal) {
            case "CUSTOMER" -> Role.CUSTOMER;
            case "MERCHANT" -> Role.MERCHANT;
            case "COURIER" -> Role.DRIVER;
            case "STAFF" -> Role.ADMIN;
            default -> throw new IllegalArgumentException("Invalid password reset portal");
        };
    }

    private String generateRawResetToken() {
        byte[] tokenBytes = new byte[RESET_TOKEN_BYTES];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashedBytes = digest.digest(
                    Objects.requireNonNull(rawToken, "password reset token must not be null")
                            .getBytes(StandardCharsets.UTF_8)
            );
            StringBuilder builder = new StringBuilder(hashedBytes.length * 2);
            for (byte hashedByte : hashedBytes) {
                builder.append(String.format("%02x", hashedByte & 0xff));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available.", ex);
        }
    }

    private String requireValidEmail(String email) {
        String normalizedEmail = EmailNormalizer.normalize(Objects.requireNonNull(email, "email must not be null"));
        if (!EmailNormalizer.isValidNormalizedEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Enter a valid email address.");
        }
        return normalizedEmail;
    }

    private void validateRegisterPassword(String password) {
        validatePasswordOuterWhitespace(password);
    }

    private void validatePasswordOuterWhitespace(String password) {
        if (password != null && !Objects.equals(password, password.trim())) {
            throw new IllegalArgumentException("Password must not start or end with whitespace.");
        }
    }

    private String extractEmail(String accessToken) {
        try {
            return jwtService.extractEmail(accessToken);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AuthenticationFailedException("Gecersiz access token.");
        }
    }
}

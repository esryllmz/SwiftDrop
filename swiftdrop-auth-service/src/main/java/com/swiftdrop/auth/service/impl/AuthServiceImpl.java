package com.swiftdrop.auth.service.impl;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.auth.dto.AuthResult;
import com.swiftdrop.auth.dto.AuthResponse;
import com.swiftdrop.auth.dto.CurrentUserResponse;
import com.swiftdrop.auth.dto.LoginRequest;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.dto.TokenRefreshResult;
import com.swiftdrop.auth.entity.RefreshToken;
import com.swiftdrop.auth.entity.Role;
import com.swiftdrop.auth.entity.User;
import com.swiftdrop.auth.exception.AuthenticationFailedException;
import com.swiftdrop.auth.exception.DuplicateResourceException;
import com.swiftdrop.auth.exception.InvalidRefreshTokenException;
import com.swiftdrop.auth.exception.TokenExpiredException;
import com.swiftdrop.auth.mapper.UserMapper;
import com.swiftdrop.auth.repository.RefreshTokenRepository;
import com.swiftdrop.auth.repository.UserRepository;
import com.swiftdrop.auth.service.AuthService;
import com.swiftdrop.auth.service.JwtService;

import io.jsonwebtoken.JwtException;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final long refreshTokenExpiration;

    public AuthServiceImpl(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            UserMapper userMapper,
            @Value("${application.security.jwt.refresh-token.expiration}") long refreshTokenExpiration
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    @Override
    @Transactional
    public AuthResult register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Bu email adresi zaten kayitli.");
        }

        User user = userMapper.toEntity(request);
        user.setRole(Role.CUSTOMER);
        user.setPassword(passwordEncoder.encode(request.password()));
        User savedUser = userRepository.save(user);

        return createAuthResult(savedUser);
    }

    @Override
    @Transactional
    public AuthResult login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
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
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new InvalidRefreshTokenException("Gecersiz refresh token."));

        if (refreshToken.isRevoked()) {
            throw new InvalidRefreshTokenException("Refresh token iptal edilmis.");
        }

        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new TokenExpiredException("Refresh token suresi dolmus. Lutfen tekrar giris yapin.");
        }

        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        User user = refreshToken.getUser();
        String newAccessToken = jwtService.generateToken(user.getEmail(), user.getRole().name());
        RefreshToken newRefreshToken = createRefreshToken(user);
        return new TokenRefreshResult(
                newAccessToken,
                newRefreshToken.getToken(),
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUserFromToken(String accessToken) {
        String email = extractEmail(accessToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthenticationFailedException("Gecersiz access token."));

        if (!jwtService.isTokenValid(accessToken, user.getEmail()) || !user.isEnabled()) {
            throw new AuthenticationFailedException("Gecersiz access token.");
        }

        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled()
        );
    }

    @Override
    @Transactional
    public void logout(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        refreshTokenRepository.findByToken(token).ifPresent(refreshToken -> {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
        });
    }

    private AuthResult createAuthResult(User user) {
        String accessToken = jwtService.generateToken(user.getEmail(), user.getRole().name());
        RefreshToken refreshToken = createRefreshToken(user);
        AuthResponse response = userMapper.toAuthResponse(user, accessToken);
        return new AuthResult(response, refreshToken.getToken(), refreshTokenExpiration / 1000);
    }

    private void revokeActiveTokens(User user) {
        refreshTokenRepository.findAllByUser_IdAndRevokedFalse(user.getId())
                .forEach(refreshToken -> refreshToken.setRevoked(true));
    }

    private RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(LocalDateTime.now().plusNanos(refreshTokenExpiration * 1_000_000))
                .revoked(false)
                .build();
        return refreshTokenRepository.save(refreshToken);
    }

    private String extractEmail(String accessToken) {
        try {
            return jwtService.extractEmail(accessToken);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AuthenticationFailedException("Gecersiz access token.");
        }
    }
}

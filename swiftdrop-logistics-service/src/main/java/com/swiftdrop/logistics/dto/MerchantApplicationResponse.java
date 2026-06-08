package com.swiftdrop.logistics.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.swiftdrop.logistics.entity.ApplicationStatus;

public record MerchantApplicationResponse(
        UUID id,
        String businessName,
        String contactEmail,
        String message,
        ApplicationStatus status,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        String reviewNote
) {
}

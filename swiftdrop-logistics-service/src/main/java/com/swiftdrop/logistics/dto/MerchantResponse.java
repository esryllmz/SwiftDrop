package com.swiftdrop.logistics.dto;

import java.util.UUID;

public record MerchantResponse(
        UUID id,
        UUID userId,
        String name,
        double latitude,
        double longitude
) {
}

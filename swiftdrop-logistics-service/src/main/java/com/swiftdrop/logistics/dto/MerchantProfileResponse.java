package com.swiftdrop.logistics.dto;

import java.util.UUID;

public record MerchantProfileResponse(
        UUID userId,
        String email,
        String role,
        UUID merchantId,
        String businessName,
        String name,
        double latitude,
        double longitude,
        long totalOrders,
        long activeOrders
) {
}

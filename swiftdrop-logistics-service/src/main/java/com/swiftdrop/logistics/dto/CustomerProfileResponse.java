package com.swiftdrop.logistics.dto;

import java.util.UUID;

public record CustomerProfileResponse(
        UUID userId,
        String email,
        String role,
        String phone,
        boolean profileComplete,
        long totalOrders,
        long activeOrders,
        long deliveredOrders
) {
}

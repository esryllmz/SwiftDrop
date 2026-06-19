package com.swiftdrop.logistics.dto;

import java.util.UUID;

public record CustomerProfileResponse(
        UUID userId,
        String email,
        String role,
        long totalOrders,
        long activeOrders,
        long deliveredOrders
) {
}

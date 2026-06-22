package com.swiftdrop.logistics.dto;

import java.util.UUID;

public record CustomerMerchantOptionResponse(
        UUID id,
        String name,
        String locationLabel
) {
}

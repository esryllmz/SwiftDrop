package com.swiftdrop.logistics.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.swiftdrop.logistics.entity.AddressLabel;

public record CustomerAddressResponse(
        UUID id,
        AddressLabel label,
        String recipientName,
        String phone,
        String addressLine,
        String district,
        String city,
        String postalCode,
        String deliveryNotes,
        boolean isDefault,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

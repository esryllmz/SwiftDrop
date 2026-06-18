package com.swiftdrop.logistics.dto;

public record CourierApplicationReviewResponse(
        CourierApplicationResponse application,
        ProvisionedAccountResponse provisionedAccount
) {
}

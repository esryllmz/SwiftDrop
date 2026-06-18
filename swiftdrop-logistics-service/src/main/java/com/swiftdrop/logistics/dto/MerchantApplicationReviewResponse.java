package com.swiftdrop.logistics.dto;

public record MerchantApplicationReviewResponse(
        MerchantApplicationResponse application,
        ProvisionedAccountResponse provisionedAccount
) {
}

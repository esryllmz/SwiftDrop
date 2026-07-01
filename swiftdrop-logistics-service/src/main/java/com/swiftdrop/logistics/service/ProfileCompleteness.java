package com.swiftdrop.logistics.service;

import com.swiftdrop.logistics.entity.CustomerProfile;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.Merchant;

public final class ProfileCompleteness {

    private ProfileCompleteness() {
    }

    public static boolean isMerchantComplete(Merchant merchant) {
        return merchant != null
                && isNotBlank(merchant.getPhone())
                && isNotBlank(merchant.getAddressLine())
                && isNotBlank(merchant.getDistrict())
                && isNotBlank(merchant.getCity())
                && merchant.getAveragePreparationMinutes() != null;
    }

    public static boolean isCourierComplete(Driver driver) {
        return driver != null
                && isNotBlank(driver.getPhone())
                && driver.getVehicleType() != null
                && isNotBlank(driver.getServiceZone())
                && driver.getMaxActiveAssignments() > 0;
    }

    public static boolean isCustomerComplete(CustomerProfile profile, boolean hasDefaultAddress) {
        return profile != null && isNotBlank(profile.getPhone()) && hasDefaultAddress;
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}

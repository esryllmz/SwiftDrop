package com.swiftdrop.logistics.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.entity.CourierApplication;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.repository.CourierApplicationRepository;
import com.swiftdrop.logistics.repository.DriverRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class DriverEmailBackfillInitializer implements CommandLineRunner {

    private final DriverRepository driverRepository;
    private final CourierApplicationRepository courierApplicationRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int updated = 0;
        for (Driver driver : driverRepository.findAll()) {
            if (driver.getEmail() != null && !driver.getEmail().isBlank()) {
                continue;
            }

            CourierApplication application = courierApplicationRepository.findByProvisionedUserId(driver.getUserId())
                    .orElse(null);
            if (application == null || application.getContactEmail() == null || application.getContactEmail().isBlank()) {
                continue;
            }

            driver.setEmail(application.getContactEmail());
            driverRepository.save(driver);
            updated++;
        }

        if (updated > 0) {
            log.info("Backfilled courier email for {} driver profiles.", updated);
        }
    }
}

package com.swiftdrop.logistics.config;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@ConditionalOnProperty(name = "application.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final String DRIVER_GEO_KEY = "drivers:locations";
    private static final UUID BURGER_LAB_ID = uuid("11111111-1111-1111-1111-111111111111");
    private static final UUID NEAR_DRIVER_ID = uuid("22222222-2222-2222-2222-222222222222");
    private static final UUID FAR_DRIVER_ID = uuid("33333333-3333-3333-3333-333333333333");

    private final MerchantRepository merchantRepository;
    private final DriverRepository driverRepository;
    private final StringRedisTemplate redisTemplate;

    @Override
    public void run(String... args) {
        final Merchant burgerLab = findOrCreateMerchant();
        final Driver nearDriver = findOrCreateDriver(NEAR_DRIVER_ID, this::saveNearDriver);
        final Driver farDriver = findOrCreateDriver(FAR_DRIVER_ID, this::saveFarDriver);

        var geoOperations = Objects.requireNonNull(redisTemplate.opsForGeo(), "Redis Geo operations must not be null");
        final String nearDriverMember = Objects.requireNonNull(
                nearDriver.getId().toString(),
                "near driver Geo member must not be null"
        );
        final String farDriverMember = Objects.requireNonNull(
                farDriver.getId().toString(),
                "far driver Geo member must not be null"
        );
        geoOperations.add(DRIVER_GEO_KEY, new Point(29.0260, 41.0205), nearDriverMember);
        geoOperations.add(DRIVER_GEO_KEY, new Point(29.2300, 40.8900), farDriverMember);

        log.info("Seed data loaded. merchantId={}, nearDriverId={}, farDriverId={}",
                burgerLab.getId(), nearDriver.getId(), farDriver.getId());
    }

    private static UUID uuid(String value) {
        final UUID seedUuid = UUID.fromString(value);
        return Objects.requireNonNull(seedUuid, "seed UUID must not be null");
    }

    private Merchant findOrCreateMerchant() {
        final Optional<Merchant> existingMerchant = merchantRepository.findById(BURGER_LAB_ID);
        if (existingMerchant.isPresent()) {
            return Objects.requireNonNull(existingMerchant.get(), "seed merchant must not be null");
        }
        return saveBurgerLabMerchant();
    }

    private Driver findOrCreateDriver(UUID driverId, java.util.function.Supplier<Driver> creator) {
        final Optional<Driver> existingDriver = driverRepository.findById(driverId);
        if (existingDriver.isPresent()) {
            return Objects.requireNonNull(existingDriver.get(), "seed driver must not be null");
        }
        return Objects.requireNonNull(creator.get(), "created seed driver must not be null");
    }

    private Merchant saveBurgerLabMerchant() {
        Merchant merchant = Merchant.builder()
                .id(BURGER_LAB_ID)
                .userId(UUID.randomUUID())
                .name("Burger Lab Kadikoy")
                .latitude(41.0200)
                .longitude(29.0250)
                .build();
        Merchant savedMerchant = Objects.requireNonNull(merchantRepository.save(merchant), "saved merchant must not be null");
        return savedMerchant;
    }

    private Driver saveNearDriver() {
        Driver driver = Driver.builder()
                .id(NEAR_DRIVER_ID)
                .userId(UUID.randomUUID())
                .fullName("Ahmet Yilmaz (Yakin Kurye)")
                .status(DriverStatus.AVAILABLE)
                .build();
        Driver savedDriver = Objects.requireNonNull(driverRepository.save(driver), "saved near driver must not be null");
        return savedDriver;
    }

    private Driver saveFarDriver() {
        Driver driver = Driver.builder()
                .id(FAR_DRIVER_ID)
                .userId(UUID.randomUUID())
                .fullName("Mehmet Demir (Uzak Kurye)")
                .status(DriverStatus.AVAILABLE)
                .build();
        Driver savedDriver = Objects.requireNonNull(driverRepository.save(driver), "saved far driver must not be null");
        return savedDriver;
    }
}

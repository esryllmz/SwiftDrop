package com.swiftdrop.logistics.config;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.VehicleType;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@ConditionalOnProperty(name = "application.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final UUID BURGER_LAB_ID = uuid("11111111-1111-1111-1111-111111111111");
    private static final UUID NEAR_DRIVER_ID = uuid("22222222-2222-2222-2222-222222222222");
    private static final UUID FAR_DRIVER_ID = uuid("33333333-3333-3333-3333-333333333333");
    private static final UUID DEMO_MERCHANT_USER_ID = uuid("55555555-5555-5555-5555-555555555555");
    private static final UUID DEMO_COURIER_USER_ID = uuid("66666666-6666-6666-6666-666666666666");

    private final MerchantRepository merchantRepository;
    private final DriverRepository driverRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        final Merchant burgerLab = findOrCreateMerchant();
        final Driver nearDriver = findOrCreateDriver(
                NEAR_DRIVER_ID,
                DEMO_COURIER_USER_ID,
                "Demo Courier",
                "courier@swiftdrop.demo",
                "+90 555 111 11 11",
                VehicleType.MOTORBIKE,
                "Kadikoy",
                this::saveNearDriver
        );
        final Driver farDriver = findOrCreateDriver(
                FAR_DRIVER_ID,
                uuid("77777777-7777-7777-7777-777777777777"),
                "Backup Demo Courier",
                "demo.courier.far@swiftdrop.local",
                "+90 555 222 22 22",
                VehicleType.CAR,
                "Besiktas",
                this::saveFarDriver
        );

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
            Merchant merchant = Objects.requireNonNull(existingMerchant.get(), "seed merchant must not be null");
            boolean changed = false;
            if (!Objects.equals(merchant.getUserId(), DEMO_MERCHANT_USER_ID)) {
                merchant.setUserId(DEMO_MERCHANT_USER_ID);
                changed = true;
            }
            if (!Objects.equals(merchant.getName(), "SwiftDrop Demo Merchant")) {
                merchant.setName("SwiftDrop Demo Merchant");
                changed = true;
            }
            if (merchant.getPhone() == null || merchant.getPhone().isBlank()) {
                merchant.setPhone("+90 555 000 00 00");
                changed = true;
            }
            if (merchant.getAddressLine() == null || merchant.getAddressLine().isBlank()) {
                merchant.setAddressLine("Bahariye Caddesi No:1");
                changed = true;
            }
            if (merchant.getDistrict() == null || merchant.getDistrict().isBlank()) {
                merchant.setDistrict("Kadikoy");
                changed = true;
            }
            if (merchant.getCity() == null || merchant.getCity().isBlank()) {
                merchant.setCity("Istanbul");
                changed = true;
            }
            if (merchant.getAveragePreparationMinutes() == null) {
                merchant.setAveragePreparationMinutes(20);
                changed = true;
            }
            if (!merchant.isAcceptingOrders()) {
                merchant.setAcceptingOrders(true);
                changed = true;
            }
            if (changed) {
                return Objects.requireNonNull(merchantRepository.save(merchant), "updated seed merchant must not be null");
            }
            return merchant;
        }
        return saveBurgerLabMerchant();
    }

    private Driver findOrCreateDriver(
            UUID driverId,
            UUID userId,
            String fullName,
            String email,
            String phone,
            VehicleType vehicleType,
            String serviceZone,
            java.util.function.Supplier<Driver> creator
    ) {
        final Optional<Driver> existingDriver = driverRepository.findById(driverId);
        if (existingDriver.isPresent()) {
            Driver driver = Objects.requireNonNull(existingDriver.get(), "seed driver must not be null");
            boolean changed = false;
            if (!Objects.equals(driver.getUserId(), userId)) {
                driver.setUserId(userId);
                changed = true;
            }
            if (!Objects.equals(driver.getFullName(), fullName)) {
                driver.setFullName(fullName);
                changed = true;
            }
            if (driver.getEmail() == null || driver.getEmail().isBlank()) {
                driver.setEmail(email);
                changed = true;
            }
            if (driver.getStatus() != DriverStatus.AVAILABLE) {
                driver.setStatus(DriverStatus.AVAILABLE);
                changed = true;
            }
            if (driver.getPhone() == null || driver.getPhone().isBlank()) {
                driver.setPhone(phone);
                changed = true;
            }
            if (driver.getVehicleType() == null) {
                driver.setVehicleType(vehicleType);
                changed = true;
            }
            if (driver.getServiceZone() == null || driver.getServiceZone().isBlank()) {
                driver.setServiceZone(serviceZone);
                changed = true;
            }
            if (driver.getMaxActiveAssignments() <= 0) {
                driver.setMaxActiveAssignments(3);
                changed = true;
            }
            if (changed) {
                return Objects.requireNonNull(driverRepository.save(driver), "updated seed driver must not be null");
            }
            return driver;
        }
        return Objects.requireNonNull(creator.get(), "created seed driver must not be null");
    }

    private Merchant saveBurgerLabMerchant() {
        Merchant merchant = Merchant.builder()
                .id(BURGER_LAB_ID)
                .userId(DEMO_MERCHANT_USER_ID)
                .name("SwiftDrop Demo Merchant")
                .latitude(41.0200)
                .longitude(29.0250)
                .phone("+90 555 000 00 00")
                .addressLine("Bahariye Caddesi No:1")
                .district("Kadikoy")
                .city("Istanbul")
                .averagePreparationMinutes(20)
                .acceptingOrders(true)
                .build();
        jdbcTemplate.update(
                "INSERT INTO merchants (id, user_id, name, latitude, longitude, phone, address_line, district, "
                        + "city, average_preparation_minutes, accepting_orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                merchant.getId(),
                merchant.getUserId(),
                merchant.getName(),
                merchant.getLatitude(),
                merchant.getLongitude(),
                merchant.getPhone(),
                merchant.getAddressLine(),
                merchant.getDistrict(),
                merchant.getCity(),
                merchant.getAveragePreparationMinutes(),
                merchant.isAcceptingOrders()
        );
        return merchant;
    }

    private Driver saveNearDriver() {
        Driver driver = Driver.builder()
                .id(NEAR_DRIVER_ID)
                .userId(DEMO_COURIER_USER_ID)
                .fullName("Demo Courier")
                .email("courier@swiftdrop.demo")
                .status(DriverStatus.AVAILABLE)
                .phone("+90 555 111 11 11")
                .vehicleType(VehicleType.MOTORBIKE)
                .serviceZone("Kadikoy")
                .maxActiveAssignments(3)
                .build();
        insertDriver(driver);
        return driver;
    }

    private Driver saveFarDriver() {
        Driver driver = Driver.builder()
                .id(FAR_DRIVER_ID)
                .userId(uuid("77777777-7777-7777-7777-777777777777"))
                .fullName("Backup Demo Courier")
                .email("demo.courier.far@swiftdrop.local")
                .status(DriverStatus.AVAILABLE)
                .phone("+90 555 222 22 22")
                .vehicleType(VehicleType.CAR)
                .serviceZone("Besiktas")
                .maxActiveAssignments(3)
                .build();
        insertDriver(driver);
        return driver;
    }

    private void insertDriver(Driver driver) {
        jdbcTemplate.update(
                "INSERT INTO drivers (id, user_id, full_name, email, status, phone, vehicle_type, "
                        + "service_zone, max_active_assignments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                driver.getId(),
                driver.getUserId(),
                driver.getFullName(),
                driver.getEmail(),
                driver.getStatus().name(),
                driver.getPhone(),
                driver.getVehicleType().name(),
                driver.getServiceZone(),
                driver.getMaxActiveAssignments()
        );
    }
}

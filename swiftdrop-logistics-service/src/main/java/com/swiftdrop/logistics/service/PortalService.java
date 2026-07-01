package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.CourierProfileResponse;
import com.swiftdrop.logistics.dto.CancelOrderRequest;
import com.swiftdrop.logistics.dto.CreateCustomerAddressRequest;
import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.CustomerAddressResponse;
import com.swiftdrop.logistics.dto.CustomerMerchantOptionResponse;
import com.swiftdrop.logistics.dto.CustomerProfileResponse;
import com.swiftdrop.logistics.dto.MerchantProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.UpdateCourierAvailabilityRequest;
import com.swiftdrop.logistics.dto.UpdateCourierProfileRequest;
import com.swiftdrop.logistics.dto.UpdateCustomerAddressRequest;
import com.swiftdrop.logistics.dto.UpdateCustomerProfileRequest;
import com.swiftdrop.logistics.dto.UpdateMerchantProfileRequest;
import com.swiftdrop.logistics.entity.CustomerAddress;
import com.swiftdrop.logistics.entity.CustomerProfile;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.exception.InvalidOrderTransitionException;
import com.swiftdrop.logistics.exception.OperationalProfileIncompleteException;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.CustomerAddressRepository;
import com.swiftdrop.logistics.repository.CustomerProfileRepository;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.OrderRepository;
import com.swiftdrop.logistics.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PortalService {

    private static final List<OrderStatus> ACTIVE_COURIER_STATUSES = List.of(
            OrderStatus.DRIVER_ASSIGNED,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.PICKED_UP,
            OrderStatus.ON_THE_WAY
    );
    private static final UUID DEMO_MERCHANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private final MerchantRepository merchantRepository;
    private final DriverRepository driverRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerAddressRepository customerAddressRepository;

    @Transactional(readOnly = true)
    public CustomerProfileResponse getCustomerProfile(AuthenticatedUser user) {
        UUID customerId = user.userId();
        long totalOrders = orderRepository.countByCustomerId(customerId);
        long deliveredOrders = orderRepository.countByCustomerIdAndStatus(customerId, OrderStatus.DELIVERED);
        CustomerProfile profile = customerProfileRepository.findByUserId(customerId).orElse(null);
        boolean hasDefaultAddress = customerAddressRepository
                .findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(customerId)
                .isPresent();

        return new CustomerProfileResponse(
                user.userId(),
                user.email(),
                user.role(),
                profile != null ? profile.getPhone() : null,
                ProfileCompleteness.isCustomerComplete(profile, hasDefaultAddress),
                totalOrders,
                totalOrders - deliveredOrders,
                deliveredOrders
        );
    }

    @Transactional
    public CustomerProfileResponse updateCustomerProfile(AuthenticatedUser user, UpdateCustomerProfileRequest request) {
        CustomerProfile profile = customerProfileRepository.findByUserId(user.userId())
                .orElseGet(() -> CustomerProfile.builder().userId(user.userId()).build());
        profile.setPhone(request.phone());
        customerProfileRepository.save(profile);

        return getCustomerProfile(user);
    }

    @Transactional(readOnly = true)
    public List<CustomerAddressResponse> findCustomerAddresses(AuthenticatedUser user) {
        return customerAddressRepository
                .findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(user.userId())
                .stream()
                .map(this::toAddressResponse)
                .toList();
    }

    @Transactional
    public CustomerAddressResponse createCustomerAddress(AuthenticatedUser user, CreateCustomerAddressRequest request) {
        boolean isFirstAddress = customerAddressRepository
                .findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(user.userId())
                .isEmpty();

        CustomerAddress address = CustomerAddress.builder()
                .customerId(user.userId())
                .label(request.label())
                .recipientName(request.recipientName())
                .phone(request.phone())
                .addressLine(request.addressLine())
                .district(request.district())
                .city(request.city())
                .postalCode(request.postalCode())
                .deliveryNotes(request.deliveryNotes())
                .isDefault(isFirstAddress)
                .isActive(true)
                .build();

        CustomerAddress saved = Objects.requireNonNull(
                customerAddressRepository.save(address),
                "saved customer address must not be null"
        );
        return toAddressResponse(saved);
    }

    @Transactional
    public CustomerAddressResponse updateCustomerAddress(
            AuthenticatedUser user,
            UUID addressId,
            UpdateCustomerAddressRequest request
    ) {
        CustomerAddress address = findOwnedAddress(user.userId(), addressId);
        address.setLabel(request.label());
        address.setRecipientName(request.recipientName());
        address.setPhone(request.phone());
        address.setAddressLine(request.addressLine());
        address.setDistrict(request.district());
        address.setCity(request.city());
        address.setPostalCode(request.postalCode());
        address.setDeliveryNotes(request.deliveryNotes());

        CustomerAddress saved = Objects.requireNonNull(
                customerAddressRepository.save(address),
                "updated customer address must not be null"
        );
        return toAddressResponse(saved);
    }

    @Transactional
    public void deleteCustomerAddress(AuthenticatedUser user, UUID addressId) {
        CustomerAddress address = findOwnedAddress(user.userId(), addressId);
        boolean wasDefault = address.isDefault();
        address.setActive(false);
        address.setDefault(false);
        customerAddressRepository.save(address);

        if (wasDefault) {
            customerAddressRepository
                    .findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(user.userId())
                    .stream()
                    .findFirst()
                    .ifPresent(next -> {
                        next.setDefault(true);
                        customerAddressRepository.save(next);
                    });
        }
    }

    @Transactional
    public CustomerAddressResponse setDefaultCustomerAddress(AuthenticatedUser user, UUID addressId) {
        CustomerAddress address = findOwnedAddress(user.userId(), addressId);
        customerAddressRepository
                .findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(user.userId())
                .filter(current -> !Objects.equals(current.getId(), addressId))
                .ifPresent(current -> {
                    current.setDefault(false);
                    customerAddressRepository.save(current);
                });

        address.setDefault(true);
        CustomerAddress saved = Objects.requireNonNull(
                customerAddressRepository.save(address),
                "updated default customer address must not be null"
        );
        return toAddressResponse(saved);
    }

    private CustomerAddress findOwnedAddress(UUID customerId, UUID addressId) {
        CustomerAddress address = customerAddressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery address was not found."));
        if (!address.isActive()) {
            throw new ResourceNotFoundException("Delivery address was not found.");
        }
        return address;
    }

    private CustomerAddressResponse toAddressResponse(CustomerAddress address) {
        return new CustomerAddressResponse(
                address.getId(),
                address.getLabel(),
                address.getRecipientName(),
                address.getPhone(),
                address.getAddressLine(),
                address.getDistrict(),
                address.getCity(),
                address.getPostalCode(),
                address.getDeliveryNotes(),
                address.isDefault(),
                address.getCreatedAt(),
                address.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findCustomerOrders(AuthenticatedUser user) {
        return orderService.findCustomerOrders(user.userId());
    }

    @Transactional(readOnly = true)
    public OrderResponse findCustomerOrder(AuthenticatedUser user, UUID orderId) {
        return orderService.findCustomerOrder(user.userId(), orderId);
    }

    @Transactional(readOnly = true)
    public List<CustomerMerchantOptionResponse> findCustomerMerchantOptions() {
        return merchantRepository.findCustomerMerchantOptions().stream()
                .map(this::toCustomerMerchantOption)
                .sorted((left, right) -> Boolean.compare(
                        !DEMO_MERCHANT_ID.equals(left.id()),
                        !DEMO_MERCHANT_ID.equals(right.id())
                ))
                .toList();
    }

    @Transactional
    public OrderResponse createCustomerOrder(AuthenticatedUser user, CreateCustomerOrderRequest request) {
        return orderService.createCustomerOrder(user.userId(), request);
    }

    @Transactional
    public OrderResponse cancelCustomerOrder(AuthenticatedUser user, UUID orderId, CancelOrderRequest request) {
        return orderService.cancelCustomerOrder(user.userId(), orderId, request);
    }

    @Transactional(readOnly = true)
    public MerchantProfileResponse getMerchantProfile(AuthenticatedUser user) {
        Merchant merchant = findMerchant(user.userId());
        return toMerchantProfile(user, merchant);
    }

    @Transactional
    public MerchantProfileResponse updateMerchantProfile(AuthenticatedUser user, UpdateMerchantProfileRequest request) {
        Merchant merchant = findMerchant(user.userId());
        merchant.setPhone(request.phone());
        merchant.setAddressLine(request.addressLine());
        merchant.setDistrict(request.district());
        merchant.setCity(request.city());
        merchant.setDescription(request.description());
        merchant.setAcceptingOrders(Boolean.TRUE.equals(request.acceptingOrders()));
        merchant.setAveragePreparationMinutes(request.averagePreparationMinutes());

        Merchant saved = Objects.requireNonNull(merchantRepository.save(merchant), "updated merchant must not be null");
        return toMerchantProfile(user, saved);
    }

    private MerchantProfileResponse toMerchantProfile(AuthenticatedUser user, Merchant merchant) {
        UUID merchantId = merchant.getId();
        long totalOrders = orderRepository.countByMerchant_Id(merchantId);
        long deliveredOrders = orderRepository.countByMerchant_IdAndStatus(merchantId, OrderStatus.DELIVERED);

        return new MerchantProfileResponse(
                user.userId(),
                user.email(),
                user.role(),
                merchantId,
                merchant.getName(),
                merchant.getName(),
                merchant.getLatitude(),
                merchant.getLongitude(),
                merchant.getPhone(),
                merchant.getAddressLine(),
                merchant.getDistrict(),
                merchant.getCity(),
                merchant.getDescription(),
                merchant.isAcceptingOrders(),
                merchant.getAveragePreparationMinutes(),
                ProfileCompleteness.isMerchantComplete(merchant),
                totalOrders,
                totalOrders - deliveredOrders
        );
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findMerchantOrders(AuthenticatedUser user) {
        Merchant merchant = findMerchant(user.userId());
        return orderService.findMerchantOrders(merchant.getId());
    }

    @Transactional(readOnly = true)
    public OrderResponse findMerchantOrder(AuthenticatedUser user, UUID orderId) {
        Merchant merchant = findMerchant(user.userId());
        return orderService.findMerchantOrder(merchant.getId(), orderId);
    }

    @Transactional
    public OrderResponse markMerchantOrderPreparing(AuthenticatedUser user, UUID orderId) {
        Merchant merchant = requireCompleteMerchant(user.userId());
        return orderService.markMerchantOrderPreparing(merchant.getId(), orderId);
    }

    @Transactional
    public OrderResponse markMerchantOrderReadyForPickup(AuthenticatedUser user, UUID orderId) {
        Merchant merchant = requireCompleteMerchant(user.userId());
        return orderService.markMerchantOrderReadyForPickup(merchant.getId(), orderId);
    }

    private Merchant requireCompleteMerchant(UUID userId) {
        Merchant merchant = findMerchant(userId);
        if (!ProfileCompleteness.isMerchantComplete(merchant)) {
            throw new OperationalProfileIncompleteException(
                    "Complete your store profile before processing orders.");
        }
        return merchant;
    }

    @Transactional
    public OrderResponse cancelMerchantOrder(AuthenticatedUser user, UUID orderId, CancelOrderRequest request) {
        Merchant merchant = findMerchant(user.userId());
        return orderService.cancelMerchantOrder(merchant.getId(), orderId, request);
    }

    @Transactional(readOnly = true)
    public CourierProfileResponse getCourierProfile(AuthenticatedUser user) {
        Driver driver = findDriver(user.userId());
        return toCourierProfile(user, driver);
    }

    @Transactional
    public CourierProfileResponse updateCourierProfile(AuthenticatedUser user, UpdateCourierProfileRequest request) {
        Driver driver = findDriver(user.userId());
        driver.setPhone(request.phone());
        driver.setVehicleType(request.vehicleType());
        driver.setServiceZone(request.serviceZone());
        driver.setMaxActiveAssignments(request.maxActiveAssignments());

        Driver saved = Objects.requireNonNull(driverRepository.save(driver), "updated driver must not be null");
        return toCourierProfile(user, saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findCourierAssignments(AuthenticatedUser user) {
        Driver driver = findDriver(user.userId());
        return orderService.findDriverAssignments(driver.getId());
    }

    @Transactional(readOnly = true)
    public OrderResponse findCourierAssignment(AuthenticatedUser user, UUID orderId) {
        Driver driver = findDriver(user.userId());
        return orderService.findDriverAssignment(driver.getId(), orderId);
    }

    @Transactional
    public CourierProfileResponse updateCourierAvailability(
            AuthenticatedUser user,
            UpdateCourierAvailabilityRequest request
    ) {
        Driver driver = findDriver(user.userId());
        DriverStatus requestedStatus = request.status();

        if (requestedStatus == DriverStatus.BUSY) {
            throw new IllegalArgumentException("Courier cannot set BUSY availability directly.");
        }

        if (requestedStatus == DriverStatus.OFFLINE
                && orderRepository.countByDriver_IdAndStatusIn(driver.getId(), ACTIVE_COURIER_STATUSES) > 0) {
            throw new InvalidOrderTransitionException("Courier has active assignments and cannot go offline.");
        }

        driver.setStatus(requestedStatus);
        Driver savedDriver = Objects.requireNonNull(driverRepository.save(driver), "updated driver must not be null");

        return toCourierProfile(user, savedDriver);
    }

    @Transactional
    public OrderResponse markCourierOrderPickedUp(AuthenticatedUser user, UUID orderId) {
        Driver driver = findDriver(user.userId());
        return orderService.markCourierOrderPickedUp(driver.getId(), orderId);
    }

    @Transactional
    public OrderResponse markCourierOrderOnTheWay(AuthenticatedUser user, UUID orderId) {
        Driver driver = findDriver(user.userId());
        return orderService.markCourierOrderOnTheWay(driver.getId(), orderId);
    }

    @Transactional
    public OrderResponse markCourierOrderDelivered(AuthenticatedUser user, UUID orderId) {
        Driver driver = findDriver(user.userId());
        return orderService.markCourierOrderDelivered(driver.getId(), orderId);
    }

    private Merchant findMerchant(UUID userId) {
        return merchantRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant profile not found."));
    }

    private Driver findDriver(UUID userId) {
        return driverRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Courier profile not found."));
    }

    private CustomerMerchantOptionResponse toCustomerMerchantOption(
            MerchantRepository.CustomerMerchantOptionView merchant
    ) {
        String merchantName = merchant.getName();
        String displayName = merchantName == null || merchantName.isBlank()
                ? "Unnamed merchant"
                : merchantName.trim();

        return new CustomerMerchantOptionResponse(
                merchant.getId(),
                displayName,
                null
        );
    }

    private CourierProfileResponse toCourierProfile(AuthenticatedUser user, Driver driver) {
        UUID driverId = driver.getId();
        long activeAssignments = orderRepository.countByDriver_IdAndStatusIn(driverId, ACTIVE_COURIER_STATUSES);
        long deliveredOrders = orderRepository.countByDriver_IdAndStatus(driverId, OrderStatus.DELIVERED);

        return new CourierProfileResponse(
                user.userId(),
                user.email(),
                user.role(),
                driverId,
                driver.getFullName(),
                driver.getStatus(),
                driver.getPhone(),
                driver.getVehicleType(),
                driver.getServiceZone(),
                driver.getMaxActiveAssignments(),
                ProfileCompleteness.isCourierComplete(driver),
                activeAssignments,
                deliveredOrders
        );
    }
}

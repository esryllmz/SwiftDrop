package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.CourierProfileResponse;
import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.CustomerMerchantOptionResponse;
import com.swiftdrop.logistics.dto.CustomerProfileResponse;
import com.swiftdrop.logistics.dto.MerchantProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.UpdateCourierAvailabilityRequest;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.exception.InvalidOrderTransitionException;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.OrderRepository;
import com.swiftdrop.logistics.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PortalService {

    private final MerchantRepository merchantRepository;
    private final DriverRepository driverRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    @Transactional(readOnly = true)
    public CustomerProfileResponse getCustomerProfile(AuthenticatedUser user) {
        UUID customerId = user.userId();
        long totalOrders = orderRepository.countByCustomerId(customerId);
        long deliveredOrders = orderRepository.countByCustomerIdAndStatus(customerId, OrderStatus.DELIVERED);

        return new CustomerProfileResponse(
                user.userId(),
                user.email(),
                user.role(),
                totalOrders,
                totalOrders - deliveredOrders,
                deliveredOrders
        );
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findCustomerOrders(AuthenticatedUser user) {
        return orderService.findCustomerOrders(user.userId());
    }

    @Transactional(readOnly = true)
    public List<CustomerMerchantOptionResponse> findCustomerMerchantOptions() {
        return merchantRepository.findCustomerMerchantOptions().stream()
                .map(this::toCustomerMerchantOption)
                .toList();
    }

    @Transactional
    public OrderResponse createCustomerOrder(AuthenticatedUser user, CreateCustomerOrderRequest request) {
        return orderService.createCustomerOrder(user.userId(), request);
    }

    @Transactional(readOnly = true)
    public MerchantProfileResponse getMerchantProfile(AuthenticatedUser user) {
        Merchant merchant = findMerchant(user.userId());
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
                totalOrders,
                totalOrders - deliveredOrders
        );
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findMerchantOrders(AuthenticatedUser user) {
        Merchant merchant = findMerchant(user.userId());
        return orderService.findMerchantOrders(merchant.getId());
    }

    @Transactional
    public OrderResponse markMerchantOrderPreparing(AuthenticatedUser user, UUID orderId) {
        Merchant merchant = findMerchant(user.userId());
        return orderService.markMerchantOrderPreparing(merchant.getId(), orderId);
    }

    @Transactional
    public OrderResponse markMerchantOrderReadyForPickup(AuthenticatedUser user, UUID orderId) {
        Merchant merchant = findMerchant(user.userId());
        return orderService.markMerchantOrderReadyForPickup(merchant.getId(), orderId);
    }

    @Transactional(readOnly = true)
    public CourierProfileResponse getCourierProfile(AuthenticatedUser user) {
        Driver driver = findDriver(user.userId());
        return toCourierProfile(user, driver);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findCourierAssignments(AuthenticatedUser user) {
        Driver driver = findDriver(user.userId());
        return orderService.findDriverAssignments(driver.getId());
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
                && orderRepository.countByDriver_IdAndStatusNot(driver.getId(), OrderStatus.DELIVERED) > 0) {
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
        long totalAssignments = orderRepository.countByDriver_Id(driverId);
        long deliveredOrders = orderRepository.countByDriver_IdAndStatus(driverId, OrderStatus.DELIVERED);

        return new CourierProfileResponse(
                user.userId(),
                user.email(),
                user.role(),
                driverId,
                driver.getFullName(),
                driver.getStatus(),
                totalAssignments - deliveredOrders,
                deliveredOrders
        );
    }
}

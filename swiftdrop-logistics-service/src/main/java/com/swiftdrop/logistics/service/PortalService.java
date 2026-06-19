package com.swiftdrop.logistics.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.CourierProfileResponse;
import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.CustomerProfileResponse;
import com.swiftdrop.logistics.dto.MerchantProfileResponse;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.OrderStatus;
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

    @Transactional(readOnly = true)
    public CourierProfileResponse getCourierProfile(AuthenticatedUser user) {
        Driver driver = findDriver(user.userId());
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

    @Transactional(readOnly = true)
    public List<OrderResponse> findCourierAssignments(AuthenticatedUser user) {
        Driver driver = findDriver(user.userId());
        return orderService.findDriverAssignments(driver.getId());
    }

    private Merchant findMerchant(UUID userId) {
        return merchantRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant profile not found."));
    }

    private Driver findDriver(UUID userId) {
        return driverRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Courier profile not found."));
    }
}

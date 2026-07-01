package com.swiftdrop.logistics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.swiftdrop.logistics.dto.CreateCustomerAddressRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.UpdateCustomerAddressRequest;
import com.swiftdrop.logistics.entity.AddressLabel;
import com.swiftdrop.logistics.entity.CustomerAddress;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.exception.OperationalProfileIncompleteException;
import com.swiftdrop.logistics.exception.ResourceNotFoundException;
import com.swiftdrop.logistics.repository.CustomerAddressRepository;
import com.swiftdrop.logistics.repository.CustomerProfileRepository;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.OrderRepository;
import com.swiftdrop.logistics.security.AuthenticatedUser;

@ExtendWith(MockitoExtension.class)
class PortalServiceTest {

    @Mock
    private MerchantRepository merchantRepository;
    @Mock
    private DriverRepository driverRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderService orderService;
    @Mock
    private CustomerProfileRepository customerProfileRepository;
    @Mock
    private CustomerAddressRepository customerAddressRepository;

    private PortalService portalService;

    @BeforeEach
    void setUp() {
        portalService = new PortalService(
                merchantRepository,
                driverRepository,
                orderRepository,
                orderService,
                customerProfileRepository,
                customerAddressRepository
        );
    }

    @Test
    void markMerchantOrderPreparing_withIncompleteProfile_throwsWithoutCallingOrderService() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        AuthenticatedUser user = new AuthenticatedUser(userId, "merchant@example.com", "MERCHANT");
        Merchant incompleteMerchant = Merchant.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .name("Incomplete Store")
                .latitude(0)
                .longitude(0)
                .build();
        when(merchantRepository.findByUserId(userId)).thenReturn(Optional.of(incompleteMerchant));

        assertThatThrownBy(() -> portalService.markMerchantOrderPreparing(user, orderId))
                .isInstanceOf(OperationalProfileIncompleteException.class);

        verify(orderService, never()).markMerchantOrderPreparing(any(), any());
    }

    @Test
    void markMerchantOrderPreparing_withCompleteProfile_delegatesToOrderService() {
        UUID userId = UUID.randomUUID();
        UUID merchantId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        AuthenticatedUser user = new AuthenticatedUser(userId, "merchant@example.com", "MERCHANT");
        Merchant completeMerchant = Merchant.builder()
                .id(merchantId)
                .userId(userId)
                .name("Complete Store")
                .latitude(41.0)
                .longitude(29.0)
                .phone("+90 555 000 00 00")
                .addressLine("Test address")
                .district("Kadikoy")
                .city("Istanbul")
                .averagePreparationMinutes(20)
                .acceptingOrders(true)
                .build();
        when(merchantRepository.findByUserId(userId)).thenReturn(Optional.of(completeMerchant));
        OrderResponse expected = new OrderResponse(
                orderId, UUID.randomUUID(), null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null
        );
        when(orderService.markMerchantOrderPreparing(merchantId, orderId)).thenReturn(expected);

        OrderResponse result = portalService.markMerchantOrderPreparing(user, orderId);

        assertThat(result).isEqualTo(expected);
        verify(orderService).markMerchantOrderPreparing(merchantId, orderId);
    }

    @Test
    void updateCustomerAddress_forAddressOwnedByAnotherCustomer_throwsResourceNotFound() {
        UUID callerId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        AuthenticatedUser user = new AuthenticatedUser(callerId, "customer@example.com", "CUSTOMER");
        when(customerAddressRepository.findByIdAndCustomerId(addressId, callerId)).thenReturn(Optional.empty());

        UpdateCustomerAddressRequest request = new UpdateCustomerAddressRequest(
                AddressLabel.HOME, "Someone", "+90 555", "Line", "District", "City", null, null
        );

        assertThatThrownBy(() -> portalService.updateCustomerAddress(user, addressId, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deleteCustomerAddress_whenDeletingDefault_promotesNextAddressToDefault() {
        UUID callerId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        UUID otherAddressId = UUID.randomUUID();
        AuthenticatedUser user = new AuthenticatedUser(callerId, "customer@example.com", "CUSTOMER");
        CustomerAddress deletedAddress = CustomerAddress.builder()
                .id(addressId).customerId(callerId).recipientName("A").addressLine("Line A")
                .district("D").city("C").isDefault(true).isActive(true).build();
        CustomerAddress otherAddress = CustomerAddress.builder()
                .id(otherAddressId).customerId(callerId).recipientName("B").addressLine("Line B")
                .district("D").city("C").isDefault(false).isActive(true).build();

        when(customerAddressRepository.findByIdAndCustomerId(addressId, callerId)).thenReturn(Optional.of(deletedAddress));
        when(customerAddressRepository.findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(callerId))
                .thenReturn(java.util.List.of(otherAddress));

        portalService.deleteCustomerAddress(user, addressId);

        assertThat(deletedAddress.isActive()).isFalse();
        assertThat(deletedAddress.isDefault()).isFalse();
        assertThat(otherAddress.isDefault()).isTrue();
    }

    @Test
    void createCustomerAddress_firstAddress_isAutomaticallyDefault() {
        UUID callerId = UUID.randomUUID();
        AuthenticatedUser user = new AuthenticatedUser(callerId, "customer@example.com", "CUSTOMER");
        when(customerAddressRepository.findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(callerId))
                .thenReturn(java.util.List.of());
        when(customerAddressRepository.save(any(CustomerAddress.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateCustomerAddressRequest request = new CreateCustomerAddressRequest(
                AddressLabel.HOME, "Recipient", "+90 555", "Line", "District", "City", null, null
        );

        var response = portalService.createCustomerAddress(user, request);

        assertThat(response.isDefault()).isTrue();
    }
}

package com.swiftdrop.logistics.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

import com.swiftdrop.logistics.dto.CreateCustomerOrderRequest;
import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.entity.CustomerAddress;
import com.swiftdrop.logistics.entity.CustomerProfile;
import com.swiftdrop.logistics.entity.Driver;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.entity.Order;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.entity.OrderStatusHistory;
import com.swiftdrop.logistics.entity.VehicleType;
import com.swiftdrop.logistics.exception.OperationalProfileIncompleteException;
import com.swiftdrop.logistics.repository.CustomerAddressRepository;
import com.swiftdrop.logistics.repository.CustomerProfileRepository;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.OrderRepository;
import com.swiftdrop.logistics.repository.OrderStatusHistoryRepository;
import com.swiftdrop.logistics.service.OrderStatusTransitionPolicy;
import com.swiftdrop.logistics.service.OutboxService;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private MerchantRepository merchantRepository;
    @Mock
    private DriverRepository driverRepository;
    @Mock
    private OrderStatusHistoryRepository orderStatusHistoryRepository;
    @Mock
    private OutboxService outboxService;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private CustomerProfileRepository customerProfileRepository;
    @Mock
    private CustomerAddressRepository customerAddressRepository;
    @Mock
    private RLock lock;

    private OrderServiceImpl service;

    @BeforeEach
    void setUp() throws InterruptedException {
        service = new OrderServiceImpl(
                orderRepository,
                merchantRepository,
                driverRepository,
                orderStatusHistoryRepository,
                new OrderStatusTransitionPolicy(),
                outboxService,
                redissonClient,
                customerProfileRepository,
                customerAddressRepository
        );
        ReflectionTestUtils.setField(service, "demoCourierId", UUID.randomUUID());

        lenient().when(redissonClient.getLock(anyString())).thenReturn(lock);
        lenient().when(lock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        lenient().when(lock.isHeldByCurrentThread()).thenReturn(true);
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order order = inv.getArgument(0);
            if (order.getId() == null) {
                order.setId(UUID.randomUUID());
            }
            return order;
        });
        lenient().when(driverRepository.save(any(Driver.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(orderStatusHistoryRepository.save(any(OrderStatusHistory.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---- Customer order creation guards ----

    @Test
    void createCustomerOrder_withoutProfile_throwsOperationalProfileIncomplete() {
        UUID customerId = UUID.randomUUID();
        when(customerProfileRepository.findByUserId(customerId)).thenReturn(Optional.empty());
        when(customerAddressRepository.findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(customerId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createCustomerOrder(
                customerId,
                new CreateCustomerOrderRequest(UUID.randomUUID(), BigDecimal.TEN, null)
        )).isInstanceOf(OperationalProfileIncompleteException.class);

        verifyNoInteractions(merchantRepository);
    }

    @Test
    void createCustomerOrder_withPhoneButNoDefaultAddress_throwsOperationalProfileIncomplete() {
        UUID customerId = UUID.randomUUID();
        when(customerProfileRepository.findByUserId(customerId))
                .thenReturn(Optional.of(CustomerProfile.builder().userId(customerId).phone("+90 555 111 11 11").build()));
        when(customerAddressRepository.findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(customerId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createCustomerOrder(
                customerId,
                new CreateCustomerOrderRequest(UUID.randomUUID(), BigDecimal.TEN, null)
        )).isInstanceOf(OperationalProfileIncompleteException.class);
    }

    @Test
    void createCustomerOrder_withCompleteProfile_snapshotsDefaultAddressOntoOrder() {
        UUID customerId = UUID.randomUUID();
        UUID merchantId = UUID.randomUUID();
        CustomerAddress defaultAddress = completeAddress(customerId);
        when(customerProfileRepository.findByUserId(customerId))
                .thenReturn(Optional.of(CustomerProfile.builder().userId(customerId).phone("+90 555 111 11 11").build()));
        when(customerAddressRepository.findByCustomerIdAndIsDefaultTrueAndIsActiveTrue(customerId))
                .thenReturn(Optional.of(defaultAddress));
        when(merchantRepository.findById(merchantId)).thenReturn(Optional.of(completeMerchant(merchantId, "Kadikoy")));
        when(driverRepository.findByStatus(DriverStatus.AVAILABLE)).thenReturn(List.of());

        OrderResponse response = service.createCustomerOrder(
                customerId,
                new CreateCustomerOrderRequest(merchantId, BigDecimal.TEN, null)
        );

        assertThat(response.status()).isEqualTo(OrderStatus.PLACED);
        assertThat(response.deliveryDistrict()).isEqualTo("Kadikoy");
        assertThat(response.deliveryCity()).isEqualTo("Istanbul");
        verify(outboxService).saveOrderEvent(eq("ORDER_PLACED"), any(), any(), any(), any());
    }

    @Test
    void createOrder_forNonAcceptingMerchant_throwsOperationalProfileIncomplete() {
        UUID merchantId = UUID.randomUUID();
        Merchant merchant = completeMerchant(merchantId, "Kadikoy");
        merchant.setAcceptingOrders(false);
        when(merchantRepository.findById(merchantId)).thenReturn(Optional.of(merchant));

        assertThatThrownBy(() -> service.createOrder(
                new OrderCreateRequest(UUID.randomUUID(), merchantId, BigDecimal.TEN)
        )).isInstanceOf(OperationalProfileIncompleteException.class);

        verifyNoInteractions(customerProfileRepository);
    }

    // ---- Assignment engine ----

    @Test
    void attemptAssignment_forCancelledOrder_returnsFalseWithoutQueryingDrivers() {
        UUID orderId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).status(OrderStatus.CANCELLED).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThat(service.attemptAssignment(orderId)).isFalse();
        verifyNoInteractions(driverRepository);
    }

    @Test
    void attemptAssignment_forAlreadyAssignedOrder_returnsFalseWithoutQueryingDrivers() {
        UUID orderId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).status(OrderStatus.DRIVER_ASSIGNED)
                .driver(Driver.builder().id(UUID.randomUUID()).build()).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThat(service.attemptAssignment(orderId)).isFalse();
        verifyNoInteractions(driverRepository);
    }

    @Test
    void attemptAssignment_withNoEligibleCourier_returnsFalseAndLeavesOrderUnassigned() {
        UUID orderId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).status(OrderStatus.PLACED)
                .merchant(completeMerchant(UUID.randomUUID(), "Kadikoy")).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(driverRepository.findByStatus(DriverStatus.AVAILABLE)).thenReturn(List.of());

        assertThat(service.attemptAssignment(orderId)).isFalse();
        assertThat(order.getDriver()).isNull();
    }

    @Test
    void attemptAssignment_excludesProfileIncompleteAndOverCapacityCouriers() {
        UUID orderId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).status(OrderStatus.PLACED)
                .merchant(completeMerchant(UUID.randomUUID(), "Kadikoy")).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        Driver incomplete = Driver.builder().id(UUID.randomUUID()).status(DriverStatus.AVAILABLE)
                .maxActiveAssignments(3).build();
        Driver atCapacity = completeDriver("Kadikoy");
        atCapacity.setMaxActiveAssignments(1);
        Driver eligible = completeDriver("Kadikoy");

        when(driverRepository.findByStatus(DriverStatus.AVAILABLE))
                .thenReturn(List.of(incomplete, atCapacity, eligible));
        lenient().when(orderRepository.countByDriver_IdAndStatusIn(eq(atCapacity.getId()), any())).thenReturn(1L);
        lenient().when(orderRepository.countByDriver_IdAndStatusIn(eq(eligible.getId()), any())).thenReturn(0L);
        when(driverRepository.findById(eligible.getId())).thenReturn(Optional.of(eligible));

        assertThat(service.attemptAssignment(orderId)).isTrue();
        assertThat(order.getDriver()).isEqualTo(eligible);
        verify(driverRepository, never()).findById(incomplete.getId());
        verify(driverRepository, never()).findById(atCapacity.getId());
    }

    @Test
    void attemptAssignment_prefersSameZoneOverDifferentZone() {
        UUID orderId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).status(OrderStatus.PLACED)
                .merchant(completeMerchant(UUID.randomUUID(), "Kadikoy")).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        Driver sameZone = completeDriver("Kadikoy");
        Driver otherZone = completeDriver("Besiktas");

        when(driverRepository.findByStatus(DriverStatus.AVAILABLE)).thenReturn(List.of(otherZone, sameZone));
        lenient().when(orderRepository.countByDriver_IdAndStatusIn(eq(sameZone.getId()), any())).thenReturn(0L);
        when(driverRepository.findById(sameZone.getId())).thenReturn(Optional.of(sameZone));

        assertThat(service.attemptAssignment(orderId)).isTrue();
        assertThat(order.getDriver()).isEqualTo(sameZone);
        verify(driverRepository, never()).findById(otherZone.getId());
    }

    @Test
    void attemptAssignment_sortsCandidatesByLowestActiveWorkload() {
        UUID orderId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).status(OrderStatus.PLACED)
                .merchant(completeMerchant(UUID.randomUUID(), "Kadikoy")).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        Driver busy = completeDriver("Kadikoy");
        Driver idle = completeDriver("Kadikoy");

        when(driverRepository.findByStatus(DriverStatus.AVAILABLE)).thenReturn(List.of(busy, idle));
        when(orderRepository.countByDriver_IdAndStatusIn(eq(busy.getId()), any())).thenReturn(2L);
        when(orderRepository.countByDriver_IdAndStatusIn(eq(idle.getId()), any())).thenReturn(0L);
        when(driverRepository.findById(idle.getId())).thenReturn(Optional.of(idle));

        assertThat(service.attemptAssignment(orderId)).isTrue();
        assertThat(order.getDriver()).isEqualTo(idle);
        verify(driverRepository, never()).findById(busy.getId());
    }

    @Test
    void attemptAssignment_lateAssignmentToPreparingOrder_doesNotRegressStatus() {
        UUID orderId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).status(OrderStatus.PREPARING)
                .merchant(completeMerchant(UUID.randomUUID(), "Kadikoy")).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        Driver eligible = completeDriver("Kadikoy");
        when(driverRepository.findByStatus(DriverStatus.AVAILABLE)).thenReturn(List.of(eligible));
        when(orderRepository.countByDriver_IdAndStatusIn(eq(eligible.getId()), any())).thenReturn(0L);
        when(driverRepository.findById(eligible.getId())).thenReturn(Optional.of(eligible));

        assertThat(service.attemptAssignment(orderId)).isTrue();
        assertThat(order.getDriver()).isEqualTo(eligible);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PREPARING);
        verify(outboxService, times(1)).saveOrderEvent(eq("ORDER_DRIVER_ASSIGNED"), any(), any(), any(), any());
    }

    private Merchant completeMerchant(UUID id, String district) {
        return Merchant.builder()
                .id(id)
                .userId(UUID.randomUUID())
                .name("Test Merchant")
                .latitude(41.0)
                .longitude(29.0)
                .phone("+90 555 000 00 00")
                .addressLine("Test address")
                .district(district)
                .city("Istanbul")
                .averagePreparationMinutes(20)
                .acceptingOrders(true)
                .build();
    }

    private Driver completeDriver(String zone) {
        return Driver.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .fullName("Test Courier")
                .email("courier@example.com")
                .status(DriverStatus.AVAILABLE)
                .phone("+90 555 111 11 11")
                .vehicleType(VehicleType.MOTORBIKE)
                .serviceZone(zone)
                .maxActiveAssignments(3)
                .build();
    }

    private CustomerAddress completeAddress(UUID customerId) {
        return CustomerAddress.builder()
                .id(UUID.randomUUID())
                .customerId(customerId)
                .recipientName("Test Customer")
                .addressLine("Test street")
                .district("Kadikoy")
                .city("Istanbul")
                .isDefault(true)
                .isActive(true)
                .build();
    }
}

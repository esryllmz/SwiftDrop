package com.swiftdrop.logistics.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.swiftdrop.logistics.entity.OrderActorType;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.exception.InvalidOrderTransitionException;

class OrderStatusTransitionPolicyTest {

    private final OrderStatusTransitionPolicy policy = new OrderStatusTransitionPolicy();

    @Test
    void merchantCanPrepareAndMarkReadyButCannotUpdateAfterReady() {
        assertThatCode(() -> policy.assertTransition(
                OrderStatus.PLACED,
                OrderStatus.PREPARING,
                OrderActorType.MERCHANT
        )).doesNotThrowAnyException();
        assertThatCode(() -> policy.assertTransition(
                OrderStatus.PREPARING,
                OrderStatus.READY_FOR_PICKUP,
                OrderActorType.MERCHANT
        )).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.assertTransition(
                OrderStatus.READY_FOR_PICKUP,
                OrderStatus.PICKED_UP,
                OrderActorType.MERCHANT
        )).isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void courierLifecycleRequiresOnTheWayBeforeDelivered() {
        assertThatCode(() -> policy.assertTransition(
                OrderStatus.READY_FOR_PICKUP,
                OrderStatus.PICKED_UP,
                OrderActorType.COURIER
        )).doesNotThrowAnyException();
        assertThatCode(() -> policy.assertTransition(
                OrderStatus.PICKED_UP,
                OrderStatus.ON_THE_WAY,
                OrderActorType.COURIER
        )).doesNotThrowAnyException();
        assertThatCode(() -> policy.assertTransition(
                OrderStatus.ON_THE_WAY,
                OrderStatus.DELIVERED,
                OrderActorType.COURIER
        )).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.assertTransition(
                OrderStatus.PICKED_UP,
                OrderStatus.DELIVERED,
                OrderActorType.COURIER
        )).isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void cancellationWindowsAreRoleScoped() {
        assertThatCode(() -> policy.assertCancellation(OrderStatus.DRIVER_ASSIGNED, OrderActorType.CUSTOMER))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.assertCancellation(OrderStatus.PREPARING, OrderActorType.CUSTOMER))
                .isInstanceOf(InvalidOrderTransitionException.class);

        assertThatCode(() -> policy.assertCancellation(OrderStatus.PREPARING, OrderActorType.MERCHANT))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.assertCancellation(OrderStatus.READY_FOR_PICKUP, OrderActorType.MERCHANT))
                .isInstanceOf(InvalidOrderTransitionException.class);

        assertThatCode(() -> policy.assertCancellation(OrderStatus.READY_FOR_PICKUP, OrderActorType.ADMIN))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.assertCancellation(OrderStatus.PICKED_UP, OrderActorType.ADMIN))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void finalStatesCannotChangeOrCancel() {
        assertThatThrownBy(() -> policy.assertTransition(
                OrderStatus.DELIVERED,
                OrderStatus.CANCELLED,
                OrderActorType.ADMIN
        )).isInstanceOf(InvalidOrderTransitionException.class);
        assertThatThrownBy(() -> policy.assertCancellation(OrderStatus.CANCELLED, OrderActorType.ADMIN))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }
}

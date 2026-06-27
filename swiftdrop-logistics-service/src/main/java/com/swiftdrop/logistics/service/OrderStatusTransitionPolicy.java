package com.swiftdrop.logistics.service;

import java.util.EnumSet;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.swiftdrop.logistics.entity.OrderActorType;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.exception.InvalidOrderTransitionException;

@Component
public class OrderStatusTransitionPolicy {

    private static final Set<OrderStatus> FINAL_STATUSES = EnumSet.of(
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED
    );

    public void assertTransition(OrderStatus currentStatus, OrderStatus targetStatus, OrderActorType actorType) {
        if (FINAL_STATUSES.contains(currentStatus)) {
            throw new InvalidOrderTransitionException("Final order status cannot be changed.");
        }

        boolean allowed = switch (actorType) {
            case MERCHANT -> isMerchantTransition(currentStatus, targetStatus);
            case COURIER -> isCourierTransition(currentStatus, targetStatus);
            case ADMIN -> isAdminTransition(currentStatus, targetStatus);
            case CUSTOMER -> false;
            case SYSTEM -> targetStatus == OrderStatus.DRIVER_ASSIGNED && currentStatus == OrderStatus.PLACED;
        };

        if (!allowed) {
            throw new InvalidOrderTransitionException(
                    "Order cannot transition from " + currentStatus + " to " + targetStatus + "."
            );
        }
    }

    public void assertCancellation(OrderStatus currentStatus, OrderActorType actorType) {
        if (FINAL_STATUSES.contains(currentStatus)) {
            throw new InvalidOrderTransitionException("Final order status cannot be cancelled.");
        }

        boolean allowed = switch (actorType) {
            case CUSTOMER -> currentStatus == OrderStatus.PLACED || currentStatus == OrderStatus.DRIVER_ASSIGNED;
            case MERCHANT -> currentStatus == OrderStatus.PLACED
                    || currentStatus == OrderStatus.DRIVER_ASSIGNED
                    || currentStatus == OrderStatus.PREPARING;
            case ADMIN -> currentStatus == OrderStatus.PLACED
                    || currentStatus == OrderStatus.DRIVER_ASSIGNED
                    || currentStatus == OrderStatus.PREPARING
                    || currentStatus == OrderStatus.READY_FOR_PICKUP;
            case COURIER, SYSTEM -> false;
        };

        if (!allowed) {
            throw new InvalidOrderTransitionException("Order cannot be cancelled from " + currentStatus + ".");
        }
    }

    public boolean isFinal(OrderStatus status) {
        return FINAL_STATUSES.contains(status);
    }

    private boolean isMerchantTransition(OrderStatus currentStatus, OrderStatus targetStatus) {
        return (targetStatus == OrderStatus.PREPARING
                && (currentStatus == OrderStatus.PLACED || currentStatus == OrderStatus.DRIVER_ASSIGNED))
                || (targetStatus == OrderStatus.READY_FOR_PICKUP && currentStatus == OrderStatus.PREPARING);
    }

    private boolean isCourierTransition(OrderStatus currentStatus, OrderStatus targetStatus) {
        return (targetStatus == OrderStatus.PICKED_UP && currentStatus == OrderStatus.READY_FOR_PICKUP)
                || (targetStatus == OrderStatus.ON_THE_WAY && currentStatus == OrderStatus.PICKED_UP)
                || (targetStatus == OrderStatus.DELIVERED && currentStatus == OrderStatus.ON_THE_WAY);
    }

    private boolean isAdminTransition(OrderStatus currentStatus, OrderStatus targetStatus) {
        return currentStatus != targetStatus && !FINAL_STATUSES.contains(targetStatus);
    }
}

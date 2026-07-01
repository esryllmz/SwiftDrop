package com.swiftdrop.logistics.service.assignment;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.swiftdrop.logistics.service.OrderService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Retries courier assignment for active orders that did not get a courier at creation time (no
 * available/eligible courier at that moment). Admin manual assignment remains an override; this job is
 * what makes automatic assignment eventually succeed without any admin action.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AssignmentRetryService {

    private static final long ORDER_LOCK_TTL_SECONDS = 30;

    private final OrderService orderService;
    private final RedissonClient redissonClient;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Scheduled(fixedDelayString = "${application.assignment.retry-fixed-delay-ms:30000}")
    public void retryUnassignedOrders() {
        if (!running.compareAndSet(false, true)) {
            log.debug("Assignment retry is already running; skipping this tick.");
            return;
        }

        try {
            List<UUID> unassignedOrderIds = orderService.findUnassignedActiveOrderIds();
            for (UUID orderId : unassignedOrderIds) {
                retryOrder(orderId);
            }
        } finally {
            running.set(false);
        }
    }

    private void retryOrder(UUID orderId) {
        RLock lock = redissonClient.getLock("lock:order-assignment:" + orderId);
        try {
            if (lock.tryLock(0, ORDER_LOCK_TTL_SECONDS, TimeUnit.SECONDS)) {
                boolean assigned = orderService.attemptAssignment(orderId);
                if (assigned) {
                    log.info("Assignment retry succeeded for order {}", orderId);
                }
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("Assignment retry lock attempt interrupted for order {}", orderId, ex);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}

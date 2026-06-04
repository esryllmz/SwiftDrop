package com.swiftdrop.logistics.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.DashboardSummaryResponse;
import com.swiftdrop.logistics.entity.DriverStatus;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.entity.OutboxStatus;
import com.swiftdrop.logistics.repository.DriverRepository;
import com.swiftdrop.logistics.repository.MerchantRepository;
import com.swiftdrop.logistics.repository.OrderRepository;
import com.swiftdrop.logistics.repository.OutboxEventRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final DriverRepository driverRepository;
    private final MerchantRepository merchantRepository;
    private final OutboxEventRepository outboxEventRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary() {
        return new DashboardSummaryResponse(
                orderRepository.count(),
                orderRepository.countByStatus(OrderStatus.PLACED),
                orderRepository.countByStatus(OrderStatus.DRIVER_ASSIGNED),
                orderRepository.countByStatus(OrderStatus.DELIVERED),
                driverRepository.countByStatus(DriverStatus.AVAILABLE),
                driverRepository.countByStatus(DriverStatus.BUSY),
                driverRepository.countByStatus(DriverStatus.OFFLINE),
                merchantRepository.count(),
                outboxEventRepository.countByStatus(OutboxStatus.PENDING),
                outboxEventRepository.countByStatus(OutboxStatus.SENT),
                outboxEventRepository.countByStatus(OutboxStatus.FAILED)
        );
    }
}

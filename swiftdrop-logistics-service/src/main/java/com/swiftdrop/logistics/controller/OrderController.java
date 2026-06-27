package com.swiftdrop.logistics.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.OrderCreateRequest;
import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.dto.OrderStatusHistoryResponse;
import com.swiftdrop.logistics.entity.OrderStatus;
import com.swiftdrop.logistics.service.OrderService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderCreateRequest request) {
        return new ResponseEntity<>(orderService.createOrder(request), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> findOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) UUID merchantId,
            @RequestParam(required = false) UUID driverId
    ) {
        return ResponseEntity.ok(orderService.findOrders(status, merchantId, driverId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> findOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.findOrder(id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<OrderStatusHistoryResponse>> findOrderHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.findOrderHistory(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }
}

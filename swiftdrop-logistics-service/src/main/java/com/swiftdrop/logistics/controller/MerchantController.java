package com.swiftdrop.logistics.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swiftdrop.logistics.dto.MerchantResponse;
import com.swiftdrop.logistics.service.MerchantService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/merchants")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantService merchantService;

    @GetMapping
    public ResponseEntity<List<MerchantResponse>> findMerchants() {
        return ResponseEntity.ok(merchantService.findMerchants());
    }
}

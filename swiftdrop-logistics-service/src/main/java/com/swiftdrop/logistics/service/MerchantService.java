package com.swiftdrop.logistics.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swiftdrop.logistics.dto.MerchantResponse;
import com.swiftdrop.logistics.entity.Merchant;
import com.swiftdrop.logistics.repository.MerchantRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MerchantService {

    private final MerchantRepository merchantRepository;

    @Transactional(readOnly = true)
    public List<MerchantResponse> findMerchants() {
        return merchantRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private MerchantResponse toResponse(Merchant merchant) {
        return new MerchantResponse(
                merchant.getId(),
                merchant.getUserId(),
                merchant.getName(),
                merchant.getLatitude(),
                merchant.getLongitude()
        );
    }
}

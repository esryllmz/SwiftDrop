package com.swiftdrop.logistics.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.swiftdrop.logistics.dto.OrderResponse;
import com.swiftdrop.logistics.entity.Order;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(target = "merchantName", source = "merchant.name")
    @Mapping(target = "driverName", source = "driver.fullName")
    @Mapping(target = "history", expression = "java(java.util.List.of())")
    OrderResponse toResponse(Order order);
}

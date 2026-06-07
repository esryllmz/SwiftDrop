package com.swiftdrop.auth.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.swiftdrop.auth.dto.AuthResponse;
import com.swiftdrop.auth.dto.RegisterRequest;
import com.swiftdrop.auth.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "enabled", constant = "true")
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "role", ignore = true)
    User toEntity(RegisterRequest request);

    @Mapping(target = "accessToken", source = "token")
    @Mapping(target = "tokenType", constant = "Bearer")
    @Mapping(target = "userId", source = "user.id")
    AuthResponse toAuthResponse(User user, String token);
}

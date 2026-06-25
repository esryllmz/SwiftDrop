package com.swiftdrop.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;

import org.junit.jupiter.api.Test;

class ForgotPasswordResponseContractTest {

    @Test
    void publicContractContainsOnlyGenericMessage() {
        assertThat(Arrays.stream(ForgotPasswordResponse.class.getRecordComponents())
                .map(component -> component.getName())
                .toList())
                .containsExactly("message");

        assertThat(new ForgotPasswordResponse(
                "If an account exists for this portal, password reset instructions will be sent."
        )).isEqualTo(new ForgotPasswordResponse(
                "If an account exists for this portal, password reset instructions will be sent."
        ));
    }
}

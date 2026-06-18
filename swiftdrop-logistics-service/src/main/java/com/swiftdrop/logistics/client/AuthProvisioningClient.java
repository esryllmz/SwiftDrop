package com.swiftdrop.logistics.client;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.swiftdrop.logistics.dto.ProvisionUserRequest;
import com.swiftdrop.logistics.dto.ProvisionUserResponse;
import com.swiftdrop.logistics.exception.UserProvisioningConflictException;
import com.swiftdrop.logistics.exception.UserProvisioningException;
import com.swiftdrop.logistics.exception.UserProvisioningUnavailableException;

@Component
public class AuthProvisioningClient {

    private static final String INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key";
    private static final String PROVISION_USER_PATH = "/internal/users/provision";

    private final RestClient restClient;
    private final String internalApiKey;

    public AuthProvisioningClient(
            RestClient.Builder restClientBuilder,
            @Value("${application.auth-service.base-url}") String authServiceBaseUrl,
            @Value("${application.auth-service.internal-api-key}") String internalApiKey
    ) {
        this.restClient = Objects.requireNonNull(restClientBuilder, "restClientBuilder must not be null")
                .baseUrl(Objects.requireNonNull(authServiceBaseUrl, "auth service base url must not be null"))
                .build();
        this.internalApiKey = Objects.requireNonNull(internalApiKey, "internal api key must not be null");
    }

    public ProvisionUserResponse provisionUser(String email, String role) {
        ProvisionUserRequest request = new ProvisionUserRequest(email, role);
        try {
            ProvisionUserResponse response = restClient.post()
                    .uri(PROVISION_USER_PATH)
                    .header(INTERNAL_API_KEY_HEADER, internalApiKey)
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatus.BAD_REQUEST::equals, (httpRequest, httpResponse) -> {
                        throw new UserProvisioningException("Auth service rejected provisioning request.");
                    })
                    .onStatus(HttpStatus.UNAUTHORIZED::equals, (httpRequest, httpResponse) -> {
                        throw new UserProvisioningException("Auth service internal provisioning is not authorized.");
                    })
                    .onStatus(HttpStatus.CONFLICT::equals, (httpRequest, httpResponse) -> {
                        throw new UserProvisioningConflictException("A user with this email already exists with a different role.");
                    })
                    .onStatus(status -> status.is5xxServerError(), (httpRequest, httpResponse) -> {
                        throw new UserProvisioningUnavailableException("Auth service provisioning is unavailable.", null);
                    })
                    .body(ProvisionUserResponse.class);

            return Objects.requireNonNull(response, "provision user response must not be null");
        } catch (UserProvisioningConflictException | UserProvisioningException | UserProvisioningUnavailableException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new UserProvisioningUnavailableException("Auth service provisioning is unavailable.", ex);
        }
    }
}

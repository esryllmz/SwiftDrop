package com.swiftdrop.notification.service;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import com.swiftdrop.notification.config.properties.OneSignalProperties;
import com.swiftdrop.notification.dto.OrderKafkaEvent;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OneSignalService {

    private final RestClient restClient;
    private final String appId;
    private final String apiKey;
    private final boolean mockEnabled;

    public OneSignalService(
            RestClient.Builder restClientBuilder,
            OneSignalProperties oneSignalProperties
    ) {
        this.restClient = Objects.requireNonNull(restClientBuilder, "restClientBuilder must not be null")
                .baseUrl("https://onesignal.com/api/v1")
                .build();
        OneSignalProperties properties = Objects.requireNonNull(
                oneSignalProperties,
                "OneSignal properties must not be null"
        );
        this.appId = properties.appId();
        this.apiKey = properties.apiKey();
        this.mockEnabled = properties.mockEnabled();
    }

    public void sendWebPushNotification(OrderKafkaEvent event) {
        log.info("Sending OneSignal push notification. targetUserId={}", event.targetUserId());

        if (mockEnabled) {
            log.info("OneSignal mock mode active. Skipping external API call. orderId={}", event.orderId());
            return;
        }

        if (!StringUtils.hasText(appId) || !StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("OneSignal credentials are required when mock mode is disabled.");
        }

        String targetUserId = Objects.requireNonNull(event.targetUserId(), "target user id must not be null").toString();
        String message = Objects.requireNonNull(event.message(), "notification message must not be null");
        MediaType contentType = Objects.requireNonNull(MediaType.APPLICATION_JSON, "content type must not be null");
        Map<String, Object> requestBody = Map.of(
                "app_id", appId,
                "contents", Map.of("en", message),
                "headings", Map.of("en", "SwiftDrop Order Update"),
                "include_external_user_ids", List.of(targetUserId)
        );
        Map<String, Object> notificationRequestBody = Objects.requireNonNull(
                requestBody,
                "OneSignal request body must not be null"
        );

        String response = restClient.post()
                .uri("/notifications")
                .header("Authorization", "Basic " + apiKey)
                .contentType(contentType)
                .body(notificationRequestBody)
                .retrieve()
                .body(String.class);

        log.info("OneSignal notification sent. response={}", response);
    }
}

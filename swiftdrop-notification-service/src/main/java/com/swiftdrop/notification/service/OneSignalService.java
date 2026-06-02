package com.swiftdrop.notification.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

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
            @Value("${application.onesignal.app-id}") String appId,
            @Value("${application.onesignal.api-key}") String apiKey,
            @Value("${application.onesignal.mock-enabled}") boolean mockEnabled
    ) {
        this.restClient = restClientBuilder
                .baseUrl("https://onesignal.com/api/v1")
                .build();
        this.appId = appId;
        this.apiKey = apiKey;
        this.mockEnabled = mockEnabled;
    }

    public void sendWebPushNotification(OrderKafkaEvent event) {
        log.info("Sending OneSignal push notification. targetUserId={}", event.targetUserId());

        if (mockEnabled || !StringUtils.hasText(appId) || !StringUtils.hasText(apiKey)) {
            log.info("OneSignal mock mode active or credentials missing. Skipping external API call. orderId={}", event.orderId());
            return;
        }

        Map<String, Object> requestBody = Map.of(
                "app_id", appId,
                "contents", Map.of("en", event.message()),
                "headings", Map.of("en", "SwiftDrop Order Update"),
                "include_external_user_ids", List.of(event.targetUserId().toString())
        );

        try {
            String response = restClient.post()
                    .uri("/notifications")
                    .header("Authorization", "Basic " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            log.info("OneSignal notification sent. response={}", response);
        } catch (Exception ex) {
            log.error("OneSignal notification failed.", ex);
        }
    }
}

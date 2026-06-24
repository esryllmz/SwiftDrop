package com.swiftdrop.notification.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "application.onesignal")
public record OneSignalProperties(String appId, String apiKey, boolean mockEnabled) {
}

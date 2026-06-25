package com.swiftdrop.auth.service.impl;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import com.swiftdrop.auth.service.PasswordResetEmailSender;

@Service("oneSignalPasswordResetEmailSender")
@ConditionalOnProperty(
        name = "application.password-reset.email.provider",
        havingValue = "onesignal"
)
public class OneSignalPasswordResetEmailSender implements PasswordResetEmailSender {

    private static final Logger LOG = LoggerFactory.getLogger(OneSignalPasswordResetEmailSender.class);

    private final RestClient restClient;
    private final String appId;
    private final String apiKey;

    public OneSignalPasswordResetEmailSender(
            RestClient.Builder restClientBuilder,
            @Value("${application.password-reset.email.onesignal.api-url}") String apiUrl,
            @Value("${application.password-reset.email.onesignal.app-id:}") String appId,
            @Value("${application.password-reset.email.onesignal.api-key:}") String apiKey
    ) {
        this.restClient = restClientBuilder.baseUrl(apiUrl).build();
        this.appId = appId;
        this.apiKey = apiKey;
    }

    @Override
    public void sendPasswordResetEmail(
            String recipientEmail,
            String resetUrl,
            Instant expiresAt,
            String requestId
    ) {
        if (!StringUtils.hasText(appId) || !StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("OneSignal password reset email provider is not configured");
        }

        Map<String, Object> payload = Map.of(
                "app_id", appId,
                "include_email_tokens", List.of(recipientEmail),
                "email_subject", "Reset your SwiftDrop password",
                "email_body", buildHtmlContent(resetUrl, expiresAt)
        );

        restClient.post()
                .header(HttpHeaders.AUTHORIZATION, "Key " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();

        LOG.debug("OneSignal password reset email accepted [requestId={}]", requestId);
    }

    private String buildHtmlContent(String resetUrl, Instant expiresAt) {
        return "<h2>Password reset request</h2>"
                + "<p>Use the link below to set a new password:</p>"
                + "<p><a href=\"" + escapeHtml(resetUrl) + "\">Reset password</a></p>"
                + "<p>This link expires at "
                + DateTimeFormatter.ISO_INSTANT.format(expiresAt)
                + " and can be used only once.</p>";
    }

    private String escapeHtml(String input) {
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

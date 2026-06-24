package com.swiftdrop.auth.service.impl;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Type-safe configuration properties for SMTP password reset emails.
 */
@Component
@ConfigurationProperties(prefix = "application.password-reset.email")
public class SmtpMailProperties {

    private String provider = "smtp";
    private String fromAddress = "no-reply@swiftdrop.local";
    private String fromName = "SwiftDrop";

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getFromAddress() {
        return fromAddress;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }
}

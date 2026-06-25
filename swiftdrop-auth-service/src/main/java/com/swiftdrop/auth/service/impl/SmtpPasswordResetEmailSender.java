package com.swiftdrop.auth.service.impl;

import java.io.UnsupportedEncodingException;
import java.time.Instant;
import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.swiftdrop.auth.service.PasswordResetEmailSender;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service("smtpPasswordResetEmailSender")
@ConditionalOnProperty(
        name = "application.password-reset.email.provider",
        havingValue = "smtp"
)
public class SmtpPasswordResetEmailSender implements PasswordResetEmailSender {

    private static final Logger LOG = LoggerFactory.getLogger(SmtpPasswordResetEmailSender.class);

    private final JavaMailSender javaMailSender;
    private final String fromAddress;
    private final String fromName;

    public SmtpPasswordResetEmailSender(
            JavaMailSender javaMailSender,
            SmtpMailProperties mailProperties
    ) {
        this.javaMailSender = javaMailSender;
        this.fromAddress = mailProperties.getFromAddress();
        this.fromName = mailProperties.getFromName();
    }

    @Override
    public void sendPasswordResetEmail(
            String recipientEmail,
            String resetUrl,
            Instant expiresAt,
            String requestId
    ) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(recipientEmail);
            helper.setSubject("Reset your SwiftDrop password");
            helper.setText(buildPlainText(resetUrl, expiresAt), buildHtmlContent(resetUrl, expiresAt));

            javaMailSender.send(message);
            LOG.debug("SMTP password reset email accepted [requestId={}]", requestId);
        } catch (MessagingException | UnsupportedEncodingException | RuntimeException exception) {
            LOG.error(
                    "SMTP password reset email failed [requestId={}, errorType={}]",
                    requestId,
                    exception.getClass().getSimpleName()
            );
            throw new IllegalStateException("Email delivery failed", exception);
        }
    }

    private String buildPlainText(String resetUrl, Instant expiresAt) {
        return String.format(
                "Reset your SwiftDrop password%n%n"
                        + "Use the following link to set a new password:%n"
                        + "%s%n%n"
                        + "This link expires at %s.%n%n"
                        + "If you did not request this change, you can ignore this email.%n",
                resetUrl,
                DateTimeFormatter.ISO_INSTANT.format(expiresAt)
        );
    }

    private String buildHtmlContent(String resetUrl, Instant expiresAt) {
        String safeResetUrl = escapeHtml(resetUrl);
        String expiresAtFormatted = DateTimeFormatter.ISO_INSTANT.format(expiresAt);

        return String.format(
                "<!DOCTYPE html>"
                        + "<html lang=\"en\"><head><meta charset=\"UTF-8\">"
                        + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
                        + "<style>"
                        + "body{font-family:Arial,sans-serif;line-height:1.6;color:#333}"
                        + ".container{max-width:600px;margin:0 auto;padding:20px}"
                        + ".header{background:#2563eb;color:white;padding:20px;border-radius:8px;text-align:center}"
                        + ".content{padding:20px}"
                        + ".button{display:inline-block;background:#2563eb;color:white;padding:12px 24px;"
                        + "text-decoration:none;border-radius:6px;margin:15px 0}"
                        + ".footer{font-size:12px;color:#666;margin-top:20px;padding-top:20px;border-top:1px solid #ddd}"
                        + "</style></head><body><div class=\"container\">"
                        + "<div class=\"header\"><h1>SwiftDrop</h1></div>"
                        + "<div class=\"content\"><h2>Password reset request</h2>"
                        + "<p>Use the button below to set a new password:</p>"
                        + "<a href=\"%s\" class=\"button\">Reset password</a>"
                        + "<p><strong>Expires at:</strong> %s</p>"
                        + "<p>If you did not request this change, you can ignore this email.</p></div>"
                        + "<div class=\"footer\"><p>This password reset link can be used only once.</p></div>"
                        + "</div></body></html>",
                safeResetUrl,
                expiresAtFormatted
        );
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

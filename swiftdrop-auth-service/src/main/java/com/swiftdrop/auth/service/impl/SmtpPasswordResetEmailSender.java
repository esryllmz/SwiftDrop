package com.swiftdrop.auth.service.impl;

import java.io.UnsupportedEncodingException;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import com.swiftdrop.auth.service.PasswordResetEmailSender;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * SMTP-based password reset email sender.
 * Sends HTML and plain text versions of password reset emails via JavaMailSender.
 */
@Service("smtpPasswordResetEmailSender")
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
            helper.setSubject("SwiftDrop şifre sıfırlama");
            helper.setText(buildPlainText(resetUrl, expiresAt), buildHtmlContent(resetUrl, expiresAt));

            javaMailSender.send(message);
            LOG.debug("Password reset email sent successfully [requestId={}]", requestId);
        } catch (MessagingException | UnsupportedEncodingException | RuntimeException e) {
            LOG.error("Failed to send password reset email [requestId={}]", requestId, e);
            throw new RuntimeException("Email delivery failed", e);
        }
    }

    private String buildPlainText(String resetUrl, Instant expiresAt) {
        return String.format(
                "SwiftDrop Şifre Sıfırlama\n\n" +
                "Şifreyi sıfırlamak için lütfen aşağıdaki bağlantıyı ziyaret edin:\n" +
                "%s\n\n" +
                "Bu bağlantı %s tarihinde sona erecektir.\n\n" +
                "Eğer bu işlemi talep etmediyseniz, bu e-postayı görmezden gelebilirsiniz.\n",
                resetUrl,
                DateTimeFormatter.ISO_INSTANT.format(expiresAt)
        );
    }

    private String buildHtmlContent(String resetUrl, Instant expiresAt) {
        String safeResetUrl = escapeHtml(resetUrl);
        String expiresAtFormatted = DateTimeFormatter.ISO_INSTANT.format(expiresAt);
        
        return String.format(
                "<!DOCTYPE html>\n" +
                "<html lang=\"tr\">\n" +
                "<head>\n" +
                "  <meta charset=\"UTF-8\">\n" +
                "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "  <style>\n" +
                "    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n" +
                "    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n" +
                "    .header { background-color: #007bff; color: white; padding: 20px; border-radius: 4px; text-align: center; }\n" +
                "    .content { padding: 20px; }\n" +
                "    .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 15px 0; }\n" +
                "    .footer { font-size: 12px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }\n" +
                "  </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "  <div class=\"container\">\n" +
                "    <div class=\"header\">\n" +
                "      <h1>SwiftDrop</h1>\n" +
                "    </div>\n" +
                "    <div class=\"content\">\n" +
                "      <h2>Şifre Sıfırlama Talebi</h2>\n" +
                "      <p>Şifreyi sıfırlamak için lütfen aşağıdaki düğmeyi tıklayın:</p>\n" +
                "      <a href=\"%s\" class=\"button\">Şifreyi Sıfırla</a>\n" +
                "      <p><strong>Geçerlilik Süresi:</strong> %s</p>\n" +
                "      <p><strong>Not:</strong> Eğer bu işlemi talep etmediyseniz, bu e-postayı görmezden gelebilirsiniz.</p>\n" +
                "    </div>\n" +
                "    <div class=\"footer\">\n" +
                "      <p>Bu bağlantı sadece 15 dakika geçerlidir.</p>\n" +
                "    </div>\n" +
                "  </div>\n" +
                "</body>\n" +
                "</html>",
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

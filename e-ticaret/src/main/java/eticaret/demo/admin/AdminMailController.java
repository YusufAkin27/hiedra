package eticaret.demo.admin;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/mail")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminMailController {

    private final MailService mailService;
    private final AppUserRepository userRepository;

    /**
     * Toplu mail gönderme endpoint'i
     * POST /api/admin/mail/bulk-send
     */
    @PostMapping("/bulk-send")
    public ResponseEntity<DataResponseMessage<BulkMailResponse>> sendBulkMail(
            @RequestBody BulkMailRequest request) {
        
        try {
            log.info("📧 Toplu mail gönderimi başlatılıyor - Subject: {}, Recipient Type: {}", 
                    request.getSubject(), request.getRecipientType());

            // Alıcı listesini belirle
            List<AppUser> recipients = getRecipients(request.getRecipientType());
            
            if (recipients.isEmpty()) {
                return ResponseEntity.ok(DataResponseMessage.success(
                    "Gönderilecek alıcı bulunamadı", 
                    new BulkMailResponse(0, 0, 0)
                ));
            }

            // HTML template oluştur
            String htmlBody = createEmailTemplate(request.getSubject(), request.getMessage());

            int successCount = 0;
            int failCount = 0;

            // Her alıcıya mail gönder
            for (AppUser user : recipients) {
                try {
                    EmailMessage emailMessage = EmailMessage.builder()
                            .toEmail(user.getEmail())
                            .subject(request.getSubject())
                            .body(htmlBody)
                            .isHtml(true)
                            .build();

                    // Mail'i kuyruğa ekle
                    mailService.queueEmail(emailMessage);
                    successCount++;
                    
                    log.debug("✅ Mail kuyruğa eklendi: {}", user.getEmail());
                } catch (Exception e) {
                    failCount++;
                    log.error("❌ Mail kuyruğa eklenemedi - Email: {}, Error: {}", 
                            user.getEmail(), e.getMessage());
                }
            }

            log.info("📧 Toplu mail gönderimi tamamlandı - Başarılı: {}, Başarısız: {}, Toplam: {}", 
                    successCount, failCount, recipients.size());

            BulkMailResponse response = new BulkMailResponse(
                    recipients.size(),
                    successCount,
                    failCount
            );

            return ResponseEntity.ok(DataResponseMessage.success(
                    "Toplu mail gönderimi başlatıldı", 
                    response
            ));

        } catch (Exception e) {
            log.error("❌ Toplu mail gönderiminde hata: {}", e.getMessage(), e);
            return ResponseEntity.ok(DataResponseMessage.error(
                    "Toplu mail gönderiminde hata: " + e.getMessage()
            ));
        }
    }

    /**
     * Alıcı tipine göre kullanıcı listesini getir
     */
    private List<AppUser> getRecipients(String recipientType) {
        switch (recipientType != null ? recipientType.toUpperCase() : "ALL") {
            case "ACTIVE":
                // Sadece aktif kullanıcılar
                return userRepository.findAll().stream()
                        .filter(user -> user.isActive() && 
                                      user.isEmailVerified() && 
                                      user.getRole() == UserRole.USER)
                        .collect(Collectors.toList());
            
            case "VERIFIED":
                // Sadece email doğrulanmış kullanıcılar
                return userRepository.findAll().stream()
                        .filter(user -> user.isEmailVerified() && 
                                      user.getRole() == UserRole.USER)
                        .collect(Collectors.toList());
            
            case "ALL":
            default:
                // Tüm kullanıcılar (USER rolü)
                return userRepository.findByRole(UserRole.USER);
        }
    }

    /**
     * Güzel bir HTML email template oluştur (haber/duyuru formatında)
     */
    private String createEmailTemplate(String subject, String message) {
        String currentDate = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("dd MMMM yyyy, EEEE", java.util.Locale.forLanguageTag("tr")));
        
        return "<!DOCTYPE html>\n" +
                "<html lang=\"tr\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>" + escapeHtml(subject) + "</title>\n" +
                "    <style>\n" +
                "        :root {\n" +
                "            color-scheme: light dark;\n" +
                "        }\n" +
                "        body {\n" +
                "            margin: 0;\n" +
                "            padding: 0;\n" +
                "            font-family: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n" +
                "            background-color: #f6f7fb;\n" +
                "            color: #000000;\n" +
                "            line-height: 1.6;\n" +
                "        }\n" +
                "        .wrapper {\n" +
                "            max-width: 600px;\n" +
                "            margin: 0 auto;\n" +
                "            padding: 32px 16px;\n" +
                "        }\n" +
                "        .card {\n" +
                "            background: #ffffff;\n" +
                "            border-radius: 32px;\n" +
                "            padding: 48px 40px;\n" +
                "            position: relative;\n" +
                "            overflow: hidden;\n" +
                "            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);\n" +
                "            border: 2px solid #000000;\n" +
                "        }\n" +
                "        h1 {\n" +
                "            font-size: 28px;\n" +
                "            margin: 0 0 12px 0;\n" +
                "            letter-spacing: -0.5px;\n" +
                "            color: #000000;\n" +
                "            font-weight: 700;\n" +
                "        }\n" +
                "        .date {\n" +
                "            font-size: 14px;\n" +
                "            color: #000000;\n" +
                "            opacity: 0.8;\n" +
                "            margin-top: 8px;\n" +
                "        }\n" +
                "        .email-content {\n" +
                "            font-size: 15px;\n" +
                "            line-height: 1.7;\n" +
                "            color: #000000;\n" +
                "            margin: 24px 0;\n" +
                "        }\n" +
                "        .email-content p {\n" +
                "            margin: 0 0 16px 0;\n" +
                "            color: #000000;\n" +
                "        }\n" +
                "        .divider {\n" +
                "            height: 2px;\n" +
                "            background: #000000;\n" +
                "            margin: 30px 0;\n" +
                "            border-radius: 1px;\n" +
                "        }\n" +
                "        .footer {\n" +
                "            text-align: center;\n" +
                "            margin-top: 32px;\n" +
                "            color: #000000;\n" +
                "            font-size: 13px;\n" +
                "            opacity: 0.8;\n" +
                "        }\n" +
                "        .footer .logo {\n" +
                "            font-size: 20px;\n" +
                "            font-weight: 700;\n" +
                "            color: #000000;\n" +
                "            margin-bottom: 10px;\n" +
                "        }\n" +
                "        .footer .info {\n" +
                "            font-size: 12px;\n" +
                "            color: #000000;\n" +
                "            opacity: 0.8;\n" +
                "            margin-top: 15px;\n" +
                "        }\n" +
                "        @media (max-width: 600px) {\n" +
                "            .card {\n" +
                "                padding: 28px 24px;\n" +
                "                border-radius: 24px;\n" +
                "            }\n" +
                "            h1 {\n" +
                "                font-size: 24px;\n" +
                "            }\n" +
                "        }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"wrapper\">\n" +
                "        <div class=\"card\">\n" +
                "            <h1>📢 " + escapeHtml(subject) + "</h1>\n" +
                "            <div class=\"date\">" + currentDate + "</div>\n" +
                "            <div class=\"divider\"></div>\n" +
                "            <div class=\"email-content\">" + formatMessage(message) + "</div>\n" +
                "            <div class=\"divider\"></div>\n" +
                "            <div class=\"footer\">\n" +
                "                <div class=\"logo\">HIEDRA COLLECTION</div>\n" +
                "                <div class=\"info\">\n" +
                "                    Bu e-posta HIEDRA COLLECTION tarafından gönderilmiştir.<br>\n" +
                "                    Sorularınız için bizimle iletişime geçebilirsiniz.\n" +
                "                </div>\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }

    /**
     * HTML escape yap
     */
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&#39;");
    }

    /**
     * Mesajı formatla (satır sonlarını <br> ile değiştir)
     */
    private String formatMessage(String message) {
        if (message == null) return "";
        // HTML escape yap
        String escaped = escapeHtml(message);
        // Satır sonlarını <br> ile değiştir
        return escaped.replace("\n", "<br>");
    }

    @Data
    public static class BulkMailRequest {
        private String subject;
        private String message;
        private String recipientType; // ALL, ACTIVE, VERIFIED
    }

    @Data
    public static class BulkMailResponse {
        private int totalRecipients;
        private int successCount;
        private int failCount;

        public BulkMailResponse(int totalRecipients, int successCount, int failCount) {
            this.totalRecipients = totalRecipients;
            this.successCount = successCount;
            this.failCount = failCount;
        }
    }
}


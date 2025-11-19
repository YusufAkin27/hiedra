package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.common.config.AppUrlConfig;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.mail.EmailTemplateBuilder;
import eticaret.demo.mail.EmailTemplateModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminNotificationService {

    private final AdminPreferenceRepository adminPreferenceRepository;
    private final AppUserRepository appUserRepository;
    private final MailService mailService;
    private final AppUrlConfig appUrlConfig;

    /**
     * Sistem hatası bildirimi gönder
     */
    @Transactional(readOnly = true)
    public void sendSystemErrorNotification(String errorMessage, String errorDetails) {
        List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);
        
        for (AppUser admin : admins) {
            AdminPreference preference = adminPreferenceRepository.findByUser(admin)
                    .orElse(AdminPreference.builder()
                            .user(admin)
                            .systemNotifications(true)
                            .emailNotifications(true)
                            .build());

            if (Boolean.TRUE.equals(preference.getSystemNotifications()) 
                    && Boolean.TRUE.equals(preference.getEmailNotifications())) {
                sendSystemErrorEmail(admin, errorMessage, errorDetails);
            }
        }
    }

    /**
     * Yeni sipariş bildirimi gönder
     */
    @Transactional(readOnly = true)
    public void sendOrderNotification(String orderNumber, String customerEmail, String customerName, 
                                     java.math.BigDecimal totalAmount) {
        List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);
        
        for (AppUser admin : admins) {
            AdminPreference preference = adminPreferenceRepository.findByUser(admin)
                    .orElse(AdminPreference.builder()
                            .user(admin)
                            .orderNotifications(true)
                            .emailNotifications(true)
                            .build());

            if (Boolean.TRUE.equals(preference.getOrderNotifications()) 
                    && Boolean.TRUE.equals(preference.getEmailNotifications())) {
                sendOrderNotificationEmail(admin, orderNumber, customerEmail, customerName, totalAmount);
            }
        }
    }

    /**
     * Yeni kullanıcı bildirimi gönder
     */
    @Transactional(readOnly = true)
    public void sendUserNotification(String userEmail, String userName) {
        List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);
        
        for (AppUser admin : admins) {
            AdminPreference preference = adminPreferenceRepository.findByUser(admin)
                    .orElse(AdminPreference.builder()
                            .user(admin)
                            .userNotifications(true)
                            .emailNotifications(true)
                            .build());

            if (Boolean.TRUE.equals(preference.getUserNotifications()) 
                    && Boolean.TRUE.equals(preference.getEmailNotifications())) {
                sendUserNotificationEmail(admin, userEmail, userName);
            }
        }
    }

    private void sendSystemErrorEmail(AppUser admin, String errorMessage, String errorDetails) {
        String emailBody = buildSystemErrorEmailTemplate(errorMessage, errorDetails);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(admin.getEmail())
                .subject("Sistem Hatası Bildirimi - HIEDRA HOME COLLECTION")
                .body(emailBody)
                .isHtml(true)
                .build();

        mailService.queueEmail(emailMessage);
        log.info("Sistem hatası bildirimi gönderildi - Admin: {}", admin.getEmail());
    }

    private void sendOrderNotificationEmail(AppUser admin, String orderNumber, String customerEmail, 
                                           String customerName, java.math.BigDecimal totalAmount) {
        String emailBody = buildOrderNotificationEmailTemplate(orderNumber, customerEmail, customerName, totalAmount);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(admin.getEmail())
                .subject("Yeni Sipariş - " + orderNumber)
                .body(emailBody)
                .isHtml(true)
                .build();

        mailService.queueEmail(emailMessage);
        log.info("Sipariş bildirimi gönderildi - Admin: {}, Sipariş: {}", admin.getEmail(), orderNumber);
    }

    private void sendUserNotificationEmail(AppUser admin, String userEmail, String userName) {
        String emailBody = buildUserNotificationEmailTemplate(userEmail, userName);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(admin.getEmail())
                .subject("Yeni Kullanıcı Kaydı - HIEDRA HOME COLLECTION")
                .body(emailBody)
                .isHtml(true)
                .build();

        mailService.queueEmail(emailMessage);
        log.info("Kullanıcı bildirimi gönderildi - Admin: {}, Kullanıcı: {}", admin.getEmail(), userEmail);
    }

    private String buildSystemErrorEmailTemplate(String errorMessage, String errorDetails) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Zaman", timestamp);

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Sistem Hatası Bildirimi")
                .preheader("Sistemde kritik bir hata algılandı.")
                .greeting("Merhaba,")
                .paragraphs(List.of(
                        "Sistemde bir hata oluştu. Ayrıntılar aşağıda listelendi.",
                        errorDetails != null ? "Hata Detayı: " + errorDetails : "Ek hata detayı bulunamadı."
                ))
                .details(details)
                .highlight("Hata Mesajı: " + errorMessage)
                .footerNote("Lütfen gerekli incelemeyi yaparak önlem alın.")
                .build());
    }

    private String buildOrderNotificationEmailTemplate(String orderNumber, String customerEmail,
                                                       String customerName, java.math.BigDecimal totalAmount) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        String adminUrl = appUrlConfig.getFrontendAdminUrl() + "/orders";
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Sipariş No", orderNumber);
        details.put("Müşteri", customerName != null ? customerName : "Bilinmiyor");
        details.put("E-posta", customerEmail);
        details.put("Toplam Tutar", formatCurrency(totalAmount));
        details.put("Tarih", timestamp);

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Yeni Sipariş Bildirimi")
                .preheader("Yeni bir sipariş oluşturuldu.")
                .greeting("Merhaba,")
                .paragraphs(List.of("Sisteme yeni bir sipariş düştü. Özet bilgilere aşağıdan ulaşabilirsiniz."))
                .details(details)
                .actionText("Siparişi Görüntüle")
                .actionUrl(adminUrl)
                .footerNote("Hiedra Home Collection • Yönetici Bildirim Sistemi")
                .build());
    }

    private String buildUserNotificationEmailTemplate(String userEmail, String userName) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        String adminUrl = appUrlConfig.getFrontendAdminUrl() + "/users";
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Ad Soyad", userName != null ? userName : "Bilinmiyor");
        details.put("E-posta", userEmail);
        details.put("Kayıt Tarihi", timestamp);

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Yeni Kullanıcı Kaydı")
                .preheader("Platforma yeni bir kullanıcı eklendi.")
                .greeting("Merhaba,")
                .paragraphs(List.of("Platformumuza yeni bir kullanıcı katıldı. Bilgileri aşağıda bulabilirsiniz."))
                .details(details)
                .actionText("Kullanıcıları Görüntüle")
                .actionUrl(adminUrl)
                .footerNote("Hiedra Home Collection • Yönetici Bildirim Sistemi")
                .build());
    }

    /**
     * Rapor e-postası gönder
     */
    public void sendReportEmail(AppUser admin, String email, String reportType, byte[] pdfData, 
                               java.time.LocalDate startDate, java.time.LocalDate endDate) {
        String emailBody = buildReportEmailTemplate(reportType, startDate, endDate);
        
        String fileName = "rapor_" + reportType.toLowerCase() + "_" + 
                         startDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")) + ".pdf";
        
        eticaret.demo.mail.EmailAttachment attachment = new eticaret.demo.mail.EmailAttachment();
        attachment.setName(fileName);
        attachment.setContent(pdfData);
        attachment.setContentType("application/pdf");
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(email)
                .subject(reportType + " Rapor - HIEDRA HOME COLLECTION")
                .body(emailBody)
                .isHtml(true)
                .attachments(java.util.List.of(attachment))
                .build();

        try {
            log.info("📧 {} raporu mail gönderimi başlatılıyor - Admin: {}, Email: {}, Dosya: {} ({} bytes)", 
                    reportType, admin.getEmail(), email, fileName, pdfData != null ? pdfData.length : 0);
            
            // Rapor mail'lerini direkt gönder (attachment'lar JSON serialize'da kaybolabilir)
            mailService.sendEmailDirectly(emailMessage);
            
            log.info("✅ {} raporu başarıyla gönderildi - Admin: {}, Email: {}, Dosya: {} ({} bytes)", 
                    reportType, admin.getEmail(), email, fileName, pdfData != null ? pdfData.length : 0);
        } catch (Exception e) {
            log.error("❌ {} raporu gönderilirken hata - Admin: {}, Email: {}, Error: {}", 
                    reportType, admin.getEmail(), email, e.getMessage(), e);
            throw e;
        }
    }

    private String buildReportEmailTemplate(String reportType, java.time.LocalDate startDate, java.time.LocalDate endDate) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        String dateRange = startDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!startDate.equals(endDate)) {
            dateRange += " - " + endDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }

        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Rapor Tipi", reportType);
        details.put("Tarih Aralığı", dateRange);
        details.put("Oluşturulma Tarihi", timestamp);

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title(reportType + " Raporu")
                .preheader("Talep ettiğiniz rapor hazır.")
                .greeting("Merhaba,")
                .paragraphs(List.of(
                        reportType + " raporunuz hazırlanmıştır. Detaylı rapor e-postanızın ekinde PDF olarak yer alıyor."
                ))
                .details(details)
                .footerNote("PDF dosyasını e-postanın eklerinden indirebilirsiniz.")
                .build());
    }

    private String formatCurrency(java.math.BigDecimal amount) {
        if (amount == null) {
            return "0,00 ₺";
        }
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString() + " ₺";
    }
}


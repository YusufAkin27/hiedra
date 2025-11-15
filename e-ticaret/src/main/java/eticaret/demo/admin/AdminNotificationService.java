package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.config.AppUrlConfig;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
        return String.format("""
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
                            background-color: #f5f5f5; 
                            margin: 0; 
                            padding: 0; 
                            line-height: 1.6;
                        }
                        .container { max-width: 600px; margin: 40px auto; padding: 20px; }
                        .card { 
                            background-color: #ffffff; 
                            border-radius: 12px; 
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); 
                            overflow: hidden; 
                            border: 1px solid #e0e0e0; 
                        }
                        .header { 
                            background-color: #dc3545; 
                            color: #ffffff; 
                            padding: 30px; 
                            text-align: center; 
                        }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                        .content { padding: 30px; color: #1a1a1a; }
                        .error-box {
                            background-color: #fff5f5;
                            border-left: 4px solid #dc3545;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .error-box strong { color: #dc3545; display: block; margin-bottom: 8px; }
                        .error-box p { color: #721c24; margin: 0; font-size: 14px; }
                        .details-box {
                            background-color: #f9f9f9;
                            border: 1px solid #e0e0e0;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 8px;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            color: #333;
                            white-space: pre-wrap;
                            word-break: break-all;
                        }
                        .footer { 
                            padding: 20px; 
                            font-size: 12px; 
                            color: #999999; 
                            text-align: center; 
                            background-color: #f9f9f9;
                            border-top: 1px solid #e0e0e0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1>⚠️ Sistem Hatası</h1>
                            </div>
                            <div class="content">
                                <p><strong>Sayın Yönetici,</strong></p>
                                <p>Sistemde bir hata oluştu. Detaylar aşağıda yer almaktadır.</p>
                                
                                <div class="error-box">
                                    <strong>Hata Mesajı</strong>
                                    <p>%s</p>
                                </div>
                                
                                <div class="details-box">%s</div>
                                
                                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                                    <strong>Zaman:</strong> %s
                                </p>
                                
                                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                                    Lütfen bu hatayı inceleyip gerekli önlemleri alın.
                                </p>
                            </div>
                            <div class="footer">
                                <p><strong>HIEDRA HOME COLLECTION</strong></p>
                                <p>Sistem Bildirim Sistemi</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """, errorMessage, errorDetails != null ? errorDetails : "Detay bulunamadı", timestamp);
    }

    private String buildOrderNotificationEmailTemplate(String orderNumber, String customerEmail, 
                                                       String customerName, java.math.BigDecimal totalAmount) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        String adminUrl = appUrlConfig.getFrontendAdminUrl() + "/orders";
        
        return String.format("""
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
                            background-color: #f5f5f5; 
                            margin: 0; 
                            padding: 0; 
                            line-height: 1.6;
                        }
                        .container { max-width: 600px; margin: 40px auto; padding: 20px; }
                        .card { 
                            background-color: #ffffff; 
                            border-radius: 12px; 
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); 
                            overflow: hidden; 
                            border: 1px solid #e0e0e0; 
                        }
                        .header { 
                            background-color: #000000; 
                            color: #ffffff; 
                            padding: 30px; 
                            text-align: center; 
                        }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                        .content { padding: 30px; color: #1a1a1a; }
                        .info-box {
                            background-color: #f9f9f9;
                            border: 1px solid #e0e0e0;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 8px;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            padding: 8px 0;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        .info-row:last-child { border-bottom: none; }
                        .info-label { font-weight: 600; color: #333; }
                        .info-value { color: #666; }
                        .button {
                            display: inline-block;
                            background-color: #000000;
                            color: #ffffff;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            margin-top: 20px;
                        }
                        .footer { 
                            padding: 20px; 
                            font-size: 12px; 
                            color: #999999; 
                            text-align: center; 
                            background-color: #f9f9f9;
                            border-top: 1px solid #e0e0e0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1>Yeni Sipariş</h1>
                            </div>
                            <div class="content">
                                <p><strong>Sayın Yönetici,</strong></p>
                                <p>Yeni bir sipariş alındı. Detaylar aşağıda yer almaktadır.</p>
                                
                                <div class="info-box">
                                    <div class="info-row">
                                        <span class="info-label">Sipariş No:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Müşteri:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">E-posta:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Toplam Tutar:</span>
                                        <span class="info-value">%s ₺</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Tarih:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                </div>
                                
                                <a href="%s" class="button">Siparişi Görüntüle</a>
                            </div>
                            <div class="footer">
                                <p><strong>HIEDRA HOME COLLECTION</strong></p>
                                <p>Yönetici Bildirim Sistemi</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """, orderNumber, customerName != null ? customerName : "Bilinmiyor", 
                customerEmail, totalAmount != null ? totalAmount.toString() : "0.00", 
                timestamp, adminUrl);
    }

    private String buildUserNotificationEmailTemplate(String userEmail, String userName) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        String adminUrl = appUrlConfig.getFrontendAdminUrl() + "/users";
        
        return String.format("""
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
                            background-color: #f5f5f5; 
                            margin: 0; 
                            padding: 0; 
                            line-height: 1.6;
                        }
                        .container { max-width: 600px; margin: 40px auto; padding: 20px; }
                        .card { 
                            background-color: #ffffff; 
                            border-radius: 12px; 
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); 
                            overflow: hidden; 
                            border: 1px solid #e0e0e0; 
                        }
                        .header { 
                            background-color: #000000; 
                            color: #ffffff; 
                            padding: 30px; 
                            text-align: center; 
                        }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                        .content { padding: 30px; color: #1a1a1a; }
                        .info-box {
                            background-color: #f9f9f9;
                            border: 1px solid #e0e0e0;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 8px;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            padding: 8px 0;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        .info-row:last-child { border-bottom: none; }
                        .info-label { font-weight: 600; color: #333; }
                        .info-value { color: #666; }
                        .button {
                            display: inline-block;
                            background-color: #000000;
                            color: #ffffff;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            margin-top: 20px;
                        }
                        .footer { 
                            padding: 20px; 
                            font-size: 12px; 
                            color: #999999; 
                            text-align: center; 
                            background-color: #f9f9f9;
                            border-top: 1px solid #e0e0e0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1>Yeni Kullanıcı Kaydı</h1>
                            </div>
                            <div class="content">
                                <p><strong>Sayın Yönetici,</strong></p>
                                <p>Yeni bir kullanıcı sisteme kayıt oldu. Detaylar aşağıda yer almaktadır.</p>
                                
                                <div class="info-box">
                                    <div class="info-row">
                                        <span class="info-label">E-posta:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Ad Soyad:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Kayıt Tarihi:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                </div>
                                
                                <a href="%s" class="button">Kullanıcıları Görüntüle</a>
                            </div>
                            <div class="footer">
                                <p><strong>HIEDRA HOME COLLECTION</strong></p>
                                <p>Yönetici Bildirim Sistemi</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """, userEmail, userName != null ? userName : "Bilinmiyor", timestamp, adminUrl);
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
        
        return String.format("""
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif; 
                            background-color: #f5f5f5; 
                            margin: 0; 
                            padding: 0; 
                            line-height: 1.6;
                        }
                        .container { max-width: 600px; margin: 40px auto; padding: 20px; }
                        .card { 
                            background-color: #ffffff; 
                            border-radius: 12px; 
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); 
                            overflow: hidden; 
                            border: 1px solid #e0e0e0; 
                        }
                        .header { 
                            background-color: #000000; 
                            color: #ffffff; 
                            padding: 30px; 
                            text-align: center; 
                        }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                        .content { padding: 30px; color: #1a1a1a; }
                        .info-box {
                            background-color: #f9f9f9;
                            border: 1px solid #e0e0e0;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 8px;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            padding: 8px 0;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        .info-row:last-child { border-bottom: none; }
                        .info-label { font-weight: 600; color: #333; }
                        .info-value { color: #666; }
                        .footer { 
                            padding: 20px; 
                            font-size: 12px; 
                            color: #999999; 
                            text-align: center; 
                            background-color: #f9f9f9;
                            border-top: 1px solid #e0e0e0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1>%s Rapor</h1>
                            </div>
                            <div class="content">
                                <p><strong>Sayın Yönetici,</strong></p>
                                <p>%s raporunuz hazırlanmıştır. Detaylı rapor e-postanıza PDF dosyası olarak eklenmiştir.</p>
                                
                                <div class="info-box">
                                    <div class="info-row">
                                        <span class="info-label">Rapor Tipi:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Tarih Aralığı:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Oluşturulma Tarihi:</span>
                                        <span class="info-value">%s</span>
                                    </div>
                                </div>
                                
                                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                                    PDF dosyasını e-postanızın eklerinden indirebilirsiniz.
                                </p>
                            </div>
                            <div class="footer">
                                <p><strong>HIEDRA HOME COLLECTION</strong></p>
                                <p>Otomatik Rapor Sistemi</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """, reportType, reportType, reportType, dateRange, timestamp);
    }
}


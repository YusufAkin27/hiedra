package eticaret.demo.contact_us;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Validated
public class ContactUsServiceImpl implements ContactUsServis {

    private final ContactUsRepository contactUsRepository;
    private final EmailVerificationRepository verificationRepository;
    private final MailService mailService;
    private final ObjectMapper objectMapper;
    
    // Email regex pattern
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$"
    );
    
    // Spam kontrolü için maksimum mesaj sayısı
    private static final int MAX_MESSAGES_PER_15_MIN = 3;  // 15 dakika içinde maksimum 3 mesaj
    private static final int MAX_MESSAGES_PER_HOUR = 5;     // 1 saat içinde maksimum 5 mesaj
    private static final int MAX_MESSAGES_PER_DAY = 10;     // 24 saat içinde maksimum 10 mesaj

    @Override
    @Transactional
    public ResponseMessage gonder(@Valid ContactUsMessage message) {
        try {
            // 1. Detaylı validasyon kontrolleri
            ResponseMessage validationResult = validateMessage(message);
            if (!validationResult.isSuccess()) {
                log.warn("Mesaj validasyon hatası: {}", validationResult.getMessage());
                return validationResult;
            }
            
            // 2. Spam kontrolü - Aynı email/IP'den çok fazla mesaj gönderilmiş mi?
            ResponseMessage spamCheck = checkSpamProtection(message.getEmail());
            if (!spamCheck.isSuccess()) {
                log.warn("Spam koruması: {}", spamCheck.getMessage());
                return spamCheck;
            }
            
            // 3. Email format kontrolü
            if (!isValidEmail(message.getEmail())) {
                log.warn("Geçersiz email formatı: {}", message.getEmail());
                return new ResponseMessage("Geçerli bir e-posta adresi giriniz.", false);
            }
            
            // 4. Telefon format kontrolü (varsa)
            if (message.getPhone() != null && !message.getPhone().trim().isEmpty()) {
                if (!isValidPhone(message.getPhone())) {
                    log.warn("Geçersiz telefon formatı: {}", message.getPhone());
                    return new ResponseMessage("Geçerli bir telefon numarası formatı giriniz.", false);
                }
            }
            
            // 5. Mesaj içeriği temizleme (XSS koruması)
            String cleanedMessage = sanitizeMessage(message.getMessage());
            String cleanedSubject = sanitizeMessage(message.getSubject());
            String cleanedName = sanitizeName(message.getName());
            
            // 6. Mesajı doğrulama bekleyen olarak kaydet
            ContactUs contactUs = ContactUs.builder()
                    .name(cleanedName)
                    .email(message.getEmail().toLowerCase().trim())
                    .phone(message.getPhone() != null ? message.getPhone().trim() : null)
                    .subject(cleanedSubject)
                    .message(cleanedMessage)
                    .verified(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            contactUsRepository.save(contactUs);
            log.info("Yeni iletişim mesajı kaydedildi: ID={}, Email={}, Subject={}", 
                    contactUs.getId(), contactUs.getEmail(), contactUs.getSubject());

            // 7. 6 haneli doğrulama kodu üret
            String verificationCode = generateVerificationCode();

            // 8. Eski kullanılmamış kodları geçersiz kıl
            invalidateOldCodes(message.getEmail());

            // 9. Kod bilgisini kaydet
            EmailVerificationCode code = new EmailVerificationCode();
            code.setEmail(message.getEmail().toLowerCase().trim());
            code.setCode(verificationCode);
            code.setUsed(false);
            code.setExpiresAt(LocalDateTime.now().plusMinutes(15));
            code.setCreatedAt(LocalDateTime.now());
            verificationRepository.save(code);
            log.info("Doğrulama kodu oluşturuldu: Email={}, Code={}", code.getEmail(), verificationCode);

            // 10. E-posta gönderimi
            try {
                String emailBody = buildVerificationEmail(cleanedName, verificationCode);
            EmailMessage emailMessage = EmailMessage.builder()
                        .toEmail(message.getEmail().toLowerCase().trim())
                        .subject("E-posta Doğrulama Kodu - HIEDRA HOME COLLECTION")
                    .body(emailBody)
                    .isHtml(true)
                    .build();
            mailService.queueEmail(emailMessage);
                log.info("Doğrulama emaili kuyruğa eklendi: {}", message.getEmail());
            } catch (Exception e) {
                log.error("Email gönderilirken hata: {}", e.getMessage(), e);
                // Email gönderilemese bile mesaj kaydedildi, kullanıcıya bilgi ver
                return new ResponseMessage(
                        "Mesajınız kaydedildi ancak doğrulama emaili gönderilemedi. Lütfen daha sonra tekrar deneyin.",
                        false
                );
            }

            // 11. Başarılı yanıt
            return new ResponseMessage(
                    "Mesajınız alındı. Lütfen e-posta adresinize gönderilen doğrulama kodunu girin. (Kod 15 dakika geçerlidir)",
                    true
            );

        } catch (Exception e) {
            log.error("Mesaj gönderilirken beklenmeyen hata: ", e);
            return new ResponseMessage("Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.", false);
        }
    }
    
    /**
     * Mesaj validasyonu
     */
    private ResponseMessage validateMessage(ContactUsMessage message) {
        if (message == null) {
            return new ResponseMessage("Mesaj bilgileri boş olamaz.", false);
        }
        
        // Name kontrolü
        if (message.getName() == null || message.getName().trim().isEmpty()) {
            return new ResponseMessage("Ad Soyad alanı zorunludur.", false);
        }
        if (message.getName().trim().length() < 2) {
            return new ResponseMessage("Ad Soyad en az 2 karakter olmalıdır.", false);
        }
        if (message.getName().trim().length() > 200) {
            return new ResponseMessage("Ad Soyad en fazla 200 karakter olabilir.", false);
        }
        
        // Email kontrolü
        if (message.getEmail() == null || message.getEmail().trim().isEmpty()) {
            return new ResponseMessage("E-posta adresi zorunludur.", false);
        }
        if (message.getEmail().trim().length() > 255) {
            return new ResponseMessage("E-posta adresi çok uzun.", false);
        }
        
        // Subject kontrolü
        if (message.getSubject() == null || message.getSubject().trim().isEmpty()) {
            return new ResponseMessage("Konu alanı zorunludur.", false);
        }
        if (message.getSubject().trim().length() < 3) {
            return new ResponseMessage("Konu en az 3 karakter olmalıdır.", false);
        }
        if (message.getSubject().trim().length() > 500) {
            return new ResponseMessage("Konu en fazla 500 karakter olabilir.", false);
        }
        
        // Message kontrolü
        if (message.getMessage() == null || message.getMessage().trim().isEmpty()) {
            return new ResponseMessage("Mesaj alanı zorunludur.", false);
        }
        if (message.getMessage().trim().length() < 10) {
            return new ResponseMessage("Mesaj en az 10 karakter olmalıdır.", false);
        }
        if (message.getMessage().trim().length() > 5000) {
            return new ResponseMessage("Mesaj en fazla 5000 karakter olabilir.", false);
        }
        
        // Phone kontrolü (opsiyonel)
        if (message.getPhone() != null && !message.getPhone().trim().isEmpty()) {
            if (message.getPhone().trim().length() > 20) {
                return new ResponseMessage("Telefon numarası en fazla 20 karakter olabilir.", false);
            }
        }
        
        return new ResponseMessage("Validasyon başarılı", true);
    }
    
    /**
     * Spam koruması kontrolü (optimize edilmiş sorgular ile)
     */
    private ResponseMessage checkSpamProtection(String email) {
        LocalDateTime now = LocalDateTime.now();
        String normalizedEmail = email.toLowerCase().trim();
        
        // Son 15 dakika içindeki mesaj sayısı (optimize edilmiş sorgu)
        LocalDateTime fifteenMinutesAgo = now.minusMinutes(15);
        long recentMessages = contactUsRepository.countByEmailAndCreatedAtAfter(normalizedEmail, fifteenMinutesAgo);
        
        if (recentMessages >= MAX_MESSAGES_PER_15_MIN) {
            log.warn("Spam koruması: 15 dakika limiti aşıldı - Email={}, Count={}", normalizedEmail, recentMessages);
            return new ResponseMessage(
                    "Çok fazla mesaj gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.",
                    false
            );
        }
        
        // Son 1 saat içindeki mesaj sayısı (optimize edilmiş sorgu)
        LocalDateTime oneHourAgo = now.minusHours(1);
        long hourlyMessages = contactUsRepository.countByEmailAndCreatedAtAfter(normalizedEmail, oneHourAgo);
        
        if (hourlyMessages >= MAX_MESSAGES_PER_HOUR) {
            log.warn("Spam koruması: Saatlik limit aşıldı - Email={}, Count={}", normalizedEmail, hourlyMessages);
            return new ResponseMessage(
                    "Saatlik mesaj limitine ulaştınız. Lütfen 1 saat sonra tekrar deneyin.",
                    false
            );
        }
        
        // Son 24 saat içindeki mesaj sayısı (optimize edilmiş sorgu)
        LocalDateTime oneDayAgo = now.minusDays(1);
        long dailyMessages = contactUsRepository.countByEmailAndCreatedAtAfter(normalizedEmail, oneDayAgo);
        
        if (dailyMessages >= MAX_MESSAGES_PER_DAY) {
            log.warn("Spam koruması: Günlük limit aşıldı - Email={}, Count={}", normalizedEmail, dailyMessages);
            return new ResponseMessage(
                    "Günlük mesaj limitine ulaştınız. Lütfen yarın tekrar deneyin.",
                    false
            );
        }
        
        return new ResponseMessage("Spam kontrolü başarılı", true);
    }
    
    /**
     * Email format kontrolü
     */
    private boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email.trim().toLowerCase()).matches();
    }
    
    /**
     * Telefon format kontrolü
     */
    private boolean isValidPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return true; // Telefon opsiyonel
        }
        String cleaned = phone.trim().replaceAll("[\\s\\-()]", "");
        return cleaned.length() >= 10 && cleaned.length() <= 15;
    }
    
    /**
     * Mesaj içeriğini temizle (XSS koruması)
     */
    private String sanitizeMessage(String message) {
        if (message == null) {
            return "";
        }
        // HTML tag'lerini kaldır ama satır sonlarını koru
        return message.trim()
                .replaceAll("<script[^>]*>.*?</script>", "")
                .replaceAll("<[^>]+>", "")
                .replaceAll("javascript:", "")
                .replaceAll("on\\w+=", "");
    }
    
    /**
     * İsim içeriğini temizle
     */
    private String sanitizeName(String name) {
        if (name == null) {
            return "";
        }
        return name.trim()
                .replaceAll("<[^>]+>", "")
                .replaceAll("[<>\"'&]", "");
    }
    
    /**
     * Doğrulama kodu üret
     */
    private String generateVerificationCode() {
        return String.format("%06d", new Random().nextInt(999999));
    }
    
    /**
     * Eski kullanılmamış kodları geçersiz kıl (optimize edilmiş)
     */
    private void invalidateOldCodes(String email) {
        // Email'e göre kullanılmamış kodları getir
        List<EmailVerificationCode> oldCodes = verificationRepository.findByEmailIgnoreCaseAndUsedFalse(email)
                .stream()
                .filter(c -> c.getExpiresAt().isAfter(LocalDateTime.now()))
                .toList();
        
        // Toplu güncelleme
        for (EmailVerificationCode code : oldCodes) {
            code.setUsed(true);
            verificationRepository.save(code);
        }
        
        if (!oldCodes.isEmpty()) {
            log.info("Eski doğrulama kodları geçersiz kılındı: Email={}, Count={}", email, oldCodes.size());
        }
    }

    @Override
    @Transactional
    public ResponseMessage verifyEmail(String verificationData) {
        try {
            // 1. Veri formatı kontrolü
            if (verificationData == null || verificationData.trim().isEmpty()) {
                return new ResponseMessage("Doğrulama kodu boş olamaz.", false);
            }
            
            // 2. JSON parse
            String code;
            try {
            var data = objectMapper.readTree(verificationData);
                if (!data.has("code")) {
                    return new ResponseMessage("Doğrulama kodu bulunamadı.", false);
                }
                code = data.get("code").asText().trim();
            } catch (Exception e) {
                log.error("JSON parse hatası: {}", e.getMessage());
                return new ResponseMessage("Geçersiz veri formatı.", false);
            }
            
            // 3. Kod format kontrolü
            if (code.length() != 6 || !code.matches("^[0-9]{6}$")) {
                log.warn("Geçersiz kod formatı: {}", code);
                return new ResponseMessage("Doğrulama kodu 6 haneli sayı olmalıdır.", false);
            }

            // 4. Kod geçerliliğini kontrol et
            var verificationOpt = verificationRepository
                    .findTopByCodeAndUsedFalseOrderByCreatedAtDesc(code);

            if (verificationOpt.isEmpty()) {
                log.warn("Kullanılmamış kod bulunamadı: {}", code);
                return new ResponseMessage("Geçersiz doğrulama kodu! Lütfen doğru kodu giriniz.", false);
            }

            EmailVerificationCode verification = verificationOpt.get();

            // 5. Süresi dolmuş mu kontrol et
            if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
                log.warn("Kod süresi dolmuş: Code={}, ExpiresAt={}", code, verification.getExpiresAt());
                verification.setUsed(true); // Süresi dolmuş kodu işaretle
                verificationRepository.save(verification);
                return new ResponseMessage("Doğrulama kodunun süresi dolmuş! Lütfen yeni bir kod isteyiniz.", false);
            }

            // 6. Kodu kullanıldı olarak işaretle
            verification.setUsed(true);
            verificationRepository.save(verification);
            log.info("Doğrulama kodu kullanıldı: Email={}, Code={}", verification.getEmail(), code);

            // 7. Koda bağlı email bilgisini al
            String email = verification.getEmail().toLowerCase().trim();

            // 8. Bu email adresine ait son doğrulanmamış mesajı bul ve doğrula (optimize edilmiş sorgu)
            var contactOpt = contactUsRepository.findFirstByEmailIgnoreCaseAndVerifiedFalseOrderByCreatedAtDesc(email);

            if (contactOpt.isEmpty()) {
                log.warn("Doğrulanacak mesaj bulunamadı: Email={}", email);
                return new ResponseMessage(
                        "Bu kod için doğrulanacak mesaj bulunamadı. Lütfen yeni bir mesaj gönderiniz.",
                        false
                );
            }

            ContactUs contact = contactOpt.get();
                        contact.setVerified(true);
                        contactUsRepository.save(contact);
            log.info("Mesaj doğrulandı: ID={}, Email={}, Subject={}", 
                    contact.getId(), contact.getEmail(), contact.getSubject());

            return new ResponseMessage(
                    "E-posta adresiniz başarıyla doğrulandı! Mesajınız en kısa sürede yanıtlanacaktır. Teşekkür ederiz.",
                    true
            );

        } catch (Exception e) {
            log.error("Doğrulama işlemi sırasında beklenmeyen hata: ", e);
            return new ResponseMessage("Doğrulama işlemi başarısız. Lütfen daha sonra tekrar deneyin.", false);
        }
    }

    @Override
    public ResponseMessage getAllMessages() {
        try {
            // Sadece doğrulanmış mesajları getir (optimize edilmiş sorgu)
            List<ContactUs> messages = contactUsRepository.findByVerifiedTrue().stream()
                    .sorted((m1, m2) -> m2.getCreatedAt().compareTo(m1.getCreatedAt()))
                    .toList();

            log.info("Doğrulanmış mesajlar getirildi: Count={}", messages.size());
            return new DataResponseMessage<>(
                    String.format("%d adet mesaj başarıyla getirildi", messages.size()), 
                    true, 
                    messages
            );

        } catch (Exception e) {
            log.error("Mesajlar getirilirken hata: ", e);
            return new ResponseMessage("Mesajlar getirilemedi. Lütfen daha sonra tekrar deneyin.", false);
        }
    }

    @Override
    @Transactional
    public ResponseMessage respondToMessage(Long messageId, String response) {
        try {
            // 1. Mesaj ID kontrolü
            if (messageId == null || messageId <= 0) {
                return new ResponseMessage("Geçersiz mesaj ID.", false);
            }
            
            // 2. Yanıt mesajı kontrolü
            if (response == null || response.trim().isEmpty()) {
                return new ResponseMessage("Yanıt mesajı boş olamaz.", false);
            }
            if (response.trim().length() < 5) {
                return new ResponseMessage("Yanıt mesajı en az 5 karakter olmalıdır.", false);
            }
            if (response.trim().length() > 5000) {
                return new ResponseMessage("Yanıt mesajı en fazla 5000 karakter olabilir.", false);
            }
            
            // 3. Mesajı bul
            var contactOpt = contactUsRepository.findById(messageId);
            
            if (contactOpt.isEmpty()) {
                log.warn("Mesaj bulunamadı: ID={}", messageId);
                return new ResponseMessage("Mesaj bulunamadı!", false);
            }

            ContactUs contact = contactOpt.get();

            // 4. Mesaj doğrulama kontrolü
            if (!contact.isVerified()) {
                log.warn("Doğrulanmamış mesaja yanıt verilmeye çalışıldı: ID={}", messageId);
                return new ResponseMessage(
                        "Bu mesaj henüz doğrulanmamış. Önce mesajın doğrulanması gerekiyor.", 
                        false
                );
            }
            
            // 5. Zaten yanıt verilmiş mi kontrolü
            if (contact.isResponded()) {
                log.warn("Zaten yanıt verilmiş mesaja tekrar yanıt verilmeye çalışıldı: ID={}", messageId);
                return new ResponseMessage(
                        "Bu mesaja zaten yanıt verilmiş. Güncelleme yapmak için farklı bir yöntem kullanın.", 
                        false
                );
            }

            // 6. Yanıt mesajını temizle (XSS koruması)
            String cleanedResponse = sanitizeMessage(response);

            // 7. Admin cevabını kaydet
            contact.setAdminResponse(cleanedResponse);
            contact.setRespondedAt(LocalDateTime.now());
            contact.setRespondedBy("Admin");
            contact.setResponded(true);
            contact = contactUsRepository.save(contact);
            log.info("Admin yanıtı kaydedildi: ID={}, Email={}", contact.getId(), contact.getEmail());

            // 8. Kullanıcıya mail gönder
            try {
            String emailBody = buildResponseEmail(
                    contact.getName(), 
                    contact.getSubject(), 
                    contact.getMessage(), // Orijinal mesaj
                        cleanedResponse // Admin cevabı
            );
            
            EmailMessage emailMessage = EmailMessage.builder()
                    .toEmail(contact.getEmail())
                    .subject("Re: " + contact.getSubject())
                    .body(emailBody)
                    .isHtml(true)
                    .build();

            mailService.queueEmail(emailMessage);
                log.info("Yanıt emaili kuyruğa eklendi: Email={}", contact.getEmail());
            } catch (Exception e) {
                log.error("Yanıt emaili gönderilirken hata: {}", e.getMessage(), e);
                // Email gönderilemese bile yanıt kaydedildi
                return new ResponseMessage(
                        "Yanıt kaydedildi ancak email gönderilemedi. Lütfen manuel olarak kontrol edin: " + contact.getEmail(), 
                        false
                );
            }

            return new ResponseMessage(
                    String.format("Yanıt başarıyla gönderildi: %s (Mesaj ID: %d)", contact.getEmail(), contact.getId()), 
                    true
            );

        } catch (Exception e) {
            log.error("Yanıt gönderilirken beklenmeyen hata: ", e);
            return new ResponseMessage("Yanıt gönderilemedi. Lütfen daha sonra tekrar deneyin.", false);
        }
    }

    private String buildVerificationEmail(String name, String code) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                    .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📧 Email Doğrulama</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>%s</strong>,</p>
                        <p>Bize ulaştığınız için teşekkür ederiz. Email adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
                        
                        <div class="code-box">
                            <div class="code">%s</div>
                        </div>
                        
                        <p><strong>⏰ Bu kod 15 dakika geçerlidir.</strong></p>
                        <p>Eğer bu işlemi siz yapmadıysanız, bu emaili dikkate almayın.</p>
                    </div>
                    <div class="footer">
                        <p>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
                    </div>
                </div>
            </body>
            </html>
            """, name, code);
    }
    private String buildResponseEmail(String name, String subject, String originalMessage, String response) {
        String formattedOriginal = originalMessage != null 
            ? originalMessage.replace("\n", "<br>").replace("\r", "") 
            : "";
        String formattedResponse = response.replace("\n", "<br>").replace("\r", "");
        
        return String.format("""
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.7; 
                        color: #2d3748; 
                        background-color: #f7fafc;
                        padding: 20px;
                    }
                    .email-wrapper {
                        max-width: 650px; 
                        margin: 0 auto; 
                        background: #ffffff;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                    }
                    .header { 
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); 
                        color: white; 
                        padding: 50px 40px; 
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }
                    .header::before {
                        content: '';
                        position: absolute;
                        top: -50%%;
                        right: -50%%;
                        width: 200%%;
                        height: 200%%;
                        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%%, transparent 70%%);
                    }
                    .header h1 {
                        font-size: 28px;
                        font-weight: 700;
                        margin-bottom: 10px;
                        position: relative;
                        z-index: 1;
                    }
                    .header p {
                        font-size: 16px;
                        opacity: 0.95;
                        position: relative;
                        z-index: 1;
                    }
                    .content { 
                        background: #ffffff; 
                        padding: 45px 40px; 
                    }
                    .greeting {
                        font-size: 18px;
                        color: #2d3748;
                        margin-bottom: 25px;
                        font-weight: 600;
                    }
                    .intro-text {
                        font-size: 16px;
                        color: #4a5568;
                        margin-bottom: 30px;
                        line-height: 1.8;
                    }
                    .info-card {
                        background: linear-gradient(135deg, #f6f8fb 0%%, #e9ecef 100%%);
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 25px;
                        border-left: 4px solid #667eea;
                    }
                    .info-card strong {
                        color: #667eea;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        display: block;
                        margin-bottom: 8px;
                    }
                    .info-card .subject-text {
                        font-size: 18px;
                        color: #2d3748;
                        font-weight: 600;
                    }
                    .message-section {
                        margin: 35px 0;
                    }
                    .section-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #2d3748;
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .section-title::before {
                        content: '';
                        width: 4px;
                        height: 20px;
                        background: #667eea;
                        border-radius: 2px;
                    }
                    .original-message { 
                        background: #f8f9fa; 
                        padding: 25px; 
                        border-left: 4px solid #6c757d; 
                        margin: 20px 0; 
                        border-radius: 8px; 
                        font-size: 15px;
                        color: #495057;
                        line-height: 1.8;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    }
                    .response-box { 
                        background: linear-gradient(135deg, #e8f5e9 0%%, #c8e6c9 100%%); 
                        padding: 30px; 
                        border-left: 5px solid #4caf50; 
                        margin: 25px 0; 
                        border-radius: 10px;
                        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
                    }
                    .response-box strong {
                        color: #2e7d32;
                        font-size: 16px;
                        display: block;
                        margin-bottom: 12px;
                    }
                    .response-content {
                        font-size: 16px;
                        color: #1b5e20;
                        line-height: 1.9;
                        white-space: pre-wrap;
                    }
                    .divider {
                        height: 1px;
                        background: linear-gradient(to right, transparent, #e2e8f0, transparent);
                        margin: 35px 0;
                    }
                    .cta-section {
                        background: #f0f4f8;
                        padding: 25px;
                        border-radius: 12px;
                        margin: 30px 0;
                        text-align: center;
                    }
                    .cta-section p {
                        font-size: 15px;
                        color: #4a5568;
                        margin-bottom: 15px;
                    }
                    .contact-info {
                        background: #fff9e6;
                        padding: 20px;
                        border-radius: 10px;
                        border: 2px solid #ffd700;
                        margin: 25px 0;
                    }
                    .contact-info p {
                        font-size: 14px;
                        color: #856404;
                        margin: 5px 0;
                    }
                    .footer { 
                        background: #2d3748;
                        color: #cbd5e0;
                        text-align: center; 
                        padding: 35px 40px;
                        font-size: 13px;
                        line-height: 1.8;
                    }
                    .footer .brand {
                        font-size: 18px;
                        font-weight: 700;
                        color: #ffffff;
                        margin-bottom: 10px;
                    }
                    .footer a {
                        color: #667eea;
                        text-decoration: none;
                    }
                    .footer a:hover {
                        text-decoration: underline;
                    }
                    .social-links {
                        margin: 20px 0;
                    }
                    .social-links a {
                        display: inline-block;
                        margin: 0 10px;
                        color: #cbd5e0;
                        font-size: 14px;
                    }
                    @media only screen and (max-width: 600px) {
                        .content { padding: 30px 25px; }
                        .header { padding: 35px 25px; }
                        .header h1 { font-size: 24px; }
                    }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="header">
                        <h1>Mesajınıza Yanıt</h1>
                        <p>HIEDRA HOME COLLECTION</p>
                    </div>
                    <div class="content">
                        <div class="greeting">
                            Merhaba <strong style="color: #667eea;">%s</strong>,
                        </div>
                        
                        <div class="intro-text">
                            Bize ulaştığınız için teşekkür ederiz. Mesajınızı inceledik ve size aşağıdaki yanıtı vermek istiyoruz.
                        </div>
                        
                        <div class="info-card">
                            <strong>Mesaj Konusu</strong>
                            <div class="subject-text">%s</div>
                        </div>
                        
                        <div class="message-section">
                            <div class="section-title">Orijinal Mesajınız</div>
                            <div class="original-message">
                                %s
                            </div>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div class="message-section">
                            <div class="section-title">Yanıtımız</div>
                            <div class="response-box">
                                <strong>✓</strong>
                                <div class="response-content">%s</div>
                            </div>
                        </div>
                        
                        <div class="cta-section">
                            <p><strong>Başka sorularınız mı var?</strong></p>
                            <p>Bizimle iletişime geçmekten çekinmeyin. Size yardımcı olmaktan mutluluk duyarız.</p>
                            <p style="margin-top: 15px; font-size: 14px; color: #667eea;">
                                Bu emaile yanıt vererek bizimle iletişime geçebilirsiniz.
                            </p>
                        </div>
                        
                        <div class="contact-info">
                            <p><strong>📧 E-posta:</strong> destek@hiedra.com</p>
                            <p><strong>📞 Telefon:</strong> +90 (212) 123 45 67</p>
                            <p><strong>🕒 Çalışma Saatleri:</strong> Pazartesi - Cuma, 09:00 - 18:00</p>
                        </div>
                    </div>
                    <div class="footer">
                        <div class="brand">HIEDRA HOME COLLECTION</div>
                        <p>Ev dekorasyonunda kalite ve şıklığın adresi</p>
                        <div class="social-links">
                            <a href="#">Web Sitemiz</a> | 
                            <a href="#">Instagram</a> | 
                            <a href="#">Facebook</a>
                        </div>
                        <p style="margin-top: 20px; font-size: 12px; color: #718096;">
                            Bu e-posta %s adresine gönderilmiştir.<br>
                            © 2024 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """, 
            name, 
            subject, 
            formattedOriginal,
            formattedResponse,
            name);
    }

}
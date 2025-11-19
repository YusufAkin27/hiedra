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
import eticaret.demo.mail.EmailTemplateBuilder;
import eticaret.demo.mail.EmailTemplateModel;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
                // Ancak mesaj kaydedildiği için başarılı yanıt döndür
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
                    "E-posta adresiniz başarıyla doğrulandı! Mesajınız alındı ve en kısa sürede size e-posta yoluyla dönüş yapacağız. Teşekkür ederiz.",
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
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Geçerlilik", "15 dakika");
        details.put("Kullanım", "Kod tek kullanımlıktır");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("İletişim Doğrulama Kodunuz")
                .preheader("Mesajınızı tamamlamak için doğrulama kodu.")
                .greeting("Merhaba " + name + ",")
                .paragraphs(List.of(
                        "Bize ulaştığınız için teşekkür ederiz. Mesajınızın size ait olduğunu doğrulamak için kodu girmeniz yeterli.",
                        "İşlemi siz başlatmadıysanız bu e-postayı dikkate almayabilirsiniz."
                ))
                .details(details)
                .highlight("Doğrulama Kodunuz: " + code)
                .footerNote("Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.")
                .build());
    }
    private String buildResponseEmail(String name, String subject, String originalMessage, String response) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Konu", subject);

        String sanitizedOriginal = originalMessage == null ? "" : originalMessage.replace("\r", "");
        String sanitizedResponse = response.replace("\r", "");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("İletişiminize Yanıt")
                .preheader("Hiedra destek ekibinden yeni mesajınız var.")
                .greeting("Merhaba " + name + ",")
                .paragraphs(List.of(
                        "Bize gönderdiğiniz mesajın özeti: " + sanitizedOriginal,
                        "Yanıtımız: " + sanitizedResponse
                ))
                .details(details)
                .footerNote("Ek sorularınız için info@hiedra.com.tr adresine yazabilirsiniz.")
                .build());
    }

}
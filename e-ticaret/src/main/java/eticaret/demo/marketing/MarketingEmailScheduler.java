package eticaret.demo.marketing;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.auth.AppUser;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.mail.EmailTemplateBuilder;
import eticaret.demo.mail.EmailTemplateModel;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Marketing email scheduler - Kullanıcılara periyodik olarak farklı pazarlama mailleri gönderir
 * Gelişmiş kontroller, rate limiting ve spam koruması ile
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MarketingEmailScheduler {

    private final EmailPreferenceRepository emailPreferenceRepository;
    private final ProductRepository productRepository;
    private final MailService mailService;
    private final Random random = new Random();
    
    // Rate limiting ayarları
    private static final int MAX_EMAILS_PER_BATCH = 100; // Her batch'te maksimum email sayısı
    private static final int MIN_EMAIL_INTERVAL_DAYS = 7; // Minimum email gönderim aralığı
    private static final int MAX_DAILY_EMAILS = 500; // Günlük maksimum email sayısı
    private static final int BATCH_DELAY_MS = 1000; // Batch'ler arası bekleme süresi (ms)
    
    // Email şablon sayısı
    private static final int EMAIL_TEMPLATE_COUNT = 5;

    /**
     * Her Pazartesi ve Perşembe saat 10:00'da marketing email gönder
     * Farklı mesaj şablonları kullanır
     */
    @Scheduled(cron = "0 0 10 * * MON,THU") // Pazartesi ve Perşembe saat 10:00
    @Transactional
    public void sendMarketingEmails() {
        log.info("=== Marketing email gönderim işlemi başlatılıyor ===");
        LocalDateTime startTime = LocalDateTime.now();
        
        try {
            // 1. Uygun kullanıcıları bul
            LocalDateTime since = LocalDateTime.now().minusDays(MIN_EMAIL_INTERVAL_DAYS);
            
            List<EmailPreference> eligibleUsers = emailPreferenceRepository
                    .findUsersEligibleForMarketingEmail(since);
            
            // 2. Minimum interval kontrolü (Java tarafında)
            eligibleUsers = eligibleUsers.stream()
                    .filter(pref -> {
                        if (pref.getLastMarketingEmailSentAt() == null) {
                            return true;
                        }
                        LocalDateTime nextAllowedDate = pref.getLastMarketingEmailSentAt()
                                .plusDays(pref.getMinEmailIntervalDays());
                        return LocalDateTime.now().isAfter(nextAllowedDate) || 
                               LocalDateTime.now().isEqual(nextAllowedDate);
                    })
                    .collect(Collectors.toList());
            
            if (eligibleUsers.isEmpty()) {
                log.info("Marketing email gönderilecek uygun kullanıcı bulunamadı.");
                return;
            }
            
            log.info("Toplam uygun kullanıcı sayısı: {}", eligibleUsers.size());
            
            // 2. Rate limiting - Günlük limit kontrolü
            int dailySentCount = getDailySentEmailCount();
            if (dailySentCount >= MAX_DAILY_EMAILS) {
                log.warn("Günlük email limiti aşıldı: {}/{}. İşlem iptal edildi.", 
                        dailySentCount, MAX_DAILY_EMAILS);
                return;
            }
            
            // 3. Batch'ler halinde gönder (rate limiting için)
            int totalSent = 0;
            int totalSkipped = 0;
            int totalErrors = 0;
            
            for (int i = 0; i < eligibleUsers.size(); i += MAX_EMAILS_PER_BATCH) {
                int endIndex = Math.min(i + MAX_EMAILS_PER_BATCH, eligibleUsers.size());
                List<EmailPreference> batch = eligibleUsers.subList(i, endIndex);
                
                log.info("Batch {}/{} işleniyor ({} kullanıcı)...", 
                        (i / MAX_EMAILS_PER_BATCH) + 1, 
                        (eligibleUsers.size() + MAX_EMAILS_PER_BATCH - 1) / MAX_EMAILS_PER_BATCH,
                        batch.size());
                
                BatchResult batchResult = processBatch(batch);
                totalSent += batchResult.sent;
                totalSkipped += batchResult.skipped;
                totalErrors += batchResult.errors;
                
                // Günlük limit kontrolü
                if (dailySentCount + totalSent >= MAX_DAILY_EMAILS) {
                    log.warn("Günlük email limitine yaklaşıldı. İşlem durduruldu.");
                    break;
                }
                
                // Batch'ler arası bekleme (rate limiting)
                if (endIndex < eligibleUsers.size()) {
                    try {
                        Thread.sleep(BATCH_DELAY_MS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        log.warn("Batch bekleme sırasında kesinti: {}", e.getMessage());
                        break;
                    }
                }
            }
            
            // 4. İstatistikler
            LocalDateTime endTime = LocalDateTime.now();
            long durationSeconds = java.time.Duration.between(startTime, endTime).getSeconds();
            
            log.info("=== Marketing email işlemi tamamlandı ===");
            log.info("Toplam süre: {} saniye", durationSeconds);
            log.info("Gönderilen: {}, Atlanan: {}, Hatalar: {}", 
                    totalSent, totalSkipped, totalErrors);
            log.info("Başarı oranı: {}%", 
                    totalSent > 0 ? (totalSent * 100 / (totalSent + totalSkipped + totalErrors)) : 0);
            
        } catch (Exception e) {
            log.error("Marketing email işlemi sırasında kritik hata: ", e);
        }
    }
    
    /**
     * Batch işleme
     */
    private BatchResult processBatch(List<EmailPreference> batch) {
        int sent = 0;
        int skipped = 0;
        int errors = 0;
        
        for (EmailPreference preference : batch) {
            try {
                AppUser user = preference.getUser();
                
                // 1. Kullanıcı validasyonu
                if (user == null) {
                    log.warn("EmailPreference için kullanıcı bulunamadı: PreferenceId={}", preference.getId());
                    skipped++;
                    continue;
                }
                
                // 2. Email adresi validasyonu
                if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                    log.warn("Kullanıcı email adresi boş: UserId={}", user.getId());
                    skipped++;
                    continue;
                }
                
                // 3. Email format kontrolü
                if (!isValidEmail(user.getEmail())) {
                    log.warn("Geçersiz email formatı: {}", user.getEmail());
                    preference.recordBounce();
                    emailPreferenceRepository.save(preference);
                    skipped++;
                    continue;
                }
                
                // 4. Kullanıcı durumu kontrolü
                if (!user.isActive()) {
                    log.debug("Kullanıcı aktif değil, atlanıyor: UserId={}", user.getId());
                    skipped++;
                    continue;
                }
                
                if (!user.isEmailVerified()) {
                    log.debug("Email doğrulanmamış, atlanıyor: UserId={}", user.getId());
                    skipped++;
                    continue;
                }
                
                // 5. Email gönderilebilirlik kontrolü
                if (!preference.canSendEmail()) {
                    log.debug("Email gönderilemez durumda: UserId={}, Unsubscribed={}, BounceCount={}", 
                            user.getId(), preference.isUnsubscribed(), preference.getBounceCount());
                    skipped++;
                    continue;
                }
                
                // 6. Email gönder
                boolean emailSent = sendMarketingEmail(user, preference);
                
                if (emailSent) {
                    // 7. Tercihleri güncelle
                    LocalDateTime now = LocalDateTime.now();
                    preference.setLastMarketingEmailSentAt(now);
                    preference.setTotalMarketingEmailsSent(preference.getTotalMarketingEmailsSent() + 1);
                    emailPreferenceRepository.save(preference);
                    sent++;
                    
                    log.debug("Marketing email gönderildi: UserId={}, Email={}, TemplateIndex={}", 
                            user.getId(), user.getEmail(), preference.getLastEmailTemplateIndex());
                } else {
                    errors++;
                    log.warn("Email gönderilemedi: UserId={}, Email={}", user.getId(), user.getEmail());
                }
                
            } catch (Exception e) {
                errors++;
                log.error("Kullanıcı {} için marketing email gönderilirken hata: {}", 
                        preference.getUser() != null ? preference.getUser().getEmail() : "Unknown", 
                        e.getMessage(), e);
                
                // Bounce kaydı (email gönderim hatası)
                try {
                    preference.recordBounce();
                    emailPreferenceRepository.save(preference);
                } catch (Exception saveException) {
                    log.error("Bounce kaydı yapılamadı: {}", saveException.getMessage());
                }
            }
        }
        
        return new BatchResult(sent, skipped, errors);
    }

    /**
     * Marketing email gönder
     * @return Email başarıyla gönderildi mi?
     */
    private boolean sendMarketingEmail(AppUser user, EmailPreference preference) {
        try {
            // 1. Şablon seçimi (rotasyon)
            int templateIndex = (preference.getLastEmailTemplateIndex() + 1) % EMAIL_TEMPLATE_COUNT;
            
            String subject;
            String htmlContent;
            
            // 2. Şablon oluştur
            switch (templateIndex) {
                case 0:
                    subject = "Yeni Ürünlerimizi Keşfedin! 🎨";
                    htmlContent = buildNewProductsEmail(user);
                    break;
                case 1:
                    subject = "Özel Fırsatlar Sizi Bekliyor! ✨";
                    htmlContent = buildSpecialOffersEmail(user);
                    break;
                case 2:
                    subject = "Ev Dekorasyonunda İlham Alın! 🏠";
                    htmlContent = buildInspirationEmail(user);
                    break;
                case 3:
                    subject = "Sitemizi Ziyaret Edin, Farkı Görün! 👀";
                    htmlContent = buildVisitWebsiteEmail(user);
                    break;
                case 4:
                    subject = "Size Özel Ürün Önerilerimiz Var! 💡";
                    htmlContent = buildProductRecommendationEmail(user);
                    break;
                default:
                    subject = "HIEDRA HOME COLLECTION'den Özel Mesajınız! 📧";
                    htmlContent = buildGenericMarketingEmail(user);
            }
            
            // 3. Email mesajı oluştur
            EmailMessage emailMessage = EmailMessage.builder()
                    .toEmail(user.getEmail())
                    .subject(subject)
                    .body(htmlContent)
                    .isHtml(true)
                    .build();
            
            // 4. Email gönder
            mailService.queueEmail(emailMessage);
            
            // 5. Şablon indeksini güncelle
            preference.setLastEmailTemplateIndex(templateIndex);
            
            return true;
            
        } catch (Exception e) {
            log.error("Email gönderim hatası: UserId={}, Email={}, Error={}", 
                    user.getId(), user.getEmail(), e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Email format kontrolü
     */
    private boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        
        // Basit email regex kontrolü
        String emailRegex = "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$";
        return email.matches(emailRegex);
    }
    
    /**
     * Günlük gönderilen email sayısını al
     * Gerçek uygulamada ayrı bir tablo veya cache kullanılabilir
     */
    private int getDailySentEmailCount() {
        // TODO: Günlük email sayısını veritabanından veya cache'den al
        // Şimdilik 0 döndürüyoruz (rate limiting devre dışı)
        return 0;
    }
    
    /**
     * Batch sonuç sınıfı
     */
    private static class BatchResult {
        final int sent;
        final int skipped;
        final int errors;
        
        BatchResult(int sent, int skipped, int errors) {
            this.sent = sent;
            this.skipped = skipped;
            this.errors = errors;
        }
    }

    /**
     * Yeni ürünler email şablonu
     */
    private String buildNewProductsEmail(AppUser user) {
        try {
            List<Product> allProducts = productRepository.findAll();
            
            if (allProducts.isEmpty()) {
                return buildGenericMarketingEmail(user);
            }
            
            // Rastgele 3 ürün seç (tekrar olmadan)
            List<Product> selectedProducts = allProducts.stream()
                    .collect(Collectors.collectingAndThen(
                        Collectors.toList(),
                        list -> {
                            Collections.shuffle(list, random);
                            return list.stream().limit(3).collect(Collectors.toList());
                        }
                    ));
            
            LinkedHashMap<String, String> details = new LinkedHashMap<>();
            for (Product product : selectedProducts) {
                String description = product.getDescription() != null && product.getDescription().length() > 100
                        ? product.getDescription().substring(0, 100) + "..."
                        : (product.getDescription() != null ? product.getDescription() : "Kaliteli ve şık perde seçenekleri");
                details.put(sanitizeHtml(product.getName()),
                        sanitizeHtml(description) + " • " + formatPrice(product.getPrice()));
            }

            return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                    .title("Yeni Ürünlerimiz Hazır!")
                    .preheader("Koleksiyonumuza eklenen en yeni tasarımlar.")
                    .greeting("Merhaba " + sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz") + ",")
                    .paragraphs(List.of(
                            "Koleksiyonumuza yeni eklenen ürünleri keşfetmeye hazır mısınız? Size özel seçtiğimiz ürünler aşağıda.",
                            "Ev dekorasyonunuzda kalite ve şıklığı bir araya getirin!"
                    ))
                    .details(details)
                    .actionText("Tüm Ürünleri Görüntüle")
                    .actionUrl("https://yusufakin.online/products")
                    .footerNote("Bu e-posta otomatik gönderilmiştir; abonelik tercihlerinizi güncellemek için hesabınızı ziyaret edebilirsiniz.")
                    .build());
        } catch (Exception e) {
            log.error("Yeni ürünler email şablonu oluşturulurken hata: {}", e.getMessage());
            return buildGenericMarketingEmail(user);
        }
    }

    /**
     * Özel fırsatlar email şablonu
     */
    private String buildSpecialOffersEmail(AppUser user) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Kampanya", "Özel indirimler ve sınırlı süreli fırsatlar sizi bekliyor");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Özel Fırsatlar Sizi Bekliyor!")
                .preheader("Limiti kampanyalarla evinize değer katın.")
                .greeting("Merhaba " + sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz") + ",")
                .paragraphs(List.of(
                        "Size özel hazırladığımız fırsatları kaçırmayın! Ev dekorasyonunuzu yenilerken kalite ve uygun fiyatı bir arada bulun.",
                        "Sitemizi ziyaret edin ve kampanyaları keşfedin."
                ))
                .details(details)
                .actionText("Fırsatları Görüntüle")
                .actionUrl("https://yusufakin.online")
                .footerNote("Bu fırsatlar sınırlı süre için geçerlidir.")
                .build());
    }

    /**
     * İlham email şablonu
     */
    private String buildInspirationEmail(AppUser user) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Dekorasyon İpuçları", "Doğru perde seçimiyle mekanınızı büyütün; renk uyumuyla modern bir görünüm yakalayın; kaliteli kumaşlar uzun ömür sağlar.");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Ev Dekorasyonunda İlham Alın")
                .preheader("Evinizi yenilemek için ilham dolu öneriler.")
                .greeting("Merhaba " + sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz") + ",")
                .paragraphs(List.of(
                        "Ev dekorasyonunuzu yenilemek için ilham mı arıyorsunuz? Size özel hazırladığımız koleksiyonumuzdan bazı ipuçları derledik.",
                        "Hiedra'nın seçkin ürünleriyle evinize yeni bir hava katın."
                ))
                .details(details)
                .actionText("Koleksiyonumuzu Keşfedin")
                .actionUrl("https://yusufakin.online/products")
                .footerNote("Eviniz için en uygun ürünleri bulmak için her zaman yanınızdayız.")
                .build());
    }

    /**
     * Sitemizi ziyaret edin email şablonu
     */
    private String buildVisitWebsiteEmail(AppUser user) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Sizi Bekleyenler", "Yeni sezon ürünleri • Özel indirimler • İlham verici kombin önerileri • Hızlı teslimat");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Sitemizi Ziyaret Edin, Farkı Görün!")
                .preheader("Yeni trendler ve fırsatlar sizi bekliyor.")
                .greeting("Merhaba " + sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz") + ",")
                .paragraphs(List.of(
                        "Hiedra Home Collection olarak ev dekorasyonunuz için geniş ürün yelpazemizle hizmetinizdeyiz.",
                        "Sitemizi ziyaret ederek yeni sezon ürünlerini ve avantajlı kampanyalarımızı keşfedebilirsiniz."
                ))
                .details(details)
                .actionText("Sitemizi Ziyaret Edin")
                .actionUrl("https://yusufakin.online")
                .footerNote("Sitemizde yeni ürünler ve özel fırsatlar sizi bekliyor!")
                .build());
    }

    /**
     * Ürün önerileri email şablonu
     */
    private String buildProductRecommendationEmail(AppUser user) {
        try {
            List<Product> allProducts = productRepository.findAll();
            
            if (allProducts.isEmpty()) {
                return buildGenericMarketingEmail(user);
            }
            
            // Rastgele 2 ürün seç
            List<Product> recommendedProducts = allProducts.stream()
                    .collect(Collectors.collectingAndThen(
                        Collectors.toList(),
                        list -> {
                            Collections.shuffle(list, random);
                            return list.stream().limit(2).collect(Collectors.toList());
                        }
                    ));
            
            LinkedHashMap<String, String> details = new LinkedHashMap<>();
            for (Product product : recommendedProducts) {
                String description = product.getDescription() != null && product.getDescription().length() > 80
                        ? product.getDescription().substring(0, 80) + "..."
                        : (product.getDescription() != null ? product.getDescription() : "Size özel önerimiz");
                details.put("⭐ " + sanitizeHtml(product.getName()),
                        sanitizeHtml(description) + " • " + formatPrice(product.getPrice()));
            }

            return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                    .title("Size Özel Ürün Önerilerimiz")
                    .preheader("Sizin için seçtiğimiz ürün önerileri.")
                    .greeting("Merhaba " + sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz") + ",")
                    .paragraphs(List.of(
                            "Sizin için özel olarak seçtiğimiz ürünlerimiz var! Bu ürünler ev dekorasyonunuz için mükemmel bir seçim olabilir.",
                            "Size özel önerilerimizi aşağıda bulabilirsiniz."
                    ))
                    .details(details)
                    .actionText("Tüm Ürünleri İncele")
                    .actionUrl("https://yusufakin.online/products")
                    .footerNote("Bu öneriler size özeldir; hesabınızdan tercihlerinizi güncelleyebilirsiniz.")
                    .build());
        } catch (Exception e) {
            log.error("Ürün önerileri email şablonu oluşturulurken hata: {}", e.getMessage());
            return buildGenericMarketingEmail(user);
        }
    }

    /**
     * Genel marketing email şablonu
     */
    private String buildGenericMarketingEmail(AppUser user) {
        return String.format("""
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📧 HIEDRA HOME COLLECTION'den Özel Mesajınız!</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>%s</strong>,</p>
                        <p>Ev dekorasyonunuzda kalite ve şıklığı bir araya getiren ürünlerimizi keşfetmek için sitemizi ziyaret edin!</p>
                        <p>Geniş ürün yelpazemiz ve uygun fiyatlarımızla hizmetinizdeyiz.</p>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://yusufakin.online" class="button">Sitemizi Ziyaret Edin</a>
                        </div>
                        <p style="margin-top: 30px; color: #666;">Size özel fırsatlar ve yeni ürünler sizi bekliyor!</p>
                    </div>
                    <div class="footer">
                        <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">HIEDRA HOME COLLECTION</p>
                        <p>© 2024 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
            """, 
            sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz"));
    }
    
    /**
     * HTML sanitization (XSS koruması)
     */
    private String sanitizeHtml(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    private String formatPrice(java.math.BigDecimal price) {
        if (price == null) {
            return "0,00 ₺";
        }
        return price.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() + " ₺";
    }
}

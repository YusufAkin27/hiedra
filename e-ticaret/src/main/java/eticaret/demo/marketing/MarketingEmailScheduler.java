package eticaret.demo.marketing;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.auth.AppUser;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;

import java.time.LocalDateTime;
import java.util.Collections;
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
            
            StringBuilder productHtml = new StringBuilder();
            
            for (Product product : selectedProducts) {
                String description = product.getDescription() != null && product.getDescription().length() > 100 
                    ? product.getDescription().substring(0, 100) + "..." 
                    : (product.getDescription() != null ? product.getDescription() : "Kaliteli ve şık perde seçenekleri");
                
                productHtml.append(String.format("""
                    <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea;">
                        <h3 style="color: #2d3748; margin: 0 0 10px 0;">%s</h3>
                        <p style="color: #4a5568; margin: 5px 0;">%s</p>
                        <p style="color: #27ae60; font-weight: bold; font-size: 18px; margin: 10px 0;">%s ₺/metre</p>
                    </div>
                    """, 
                    sanitizeHtml(product.getName()),
                    sanitizeHtml(description),
                    product.getPrice() != null ? product.getPrice() : "0"));
            }
            
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
                            <h1>🎨 Yeni Ürünlerimiz Hazır!</h1>
                            <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                        </div>
                        <div class="content">
                            <p>Merhaba <strong>%s</strong>,</p>
                            <p>Koleksiyonumuza yeni eklenen ürünleri keşfetmeye hazır mısınız? Size özel seçtiğimiz ürünler:</p>
                            %s
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://yusufakin.online/products" class="button">Tüm Ürünleri Görüntüle</a>
                            </div>
                            <p style="margin-top: 30px; color: #666;">Ev dekorasyonunuzda kalite ve şıklığı bir araya getirin!</p>
                        </div>
                        <div class="footer">
                            <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">HIEDRA HOME COLLECTION</p>
                            <p>© 2024 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                        </div>
                    </div>
                </body>
                </html>
                """, 
                sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz"),
                productHtml.toString());
        } catch (Exception e) {
            log.error("Yeni ürünler email şablonu oluşturulurken hata: {}", e.getMessage());
            return buildGenericMarketingEmail(user);
        }
    }

    /**
     * Özel fırsatlar email şablonu
     */
    private String buildSpecialOffersEmail(AppUser user) {
        return String.format("""
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .offer-box { background: linear-gradient(135deg, #ffd700 0%%, #ffed4e 100%%); padding: 25px; border-radius: 10px; text-align: center; margin: 20px 0; }
                    .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✨ Özel Fırsatlar Sizi Bekliyor!</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>%s</strong>,</p>
                        <p>Size özel hazırladığımız fırsatları kaçırmayın! Ev dekorasyonunuzu yenilerken kalite ve uygun fiyatı bir arada bulun.</p>
                        <div class="offer-box">
                            <h2 style="margin: 0; color: #2d3748;">🎁 Özel Kampanyalar</h2>
                            <p style="font-size: 18px; margin: 10px 0; color: #2d3748;">Sitemizi ziyaret edin ve fırsatları keşfedin!</p>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://yusufakin.online" class="button">Fırsatları Görüntüle</a>
                        </div>
                        <p style="margin-top: 30px; color: #666;">Bu fırsatlar sınırlı süre için geçerlidir!</p>
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
     * İlham email şablonu
     */
    private String buildInspirationEmail(AppUser user) {
        return String.format("""
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4facfe 0%%, #00f2fe 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .inspiration-box { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4facfe; }
                    .button { display: inline-block; background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏠 Ev Dekorasyonunda İlham Alın!</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>%s</strong>,</p>
                        <p>Ev dekorasyonunuzu yenilemek için ilham mı arıyorsunuz? Size özel hazırladığımız koleksiyonumuzu keşfedin ve evinize yeni bir hava katın!</p>
                        <div class="inspiration-box">
                            <h3 style="color: #2d3748; margin: 0 0 10px 0;">💡 Dekorasyon İpuçları</h3>
                            <ul style="color: #4a5568; line-height: 1.8;">
                                <li>Doğru perde seçimi ile mekanınızı büyütün</li>
                                <li>Renk uyumu ile modern bir görünüm yakalayın</li>
                                <li>Kaliteli kumaşlar ile uzun ömürlü çözümler</li>
                            </ul>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://yusufakin.online/products" class="button">Koleksiyonumuzu Keşfedin</a>
                        </div>
                        <p style="margin-top: 30px; color: #666;">Eviniz için en uygun ürünleri bulmak için sitemizi ziyaret edin!</p>
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
     * Sitemizi ziyaret edin email şablonu
     */
    private String buildVisitWebsiteEmail(AppUser user) {
        return String.format("""
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #fa709a 0%%, #fee140 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .highlight-box { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #fa709a; }
                    .button { display: inline-block; background: #fa709a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>👀 Sitemizi Ziyaret Edin, Farkı Görün!</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>%s</strong>,</p>
                        <p>HIEDRA HOME COLLECTION olarak, ev dekorasyonunuz için geniş ürün yelpazemizle hizmetinizdeyiz!</p>
                        <div class="highlight-box">
                            <h3 style="color: #2d3748; margin: 0 0 10px 0;">🎯 Neden Bizi Seçmelisiniz?</h3>
                            <ul style="color: #4a5568; line-height: 1.8;">
                                <li>✅ Geniş ürün çeşitliliği</li>
                                <li>✅ Kaliteli ve dayanıklı malzemeler</li>
                                <li>✅ Uygun fiyat garantisi</li>
                                <li>✅ Hızlı ve güvenli teslimat</li>
                            </ul>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://yusufakin.online" class="button">Sitemizi Ziyaret Edin</a>
                        </div>
                        <p style="margin-top: 30px; color: #666;">Sitemizde yeni ürünler ve özel fırsatlar sizi bekliyor!</p>
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
            
            StringBuilder productHtml = new StringBuilder();
            
            for (Product product : recommendedProducts) {
                productHtml.append(String.format("""
                    <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #8e44ad;">
                        <h3 style="color: #2d3748; margin: 0 0 10px 0;">⭐ %s</h3>
                        <p style="color: #4a5568; margin: 5px 0;">%s</p>
                        <p style="color: #8e44ad; font-weight: bold; font-size: 18px; margin: 10px 0;">%s ₺/metre</p>
                    </div>
                    """, 
                    sanitizeHtml(product.getName()),
                    sanitizeHtml(product.getDescription() != null && product.getDescription().length() > 80 
                        ? product.getDescription().substring(0, 80) + "..." 
                        : (product.getDescription() != null ? product.getDescription() : "Size özel önerimiz")),
                    product.getPrice() != null ? product.getPrice() : "0"));
            }
            
            return String.format("""
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #8e44ad 0%%, #9b59b6 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #8e44ad; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>💡 Size Özel Ürün Önerilerimiz!</h1>
                            <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                        </div>
                        <div class="content">
                            <p>Merhaba <strong>%s</strong>,</p>
                            <p>Sizin için özel olarak seçtiğimiz ürünlerimiz var! Bu ürünler ev dekorasyonunuz için mükemmel bir seçim olabilir:</p>
                            %s
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://yusufakin.online/products" class="button">Tüm Ürünleri İncele</a>
                            </div>
                            <p style="margin-top: 30px; color: #666;">Bu öneriler sizin için özel olarak hazırlandı!</p>
                        </div>
                        <div class="footer">
                            <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">HIEDRA HOME COLLECTION</p>
                            <p>© 2024 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                        </div>
                    </div>
                </body>
                </html>
                """, 
                sanitizeHtml(user.getFullName() != null ? user.getFullName() : "Değerli Müşterimiz"),
                productHtml.toString());
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
}

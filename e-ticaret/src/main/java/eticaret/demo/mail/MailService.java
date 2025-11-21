package eticaret.demo.mail;


import com.fasterxml.jackson.databind.ObjectMapper;
import eticaret.demo.common.config.AppUrlConfig;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;
    private final EmailQueue emailQueue;
    private final ObjectMapper objectMapper;
    private final AppUrlConfig appUrlConfig;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    @Value("${spring.mail.username}")
    private String senderEmail;

    // Kuyruğa ekle
    public void queueEmail(EmailMessage emailMessage) {
        emailQueue.enqueue(emailMessage);
    }

    // Direkt gönder (kuyruğu atla) - Attachment'lar için önemli
    public void sendEmailDirectly(EmailMessage emailMessage) {
        log.info("📤 Direkt mail gönderimi başlatılıyor - To: {}, Subject: {}", 
                emailMessage.getToEmail(), emailMessage.getSubject());
        try {
            sendEmail(emailMessage);
            log.info("✅ Direkt mail başarıyla gönderildi - To: {}", emailMessage.getToEmail());
        } catch (Exception e) {
            log.error("❌ Direkt mail gönderiminde hata - To: {}, Error: {}", 
                    emailMessage.getToEmail(), e.getMessage(), e);
            throw e;
        }
    }

    // 1 saniyede bir çalışsın
    @Scheduled(fixedRate = 1000)
    public void sendQueuedEmails() {
        try {
            long queueSize = emailQueue.size();

            // Eğer kuyrukta 10.000'den fazla mail varsa temizle
            if (queueSize > 10000) {
                log.warn("Mail kuyruğu çok büyük ({}), temizleniyor.", queueSize);
                emailQueue.clear();
                return;
            }

            // Kuyrukta mail varsa gönder
            if (queueSize > 0) {
                int maxBatchSize = 20;  // Aynı anda max 20 mail gönder
                List<EmailMessage> batch = new ArrayList<>();

                for (int i = 0; i < maxBatchSize; i++) {
                    String emailJson = emailQueue.dequeue();
                    if (emailJson == null) break;

                    try {
                        EmailMessage email = objectMapper.readValue(emailJson, EmailMessage.class);
                        batch.add(email);
                    } catch (Exception e) {
                        log.error("Kuyruktan email deserialize hatası: {}", e.getMessage());
                    }
                }

                for (EmailMessage email : batch) {
                    sendEmail(email);
                }
            }
        } catch (Exception e) {
            log.error("Mail gönderim işlemi sırasında hata: {}", e.getMessage());
        }
    }

    private void sendEmail(EmailMessage email) {
        try {
            log.debug("Mail hazırlanıyor - To: {}, Subject: {}, HasAttachments: {}",
                    email.getToEmail(), email.getSubject(),
                    email.getAttachments() != null && !email.getAttachments().isEmpty());

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(email.getToEmail());
            helper.setSubject(email.getSubject());
            helper.setText(email.getBody(), email.isHtml());
            helper.setFrom(senderEmail);

            if (email.getAttachments() != null && !email.getAttachments().isEmpty()) {
                log.info("{} adet ek dosya işleniyor", email.getAttachments().size());
                for (EmailAttachment attachment : email.getAttachments()) {
                    try {
                        if (attachment.getContent() != null && attachment.getName() != null) {
                            helper.addAttachment(attachment.getName(),
                                    new ByteArrayDataSource(attachment.getContent(), attachment.getContentType()));
                            log.info("Attachment eklendi: {} ({} bytes)", attachment.getName(), attachment.getContent().length);
                        } else {
                            log.warn("Eksik attachment bilgisi - Name: {}, Content: {}",
                                    attachment.getName(), attachment.getContent() != null ? "var" : "null");
                        }
                    } catch (Exception ex) {
                        log.error("Attachment eklenirken hata: {}", ex.getMessage(), ex);
                    }
                }
            }

            log.info("Mail gönderiliyor - To: {}, Subject: {}", email.getToEmail(), email.getSubject());
            mailSender.send(mimeMessage);
            log.info("Mail başarıyla gönderildi: {} (Subject: {})", email.getToEmail(), email.getSubject());

        } catch (MessagingException e) {
            log.error("Mail hazırlanırken hata - To: {}, Subject: {}, Error: {}",
                    email.getToEmail(), email.getSubject(), e.getMessage(), e);
            throw new RuntimeException("Mail gönderilemedi: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Mail gönderilirken hata - To: {}, Subject: {}, Error: {}",
                    email.getToEmail(), email.getSubject(), e.getMessage(), e);
            throw e;
        }
    }
    public String buildAdminOtpEmail(String adminEmail, String code, String actionUrl) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Yönetici E-postası", adminEmail);
        details.put("Geçerlilik", "10 dakika");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Yönetici Giriş Doğrulama Kodu")
                .preheader("Hiedra admin paneline giriş için tek kullanımlık kodunuz hazır.")
                .greeting("Merhaba,")
                .paragraphs(List.of(
                        "Admin paneline giriş talebinizi aldık. Güvenliğiniz için aşağıdaki kodu yalnızca siz kullanmalısınız.",
                        "Bu kod kısa süre içinde geçerliliğini yitirir ve yeni bir kod talep ettiğinizde önceki kod geçersiz olur."
                ))
                .details(details)
                .highlight("Doğrulama Kodunuz: " + code)
                .actionText("Yönetici Paneline Git")
                .actionUrl(actionUrl != null ? actionUrl : appUrlConfig.getAdminLoginUrl())
                .actionNote("Bu bağlantıyı yalnızca güvenilir cihazlarda kullanın.")
                .footerNote("Bu e-posta otomatik gönderilmiştir. Şüpheli bir aktivite fark ederseniz info@hiedra.com.tr adresinden bize ulaşabilirsiniz.")
                .build());
    }

    public String buildUserOtpEmail(String userEmail, String code, String actionUrl) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("E-posta", userEmail);
        details.put("Geçerlilik", "10 dakika");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Giriş Doğrulama Kodunuz")
                .preheader("Hiedra hesabınıza güvenli giriş için kodunuz hazır.")
                .greeting("Merhaba,")
                .paragraphs(List.of(
                        "Hiedra Home Collection hesabınıza güvenle giriş yapabilmeniz için tek kullanımlık doğrulama kodunuzu paylaşıyoruz.",
                        "Kodunuzu kimseyle paylaşmayın. Emin olmadığınız bir giriş isteği görürseniz lütfen bizimle iletişime geçin."
                ))
                .details(details)
                .highlight("Doğrulama Kodunuz: " + code)
                .actionText("Siteye Dön")
                .actionUrl(actionUrl != null ? actionUrl : appUrlConfig.getLoginUrl())
                .actionNote("Bu kodu yalnızca siz kullanmalısınız.")
                .footerNote("Bu e-posta otomatik gönderilmiştir. Yardım için info@hiedra.com.tr")
                .build());
    }

    public String buildOrderLookupCodeEmail(String userEmail, String code, String actionUrl) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("E-posta", userEmail);
        details.put("Geçerlilik", "10 dakika");
        details.put("Güvenlik", "Bu kod ile yalnızca sipariş bilgilerinizi görüntüleyebilirsiniz.");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Siparişlerinizi Görüntülemek İçin Doğrulama Kodunuz")
                .preheader("Siparişlerinizi görüntülemek için kodunuzu girmeniz yeterli.")
                .greeting("Merhaba,")
                .paragraphs(List.of(
                        "Siparişlerinizi güvenle görüntüleyebilmeniz için tek kullanımlık doğrulama kodunuzu paylaşıyoruz.",
                        "Kodunuzu kimseyle paylaşmayın. Emin olmadığınız bir istek görürseniz lütfen bizimle iletişime geçin."
                ))
                .details(details)
                .highlight("Doğrulama Kodunuz: " + code)
                .actionText("Siparişlerimi Görüntüle")
                .actionUrl(actionUrl != null ? actionUrl : appUrlConfig.getFrontendUrl() + "/siparis-sorgula")
                .actionNote("Kodunuz kullanıldığında veya süresi dolduğunda otomatik olarak geçersiz hale gelir.")
                .footerNote("Bu e-posta otomatik gönderilmiştir. Yardım için info@hiedra.com.tr adresinden bize ulaşabilirsiniz.")
                .build());
    }

    public String buildOrderCreatedEmail(OrderEmailPayload payload) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Sipariş No", "#" + payload.getOrderNumber());
        details.put("Ürün Sayısı", String.valueOf(payload.getItems() != null ? payload.getItems().size() : 0));
        details.put("Toplam Tutar", formatAmount(payload.getTotalAmount()));
        if (payload.getDiscountAmount() != null && payload.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            details.put("İndirim", "-" + formatAmount(payload.getDiscountAmount()));
        }

        String itemsSection = buildOrderItemsSection(payload.getItems());
        String detailUrl = payload.getDetailUrl() != null
                ? payload.getDetailUrl()
                : appUrlConfig.getFrontendUrl() + "/siparislerim/" + payload.getOrderNumber();

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Siparişiniz Hazırlanmaya Başladı")
                .preheader("Siparişiniz bize ulaştı, kısa süre içinde kargoya verilecek.")
                .greeting("Sayın " + payload.getCustomerName() + ",")
                .paragraphs(List.of(
                        "Siparişinizi aldık ve hazırlık sürecini başlattık. Hazır olduğunda size kargo bilgilerini ayrıca ileteceğiz.",
                        "Aşağıda sipariş özetinizi bulabilirsiniz."
                ))
                .details(details)
                .highlight("Sipariş Numaranız: #" + payload.getOrderNumber())
                .actionText("Siparişi Görüntüle")
                .actionUrl(detailUrl)
                .customSection(itemsSection)
                .footerNote("Sorularınız için info@hiedra.com.tr adresinden bize ulaşabilirsiniz.")
                .build());
    }

    public String buildOrderStatusEmail(OrderStatusEmailPayload payload) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Sipariş No", "#" + payload.getOrderNumber());
        if (payload.getPreviousStatus() != null) {
            details.put("Önceki Durum", payload.getPreviousStatus());
        }
        details.put("Yeni Durum", payload.getNewStatus());
        if (payload.getTotalAmount() != null) {
            details.put("Toplam Tutar", formatAmount(payload.getTotalAmount()));
        }

        String detailUrl = payload.getDetailUrl() != null
                ? payload.getDetailUrl()
                : appUrlConfig.getFrontendUrl() + "/siparislerim/" + payload.getOrderNumber();

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Sipariş Durumunuz Güncellendi")
                .preheader("Siparişinizin durumu " + payload.getNewStatus() + " olarak güncellendi.")
                .greeting("Sayın " + payload.getCustomerName() + ",")
                .paragraphs(List.of(
                        "Siparişinizin durumu güncellendi. Güncel bilgileri aşağıda ve hesabınızdaki sipariş detayları sayfasında bulabilirsiniz.",
                        "Bu güncelleme ile ilgili sorularınız olursa destek ekibimizle iletişime geçebilirsiniz."
                ))
                .details(details)
                .highlight("Yeni Durum: " + payload.getNewStatus())
                .actionText("Sipariş Detayına Git")
                .actionUrl(detailUrl)
                .footerNote("Herhangi bir sorunuz olursa info@hiedra.com.tr adresinden bize ulaşabilirsiniz.")
                .build());
    }

    public String buildCouponEmail(CouponEmailPayload payload) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Kupon Kodu", payload.getCouponCode());
        details.put("İndirim", payload.getDiscountText());
        if (payload.getValidFrom() != null && payload.getValidUntil() != null) {
            details.put("Geçerlilik", formatDate(payload.getValidFrom()) + " - " + formatDate(payload.getValidUntil()));
        }
        if (payload.getMinimumPurchase() != null) {
            details.put("Minimum Harcama", formatAmount(payload.getMinimumPurchase()));
        }

        String heroSection = buildCouponHeroSection(payload);
        String couponUrl = payload.getCouponUrl() != null
                ? payload.getCouponUrl()
                : appUrlConfig.getFrontendUrl();

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Yeni Kupon: " + payload.getCouponName())
                .preheader("Sepetinizi avantajlı hale getirecek yeni kuponunuz hazır.")
                .greeting("Merhaba,")
                .paragraphs(List.of(
                        "Sizin için özel bir kampanya hazırladık. Detayları aşağıda bulabilirsiniz.",
                        payload.getDescription() != null ? payload.getDescription() : "Kuponu belirtilen süre içerisinde kullanmayı unutmayın."
                ))
                .details(details)
                .highlight("Kupon Kodunuz: " + payload.getCouponCode())
                .actionText("Alışverişe Başla")
                .actionUrl(couponUrl)
                .customSection(heroSection)
                .footerNote("Bu kampanya stoklarla sınırlıdır. Sorularınız için info@hiedra.com.tr")
                .build());
    }

    private String buildOrderItemsSection(List<OrderEmailItem> items) {
        if (items == null || items.isEmpty()) {
            return "";
        }

        String rows = items.stream()
                .map(item -> """
                        <div style="padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.3);display:flex;justify-content:space-between;gap:16px;">
                            <div>
                                <p style="margin:0;font-weight:600;color:#0f172a;">%s</p>
                                %s
                                <p style="margin:4px 0 0 0;font-size:13px;color:#94a3b8;">Adet: %d</p>
                            </div>
                            <p style="margin:0;font-weight:600;color:#0f172a;">%s</p>
                        </div>
                        """.formatted(
                        escapeHtml(item.getTitle()),
                        item.getDescription() != null && !item.getDescription().isBlank()
                                ? "<p style=\"margin:4px 0 0 0;font-size:13px;color:#64748b;\">" + escapeHtml(item.getDescription()) + "</p>"
                                : "",
                        item.getQuantity(),
                        formatAmount(item.getTotalPrice())))
                .collect(Collectors.joining());

        return """
                <div style="margin-top:32px;border-radius:24px;border:1px solid rgba(148,163,184,0.25);padding:20px 24px;background:#fff;">
                    <p style="margin:0 0 12px 0;font-weight:600;color:#0f172a;">Ürün Özeti</p>
                    %s
                </div>
                """.formatted(rows);
    }

    private String buildCouponHeroSection(CouponEmailPayload payload) {
        StringBuilder builder = new StringBuilder();
        if (payload.getImageUrl() != null && !payload.getImageUrl().isBlank()) {
            builder.append("""
                    <div style="margin-top:24px;">
                        <img src="%s" alt="Kupon görseli" style="width:100%%;border-radius:24px;object-fit:cover;">
                    </div>
                    """.formatted(payload.getImageUrl()));
        }
        return builder.toString();
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) {
            return "-";
        }
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString() + " ₺";
    }

    private String formatDate(LocalDate date) {
        if (date == null) {
            return "-";
        }
        return date.format(DATE_FORMATTER);
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    public static class OrderEmailItem {
        private final String title;
        private final String description;
        private final int quantity;
        private final BigDecimal totalPrice;

        public OrderEmailItem(String title, String description, int quantity, BigDecimal totalPrice) {
            this.title = title;
            this.description = description;
            this.quantity = quantity;
            this.totalPrice = totalPrice;
        }

        public String getTitle() {
            return title;
        }

        public String getDescription() {
            return description;
        }

        public int getQuantity() {
            return quantity;
        }

        public BigDecimal getTotalPrice() {
            return totalPrice;
        }
    }

    public static class OrderEmailPayload {
        private final String customerName;
        private final String orderNumber;
        private final BigDecimal subtotal;
        private final BigDecimal discountAmount;
        private final BigDecimal totalAmount;
        private final List<OrderEmailItem> items;
        private final String detailUrl;

        public OrderEmailPayload(String customerName, String orderNumber, BigDecimal subtotal,
                                 BigDecimal discountAmount, BigDecimal totalAmount,
                                 List<OrderEmailItem> items, String detailUrl) {
            this.customerName = customerName;
            this.orderNumber = orderNumber;
            this.subtotal = subtotal;
            this.discountAmount = discountAmount;
            this.totalAmount = totalAmount;
            this.items = items;
            this.detailUrl = detailUrl;
        }

        public String getCustomerName() {
            return customerName;
        }

        public String getOrderNumber() {
            return orderNumber;
        }

        public BigDecimal getSubtotal() {
            return subtotal;
        }

        public BigDecimal getDiscountAmount() {
            return discountAmount;
        }

        public BigDecimal getTotalAmount() {
            return totalAmount;
        }

        public List<OrderEmailItem> getItems() {
            return items;
        }

        public String getDetailUrl() {
            return detailUrl;
        }
    }

    public static class OrderStatusEmailPayload {
        private final String customerName;
        private final String orderNumber;
        private final String previousStatus;
        private final String newStatus;
        private final BigDecimal totalAmount;
        private final String detailUrl;

        public OrderStatusEmailPayload(String customerName, String orderNumber,
                                       String previousStatus, String newStatus,
                                       BigDecimal totalAmount, String detailUrl) {
            this.customerName = customerName;
            this.orderNumber = orderNumber;
            this.previousStatus = previousStatus;
            this.newStatus = newStatus;
            this.totalAmount = totalAmount;
            this.detailUrl = detailUrl;
        }

        public String getCustomerName() {
            return customerName;
        }

        public String getOrderNumber() {
            return orderNumber;
        }

        public String getPreviousStatus() {
            return previousStatus;
        }

        public String getNewStatus() {
            return newStatus;
        }

        public BigDecimal getTotalAmount() {
            return totalAmount;
        }

        public String getDetailUrl() {
            return detailUrl;
        }
    }

    public static class CouponEmailPayload {
        private final String couponName;
        private final String couponCode;
        private final String description;
        private final String discountText;
        private final LocalDate validFrom;
        private final LocalDate validUntil;
        private final BigDecimal minimumPurchase;
        private final String couponUrl;
        private final String imageUrl;

        public CouponEmailPayload(String couponName, String couponCode, String description,
                                  String discountText, LocalDate validFrom, LocalDate validUntil,
                                  BigDecimal minimumPurchase, String couponUrl, String imageUrl) {
            this.couponName = couponName;
            this.couponCode = couponCode;
            this.description = description;
            this.discountText = discountText;
            this.validFrom = validFrom;
            this.validUntil = validUntil;
            this.minimumPurchase = minimumPurchase;
            this.couponUrl = couponUrl;
            this.imageUrl = imageUrl;
        }

        public String getCouponName() {
            return couponName;
        }

        public String getCouponCode() {
            return couponCode;
        }

        public String getDescription() {
            return description;
        }

        public String getDiscountText() {
            return discountText;
        }

        public LocalDate getValidFrom() {
            return validFrom;
        }

        public LocalDate getValidUntil() {
            return validUntil;
        }

        public BigDecimal getMinimumPurchase() {
            return minimumPurchase;
        }

        public String getCouponUrl() {
            return couponUrl;
        }

        public String getImageUrl() {
            return imageUrl;
        }
    }

}

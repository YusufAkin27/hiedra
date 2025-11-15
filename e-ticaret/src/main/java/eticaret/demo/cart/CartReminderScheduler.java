package eticaret.demo.cart;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CartReminderScheduler {

    private final CartService cartService;
    private final CartRepository cartRepository;
    private final MailService mailService;
    private final AuditLogService auditLogService;

    /**
     * Her gün saat 10:00'da çalışır
     * 1 gün önce sepete ürün eklenmiş ve hala aktif olan sepetler için hatırlatma maili gönder
     */
    @Scheduled(cron = "0 0 10 * * ?") // Her gün saat 10:00
    @Transactional
    public void sendCartReminderEmails() {
        log.info("Sepet hatırlatma maili kontrolü başlatılıyor...");
        
        try {
            List<Cart> cartsToRemind = cartService.getCartsForReminderEmail();
            log.info("Hatırlatma maili gönderilecek sepet sayısı: {}", cartsToRemind.size());
            
            int sentCount = 0;
            for (Cart cart : cartsToRemind) {
                try {
                    // Mail gönderilmiş mi kontrol et (audit log'dan)
                    if (hasReminderEmailSent(cart.getId())) {
                        log.debug("Sepet {} için hatırlatma maili daha önce gönderilmiş, atlanıyor", cart.getId());
                        continue;
                    }
                    
                    sendReminderEmail(cart);
                    sentCount++;
                    
                    // Audit log
                    auditLogService.logSimple("CART_REMINDER_EMAIL", "Cart", cart.getId(),
                            "Sepet hatırlatma maili gönderildi", null);
                    
                } catch (Exception e) {
                    log.error("Sepet {} için hatırlatma maili gönderilirken hata: {}", cart.getId(), e.getMessage(), e);
                    auditLogService.logError("CART_REMINDER_EMAIL", "Cart", cart.getId(),
                            "Hatırlatma maili gönderilirken hata: " + e.getMessage(), e.getMessage(), null);
                }
            }
            
            log.info("Sepet hatırlatma maili işlemi tamamlandı. Gönderilen: {}", sentCount);
        } catch (Exception e) {
            log.error("Sepet hatırlatma maili işlemi sırasında hata: {}", e.getMessage(), e);
        }
    }

    /**
     * Hatırlatma maili gönder
     */
    private void sendReminderEmail(Cart cart) {
        String email = null;
        String userName = "Değerli Müşterimiz";
        
        if (cart.getUser() != null && cart.getUser().getEmail() != null) {
            email = cart.getUser().getEmail();
            userName = cart.getUser().getEmail().split("@")[0]; // Email'den isim çıkar
        } else if (cart.getGuestUserId() != null) {
            // Guest kullanıcı için email yok, atla
            log.debug("Guest sepet {} için email adresi yok, mail gönderilemiyor", cart.getId());
            return;
        }
        
        if (email == null || email.isEmpty()) {
            log.warn("Sepet {} için email adresi bulunamadı", cart.getId());
            return;
        }
        
        String subject = "Sepetinizi Onaylamayı Unutmayın! 🛒";
        String htmlContent = buildReminderEmailContent(cart, userName);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(email)
                .subject(subject)
                .body(htmlContent)
                .isHtml(true)
                .build();
        
        mailService.queueEmail(emailMessage);
        log.info("Sepet hatırlatma maili gönderildi: {} -> {}", cart.getId(), email);
    }

    /**
     * Hatırlatma maili içeriğini oluştur
     */
    private String buildReminderEmailContent(Cart cart, String userName) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
        html.append(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
        html.append(".header { background: #2c3e50; color: white; padding: 20px; text-align: center; }");
        html.append(".content { background: #f9f9f9; padding: 20px; }");
        html.append(".cart-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2c3e50; }");
        html.append(".product-name { font-weight: bold; font-size: 16px; color: #2c3e50; }");
        html.append(".product-details { color: #666; font-size: 14px; margin: 5px 0; }");
        html.append(".total { background: #2c3e50; color: white; padding: 15px; text-align: center; font-size: 20px; font-weight: bold; margin-top: 20px; }");
        html.append(".button { display: inline-block; background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }");
        html.append(".footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");
        html.append("<div class='header'>");
        html.append("<h1>🛒 Sepetinizi Onaylamayı Unutmayın!</h1>");
        html.append("<p style='margin-top: 10px; font-size: 18px; font-weight: 600;'>HIEDRA HOME COLLECTION</p>");
        html.append("</div>");
        html.append("<div class='content'>");
        html.append("<p>Merhaba <strong>").append(userName).append("</strong>,</p>");
        html.append("<p>Sepetinizde <strong>").append(cart.getItems().size()).append("</strong> ürün bulunuyor ve henüz onaylamadınız.</p>");
        html.append("<p>Sepetinizi tamamlamak için aşağıdaki ürünleri gözden geçirebilirsiniz:</p>");
        
        // Sepet öğeleri
        for (CartItem item : cart.getItems()) {
            html.append("<div class='cart-item'>");
            html.append("<div class='product-name'>").append(item.getProduct().getName()).append("</div>");
            html.append("<div class='product-details'>");
            html.append("Adet: ").append(item.getQuantity());
            if (item.getWidth() != null && item.getHeight() != null) {
                html.append(" | Boyut: ").append(item.getWidth()).append(" x ").append(item.getHeight()).append(" cm");
            }
            if (item.getPleatType() != null) {
                html.append(" | Pile: ").append(item.getPleatType());
            }
            html.append("</div>");
            html.append("<div class='product-details' style='color: #27ae60; font-weight: bold;'>");
            html.append("Fiyat: ").append(item.getSubtotal()).append(" ₺");
            html.append("</div>");
            html.append("</div>");
        }
        
        // Toplam
        html.append("<div class='total'>");
        html.append("Toplam: ").append(cart.getTotalAmount()).append(" ₺");
        html.append("</div>");
        
        html.append("<div style='text-align: center; margin-top: 30px;'>");
        html.append("<a href='http://localhost:3000/cart' class='button'>Sepetimi Görüntüle</a>");
        html.append("</div>");
        
        html.append("<p style='margin-top: 30px; color: #666;'>");
        html.append("Bu mail, sepetinize ürün ekledikten sonra 1 gün geçtiği için otomatik olarak gönderilmiştir.");
        html.append("</p>");
        
        html.append("</div>");
        html.append("<div class='footer'>");
        html.append("<p style='font-weight: bold; font-size: 14px; margin-bottom: 10px;'>HIEDRA HOME COLLECTION</p>");
        html.append("<p>© 2024 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>");
        html.append("</div>");
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }

    /**
     * Bu sepet için hatırlatma maili daha önce gönderilmiş mi?
     */
    private boolean hasReminderEmailSent(Long cartId) {
        // Audit log'dan kontrol et
        return auditLogService.hasReminderEmailSent(cartId);
    }
}


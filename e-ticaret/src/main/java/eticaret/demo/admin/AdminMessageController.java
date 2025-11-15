package eticaret.demo.admin;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;

import eticaret.demo.contact_us.AdminResponseRequest;
import eticaret.demo.contact_us.ContactUs;
import eticaret.demo.contact_us.ContactUsRepository;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.common.response.DataResponseMessage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/messages")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMessageController {

    private final ContactUsRepository contactUsRepository;
    private final MailService mailService;

    @GetMapping
    public ResponseEntity<DataResponseMessage<List<ContactUs>>> getAllMessages(
            @RequestParam(required = false) Boolean responded,
            @RequestParam(required = false) Boolean verified) {
        List<ContactUs> messages = contactUsRepository.findAll().stream()
                .filter(m -> verified == null || m.isVerified() == verified)
                .filter(m -> responded == null || m.isResponded() == responded)
                .sorted((m1, m2) -> m2.getCreatedAt().compareTo(m1.getCreatedAt()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(DataResponseMessage.success("Mesajlar başarıyla getirildi", messages));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<ContactUs>> getMessageById(@PathVariable Long id) {
        return contactUsRepository.findById(id)
                .map(message -> ResponseEntity.ok(DataResponseMessage.success("Mesaj başarıyla getirildi", message)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<DataResponseMessage<ContactUs>> respondToMessage(
            @PathVariable Long id,
            @RequestBody AdminResponseRequest request,
            @AuthenticationPrincipal AppUser admin) {
        try {
            ContactUs contact = contactUsRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Mesaj bulunamadı"));

            if (!contact.isVerified()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu mesaj henüz doğrulanmamış. Önce mesajın doğrulanması gerekiyor."));
            }

            // Admin cevabını kaydet
            contact.setAdminResponse(request.getResponse());
            contact.setRespondedAt(LocalDateTime.now());
            contact.setRespondedBy(admin != null ? admin.getEmail() : "Admin");
            contact.setResponded(true);
            contact = contactUsRepository.save(contact);
            
            // Veritabanından tekrar okuyarak doğrula
            contact = contactUsRepository.findById(contact.getId())
                    .orElseThrow(() -> new RuntimeException("Mesaj kaydedildikten sonra bulunamadı"));

            // Kullanıcıya mail gönder
            String emailBody = buildResponseEmail(
                    contact.getName(), 
                    contact.getSubject(), 
                    contact.getMessage(), // Orijinal mesaj
                    request.getResponse() // Admin cevabı
            );
            
            EmailMessage emailMessage = EmailMessage.builder()
                    .toEmail(contact.getEmail())
                    .subject("Re: " + contact.getSubject())
                    .body(emailBody)
                    .isHtml(true)
                    .build();

            mailService.queueEmail(emailMessage);

            return ResponseEntity.ok(DataResponseMessage.success(
                    "Yanıt başarıyla gönderildi: " + contact.getEmail(),
                    contact
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yanıt gönderilemedi: " + e.getMessage()));
        }
    }

    @PostMapping("/broadcast")
    public ResponseEntity<DataResponseMessage<Void>> sendBroadcastMessage(
            @RequestBody BroadcastMessageRequest request) {
        try {
            List<ContactUs> verifiedContacts = contactUsRepository.findAll().stream()
                    .filter(ContactUs::isVerified)
                    .collect(Collectors.toList());

            String emailBody = buildBroadcastEmail(request.getSubject(), request.getMessage());

            for (ContactUs contact : verifiedContacts) {
                EmailMessage emailMessage = EmailMessage.builder()
                        .toEmail(contact.getEmail())
                        .subject(request.getSubject())
                        .body(emailBody.replace("{{name}}", contact.getName()))
                        .isHtml(true)
                        .build();
                mailService.queueEmail(emailMessage);
            }

            return ResponseEntity.ok(new DataResponseMessage<>(
                    "Toplu mesaj " + verifiedContacts.size() + " kişiye gönderildi",
                    true,
                    null
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Toplu mesaj gönderilemedi: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteMessage(@PathVariable Long id) {
        if (contactUsRepository.existsById(id)) {
            contactUsRepository.deleteById(id);
            return ResponseEntity.ok(new DataResponseMessage<>("Mesaj başarıyla silindi", true, null));
        } else {
            return ResponseEntity.notFound().build();
        }
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
                        <p>HIEDRA COLLECTION HOME</p>
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
                        <div class="brand">HIEDRA COLLECTION HOME</div>
                        <p>Ev dekorasyonunda kalite ve şıklığın adresi</p>
                        <div class="social-links">
                            <a href="#">Web Sitemiz</a> | 
                            <a href="#">Instagram</a> | 
                            <a href="#">Facebook</a>
                        </div>
                        <p style="margin-top: 20px; font-size: 12px; color: #718096;">
                            Bu e-posta %s adresine gönderilmiştir.<br>
                            © 2024 Hiedra Collection Home. Tüm hakları saklıdır.
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

    private String buildBroadcastEmail(String subject, String message) {
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
                    .message-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📢 %s</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">HIEDRA HOME COLLECTION</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>{{name}}</strong>,</p>
                        
                        <div class="message-box">
                            <p>%s</p>
                        </div>
                        
                        <p>Teşekkür ederiz.</p>
                    </div>
                    <div class="footer">
                        <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">HIEDRA HOME COLLECTION</p>
                        <p>Bu emaile yanıt verebilirsiniz.</p>
                        <p style="margin-top: 10px; font-size: 11px;">© 2024 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
            """, subject, message.replace("\n", "<br>"));
    }

    @Data
    static class BroadcastMessageRequest {
        private String subject;
        private String message;
    }
}


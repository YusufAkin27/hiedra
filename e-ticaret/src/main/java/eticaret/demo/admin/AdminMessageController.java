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
import eticaret.demo.mail.EmailTemplateBuilder;
import eticaret.demo.mail.EmailTemplateModel;
import eticaret.demo.common.response.DataResponseMessage;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
                    contact.getEmail(),
                    contact.getSubject(),
                    contact.getMessage(),
                    request.getResponse());
            
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

            for (ContactUs contact : verifiedContacts) {
                String emailBody = buildBroadcastEmail(
                        contact.getName(),
                        request.getSubject(),
                        request.getMessage());

                EmailMessage emailMessage = EmailMessage.builder()
                        .toEmail(contact.getEmail())
                        .subject(request.getSubject())
                        .body(emailBody)
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

    private String buildResponseEmail(String name, String email, String subject, String originalMessage, String response) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Mesaj Konusu", subject);
        details.put("Yanıt Tarihi", LocalDateTime.now().toString());

        String formattedOriginal = originalMessage != null
                ? originalMessage.replace("\r", "").replace("\n", "<br>")
                : "";
        String formattedResponse = response.replace("\r", "").replace("\n", "<br>");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Mesajınıza Yanıt")
                .preheader("Destek ekibimiz mesajınıza yanıt verdi.")
                .greeting("Merhaba " + (name != null ? name : "Değerli Müşterimiz") + ",")
                .paragraphs(List.of(
                        "Bize ulaştığınız için teşekkür ederiz. Mesajınızı inceledik ve aşağıdaki yanıtı paylaşıyoruz.",
                        "<strong>Gönderdiğiniz mesaj:</strong><br>" + formattedOriginal,
                        "<strong>Yanıtımız:</strong><br>" + formattedResponse
                ))
                .details(details)
                .footerNote("Bu e-posta otomatik gönderildi. Ek sorularınız varsa bu mesajı yanıtlayabilirsiniz.")
                .build());
    }

    private String buildBroadcastEmail(String name, String subject, String message) {
        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title(subject)
                .preheader("Hiedra Home Collection duyurusu.")
                .greeting("Merhaba " + (name != null ? name : "Değerli Müşterimiz") + ",")
                .paragraphs(List.of(
                        message.replace("\r", "").replace("\n", "<br>")
                ))
                .actionText("Hemen Keşfet")
                .actionUrl("https://www.hiedrahome.com")
                .footerNote("Bu e-posta otomatik olarak gönderilmiştir.")
                .build());
    }

    @Data
    static class BroadcastMessageRequest {
        private String subject;
        private String message;
    }
}


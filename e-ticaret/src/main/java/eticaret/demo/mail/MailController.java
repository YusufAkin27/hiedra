package eticaret.demo.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailService mailService;


    // Doğrudan gönder (kuyruğu atla)
    @GetMapping("/direct")
    public ResponseEntity<String> sendDirect(@RequestParam String to) {
        try {
            EmailMessage emailMessage=new EmailMessage(to, "Selam","MERHABA",false,null);
            mailService.queueEmail(emailMessage);
            return ResponseEntity.ok("E-posta doğrudan gönderildi: " + to);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Hata: " + e.getMessage());
        }
    }
}

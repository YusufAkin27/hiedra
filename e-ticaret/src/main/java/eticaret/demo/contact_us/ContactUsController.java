package eticaret.demo.contact_us;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.response.ResponseMessage;

@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Validated
public class ContactUsController {
    private final ContactUsServis bizeUlasinServis;
    private final AuditLogService auditLogService;


    /**
     * Admin mesaja yanıt verir (eski endpoint - yeni AdminMessageController'da)
     * @deprecated Yeni AdminMessageController kullanın
     */
    @PostMapping("/admin/yanıtla/{messageId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Deprecated
    public ResponseEntity<ResponseMessage> respondToMessage(
            @PathVariable Long messageId, 
            @Valid @RequestBody AdminResponseRequest request,
            HttpServletRequest httpRequest) {
        try {
            ResponseMessage response = bizeUlasinServis.respondToMessage(messageId, request.getResponse());
            
            if (response.isSuccess()) {
                auditLogService.logSuccess("ADMIN_RESPOND_MESSAGE", "ContactUs", messageId,
                        "Admin mesaja yanıt verdi", request, response, httpRequest);
                return ResponseEntity.ok(response);
            } else {
                auditLogService.logError("ADMIN_RESPOND_MESSAGE", "ContactUs", messageId,
                        "Admin yanıt hatası: " + response.getMessage(), 
                        response.getMessage(), httpRequest);
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            auditLogService.logError("ADMIN_RESPOND_MESSAGE", "ContactUs", messageId,
                    "Beklenmeyen hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseMessage("Yanıt gönderilirken bir hata oluştu.", false));
        }
    }
    
    /**
     * Admin tüm mesajları görür (eski endpoint - yeni AdminMessageController'da)
     * @deprecated Yeni AdminMessageController kullanın
     */
    @GetMapping("/admin/mesajlar")
    @PreAuthorize("hasRole('ADMIN')")
    @Deprecated
    public ResponseEntity<ResponseMessage> getAllMessages(HttpServletRequest request) {
        try {
            ResponseMessage response = bizeUlasinServis.getAllMessages();
            
            if (response.isSuccess()) {
                auditLogService.logSimple("GET_ALL_CONTACT_MESSAGES", "ContactUs", null,
                        "Admin tüm mesajları görüntüledi", request);
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            auditLogService.logError("GET_ALL_CONTACT_MESSAGES", "ContactUs", null,
                    "Beklenmeyen hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseMessage("Mesajlar getirilirken bir hata oluştu.", false));
        }
    }

    /**
     * Kullanıcı mesaj gönderir
     * Detaylı validasyon ve spam koruması ile
     */
    @PostMapping("/send")
    public ResponseEntity<ResponseMessage> gonder(
            @Valid @RequestBody ContactUsMessage message, 
            HttpServletRequest request) {
        try {
        ResponseMessage response = bizeUlasinServis.gonder(message);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("SEND_CONTACT_MESSAGE", "ContactUs", null,
                        String.format("İletişim mesajı gönderildi: %s (Konu: %s)", 
                                message.getEmail(), message.getSubject()),
                    message, response, request);
                return ResponseEntity.ok(response);
        } else {
                auditLogService.logError("SEND_CONTACT_MESSAGE", "ContactUs", null,
                        "İletişim mesajı gönderilemedi: " + response.getMessage(), 
                        response.getMessage(), request);
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            log.error("Contact form submission error: ", e);
            auditLogService.logError("SEND_CONTACT_MESSAGE", "ContactUs", null,
                    "Beklenmeyen hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseMessage("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.", false));
        }
    }

    /**
     * Kullanıcı email doğrulama kodunu girer
     * Format: {"code":"123456"}
     */
    @PostMapping("/verify-email")
    public ResponseEntity<ResponseMessage> verifyEmail(
            @RequestBody String verificationData, 
            HttpServletRequest request) {
        try {
            if (verificationData == null || verificationData.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ResponseMessage("Doğrulama kodu boş olamaz.", false));
            }
            
        ResponseMessage response = bizeUlasinServis.verifyEmail(verificationData);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("VERIFY_CONTACT_EMAIL", "ContactUs", null,
                        "İletişim email doğrulama kodu doğrulandı", 
                        verificationData, response, request);
                return ResponseEntity.ok(response);
        } else {
                auditLogService.logError("VERIFY_CONTACT_EMAIL", "ContactUs", null,
                        "Email doğrulama hatası: " + response.getMessage(), 
                        response.getMessage(), request);
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            auditLogService.logError("VERIFY_CONTACT_EMAIL", "ContactUs", null,
                    "Beklenmeyen hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseMessage("Doğrulama işlemi sırasında bir hata oluştu.", false));
        }
    }



}
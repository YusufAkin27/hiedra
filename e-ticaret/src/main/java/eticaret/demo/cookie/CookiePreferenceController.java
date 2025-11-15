package eticaret.demo.cookie;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.response.DataResponseMessage;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Cookie tercihleri controller
 * GDPR uyumlu çerez yönetimi API'leri
 */
@RestController
@RequestMapping("/api/cookies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Validated
public class CookiePreferenceController {

    private final CookiePreferenceService cookiePreferenceService;
    private final AuditLogService auditLogService;

    /**
     * Çerez tercihlerini kaydet veya güncelle
     * POST /api/cookies/preferences
     * GDPR uyumlu consent kaydı
     */
    @PostMapping("/preferences")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> saveCookiePreference(
            @Valid @RequestBody CookiePreferenceRequest request,
            @AuthenticationPrincipal AppUser user,
            HttpServletRequest httpRequest) {
        
        try {
            // Zorunlu çerezler her zaman true olmalı
            if (request.getNecessary() != null && !request.getNecessary()) {
                request.setNecessary(true);
            }
            
            CookiePreference preference = cookiePreferenceService.saveCookiePreference(request, user, httpRequest);
            
            Map<String, Object> responseData = buildPreferenceResponse(preference);
            
            // Audit log
            auditLogService.logSuccess("SAVE_COOKIE_PREFERENCE", "CookiePreference", preference.getId(),
                    String.format("Cookie tercihi kaydedildi: UserId=%s, Analytics=%s, Marketing=%s, Personalization=%s",
                            user != null ? user.getId() : "Guest",
                            preference.getAnalytics(),
                            preference.getMarketing(),
                            preference.getPersonalization()),
                    request, responseData, httpRequest);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Çerez tercihleriniz başarıyla kaydedildi. Teşekkür ederiz.", 
                    responseData));
                    
        } catch (IllegalArgumentException e) {
            auditLogService.logError("SAVE_COOKIE_PREFERENCE", "CookiePreference", null,
                    "Validasyon hatası: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Geçersiz istek: " + e.getMessage()));
        } catch (Exception e) {
            auditLogService.logError("SAVE_COOKIE_PREFERENCE", "CookiePreference", null,
                    "Beklenmeyen hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(DataResponseMessage.error("Çerez tercihleri kaydedilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin."));
        }
    }

    /**
     * Çerez tercihlerini getir
     * GET /api/cookies/preferences?sessionId=xxx
     */
    @GetMapping("/preferences")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getCookiePreference(
            @RequestParam(required = false) String sessionId,
            @AuthenticationPrincipal AppUser user,
            HttpServletRequest httpRequest) {
        
        try {
            Optional<CookiePreference> preferenceOpt = cookiePreferenceService.getCookiePreference(user, sessionId, httpRequest);
            
            if (preferenceOpt.isPresent()) {
                CookiePreference preference = preferenceOpt.get();
                Map<String, Object> responseData = buildPreferenceResponse(preference);
                
                // Consent versiyonu güncel mi kontrol et
                boolean isVersionCurrent = cookiePreferenceService.isConsentVersionCurrent(user, sessionId, httpRequest);
                responseData.put("consentVersionCurrent", isVersionCurrent);
                
                return ResponseEntity.ok(DataResponseMessage.success("Çerez tercihleri başarıyla getirildi", responseData));
            } else {
                // Tercih bulunamadı, varsayılan değerleri döndür
                Map<String, Object> responseData = buildDefaultPreferenceResponse();
                
                return ResponseEntity.ok(DataResponseMessage.success(
                        "Çerez tercihi bulunamadı. Lütfen tercihlerinizi belirleyin.", 
                        responseData));
            }
        } catch (Exception e) {
            auditLogService.logError("GET_COOKIE_PREFERENCE", "CookiePreference", null,
                    "Beklenmeyen hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(DataResponseMessage.error("Çerez tercihleri getirilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin."));
        }
    }
    
    /**
     * Consent'i iptal et
     * DELETE /api/cookies/preferences?reason=xxx
     * GDPR uyumluluğu için kullanıcı consent'i iptal edebilir
     */
    @DeleteMapping("/preferences")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> revokeConsent(
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) String sessionId,
            @AuthenticationPrincipal AppUser user,
            HttpServletRequest httpRequest) {
        
        try {
            CookiePreference preference = cookiePreferenceService.revokeConsent(user, sessionId, reason, httpRequest);
            
            Map<String, Object> responseData = buildPreferenceResponse(preference);
            
            // Audit log
            auditLogService.logSuccess("REVOKE_COOKIE_CONSENT", "CookiePreference", preference.getId(),
                    String.format("Cookie consent iptal edildi: UserId=%s, Reason=%s",
                            user != null ? user.getId() : "Guest", reason),
                    reason, responseData, httpRequest);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Çerez tercihleriniz iptal edildi. Tüm çerezler (zorunlu olanlar hariç) devre dışı bırakıldı.",
                    responseData));
                    
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("İptal edilecek tercih bulunamadı: " + e.getMessage()));
        } catch (Exception e) {
            auditLogService.logError("REVOKE_COOKIE_CONSENT", "CookiePreference", null,
                    "Beklenmeyen hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(DataResponseMessage.error("Consent iptal edilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin."));
        }
    }
    
    /**
     * Consent versiyonu güncel mi kontrol et
     * GET /api/cookies/preferences/check-version?sessionId=xxx
     */
    @GetMapping("/preferences/check-version")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> checkConsentVersion(
            @RequestParam(required = false) String sessionId,
            @AuthenticationPrincipal AppUser user,
            HttpServletRequest httpRequest) {
        
        try {
            boolean isCurrent = cookiePreferenceService.isConsentVersionCurrent(user, sessionId, httpRequest);
            
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("isCurrent", isCurrent);
            responseData.put("currentVersion", "1.0");
            
            if (!isCurrent) {
                responseData.put("message", "Cookie politikası güncellendi. Lütfen yeni tercihlerinizi belirleyin.");
            } else {
                responseData.put("message", "Cookie tercihleriniz güncel.");
            }
            
            return ResponseEntity.ok(DataResponseMessage.success("Versiyon kontrolü tamamlandı", responseData));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(DataResponseMessage.error("Versiyon kontrolü yapılırken bir hata oluştu."));
        }
    }
    
    /**
     * Preference response oluştur
     */
    private Map<String, Object> buildPreferenceResponse(CookiePreference preference) {
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("id", preference.getId());
        responseData.put("necessary", preference.getNecessary());
        responseData.put("analytics", preference.getAnalytics());
        responseData.put("marketing", preference.getMarketing());
        responseData.put("personalization", preference.getPersonalization());
        responseData.put("consentGiven", preference.getConsentGiven());
        responseData.put("consentDate", preference.getConsentDate());
        responseData.put("consentVersion", preference.getConsentVersion());
        responseData.put("updatedAt", preference.getUpdatedAt());
        responseData.put("revokedAt", preference.getRevokedAt());
        responseData.put("isConsentValid", preference.isConsentValid());
        return responseData;
    }
    
    /**
     * Varsayılan preference response oluştur
     */
    private Map<String, Object> buildDefaultPreferenceResponse() {
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("necessary", true);
        responseData.put("analytics", false);
        responseData.put("marketing", false);
        responseData.put("personalization", false);
        responseData.put("consentGiven", false);
        responseData.put("consentVersion", "1.0");
        responseData.put("consentVersionCurrent", false);
        return responseData;
    }
}


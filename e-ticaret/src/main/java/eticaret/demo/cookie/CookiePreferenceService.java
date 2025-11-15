package eticaret.demo.cookie;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import eticaret.demo.auth.AppUser;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Cookie tercihleri servisi
 * GDPR uyumlu çerez yönetimi
 * Kullanıcı ve misafir tercihlerini yönetir
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Validated
public class CookiePreferenceService {

    private final CookiePreferenceRepository cookiePreferenceRepository;
    private final ObjectMapper objectMapper;
    
    // Consent versiyonu - politika değiştiğinde güncellenir
    private static final String CURRENT_CONSENT_VERSION = "1.0";

    /**
     * Çerez tercihlerini kaydet veya güncelle
     * GDPR uyumlu consent yönetimi
     * 
     * @param request Cookie tercih isteği
     * @param user Giriş yapmış kullanıcı (null ise misafir)
     * @param httpRequest HTTP request
     * @return Kaydedilmiş cookie preference
     */
    @Transactional
    public CookiePreference saveCookiePreference(
            @Valid CookiePreferenceRequest request, 
            AppUser user, 
            HttpServletRequest httpRequest) {
        try {
            // 1. Request validasyonu
            validateRequest(request);
            
            // 2. IP ve User Agent bilgilerini al
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            String sessionId = request.getSessionId();
            String consentVersion = request.getConsentVersion() != null 
                    ? request.getConsentVersion() 
                    : CURRENT_CONSENT_VERSION;

            CookiePreference preference;
            boolean isNewPreference = false;

            // 3. Kullanıcı giriş yapmışsa kullanıcı ID ile ara
            if (user != null) {
                Optional<CookiePreference> existing = cookiePreferenceRepository.findByUserId(user.getId());
                
                if (existing.isPresent()) {
                    preference = existing.get();
                    
                    // Consent versiyonu değişmiş mi kontrol et
                    if (!consentVersion.equals(preference.getConsentVersion())) {
                        // Önceki tercihleri kaydet
                        savePreviousPreferences(preference);
                        log.info("Consent versiyonu değişti: UserId={}, Eski={}, Yeni={}", 
                                user.getId(), preference.getConsentVersion(), consentVersion);
                    }
                } else {
                    // Kullanıcı için yeni tercih oluştur
                    // Önce session ID ile tercih var mı kontrol et (guest'ten user'a geçiş)
                    if (sessionId != null && !sessionId.isEmpty()) {
                        Optional<CookiePreference> sessionPreference = cookiePreferenceRepository.findBySessionId(sessionId);
                        if (sessionPreference.isPresent()) {
                            // Session tercihini kullanıcıya transfer et
                            preference = sessionPreference.get();
                            preference.setUser(user);
                            preference.setSessionId(null); // Session ID'yi temizle
                            log.info("Session tercihi kullanıcıya transfer edildi: UserId={}, SessionId={}", 
                                    user.getId(), sessionId);
                        } else {
                            preference = createNewPreference(user, null, ipAddress, userAgent);
                            isNewPreference = true;
                        }
                    } else {
                        preference = createNewPreference(user, null, ipAddress, userAgent);
                        isNewPreference = true;
                    }
                }
            } 
            // 4. Session ID varsa session ID ile ara (guest kullanıcı)
            else if (sessionId != null && !sessionId.isEmpty()) {
                Optional<CookiePreference> existing = cookiePreferenceRepository.findBySessionId(sessionId);
                
                if (existing.isPresent()) {
                    preference = existing.get();
                    
                    // Consent versiyonu değişmiş mi kontrol et
                    if (!consentVersion.equals(preference.getConsentVersion())) {
                        savePreviousPreferences(preference);
                        log.info("Consent versiyonu değişti: SessionId={}, Eski={}, Yeni={}", 
                                sessionId, preference.getConsentVersion(), consentVersion);
                    }
                } else {
                    preference = createNewPreference(null, sessionId, ipAddress, userAgent);
                    isNewPreference = true;
                }
            } 
            // 5. IP adresi ile ara (anonim kullanıcılar için - fallback)
            else {
                Optional<CookiePreference> existing = cookiePreferenceRepository.findLatestByIpAddress(ipAddress);
                
                if (existing.isPresent()) {
                    preference = existing.get();
                    
                    // Consent versiyonu değişmiş mi kontrol et
                    if (!consentVersion.equals(preference.getConsentVersion())) {
                        savePreviousPreferences(preference);
                        log.info("Consent versiyonu değişti: IP={}, Eski={}, Yeni={}", 
                                ipAddress, preference.getConsentVersion(), consentVersion);
                    }
                } else {
                    preference = createNewPreference(null, null, ipAddress, userAgent);
                    isNewPreference = true;
                }
            }

            // 6. Önceki tercihleri kaydet (değişiklik varsa)
            if (!isNewPreference && hasPreferencesChanged(preference, request)) {
                savePreviousPreferences(preference);
            }

            // 7. Tercihleri güncelle
            updatePreferences(preference, request, consentVersion);
            
            // 8. Metadata güncelle
            if (userAgent != null && (preference.getUserAgent() == null || !userAgent.equals(preference.getUserAgent()))) {
                preference.setUserAgent(userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent);
            }
            if (ipAddress != null && preference.getIpAddress() == null) {
                preference.setIpAddress(ipAddress);
            }
            
            // 9. İptal edilmiş consent'i yeniden aktif et
            if (preference.getRevokedAt() != null) {
                preference.setRevokedAt(null);
                preference.setRevocationReason(null);
                log.info("İptal edilmiş consent yeniden aktif edildi: PreferenceId={}", preference.getId());
            }

            CookiePreference saved = cookiePreferenceRepository.save(preference);
            
            log.info("Cookie tercihi kaydedildi: ID={}, UserId={}, SessionId={}, ConsentVersion={}, IsNew={}", 
                    saved.getId(), 
                    user != null ? user.getId() : null, 
                    sessionId, 
                    consentVersion,
                    isNewPreference);
            
            return saved;
            
        } catch (Exception e) {
            log.error("Cookie tercihi kaydedilirken hata: ", e);
            throw new RuntimeException("Cookie tercihi kaydedilemedi: " + e.getMessage(), e);
        }
    }
    
    /**
     * Yeni cookie preference oluştur
     */
    private CookiePreference createNewPreference(AppUser user, String sessionId, String ipAddress, String userAgent) {
        return CookiePreference.builder()
                .user(user)
                .sessionId(sessionId)
                .ipAddress(ipAddress)
                .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                .necessary(true) // Zorunlu çerezler her zaman true
                .analytics(false)
                .marketing(false)
                .personalization(false)
                .consentGiven(false)
                .consentVersion(CURRENT_CONSENT_VERSION)
                .build();
    }
    
    /**
     * Tercihleri güncelle
     */
    private void updatePreferences(CookiePreference preference, CookiePreferenceRequest request, String consentVersion) {
        LocalDateTime now = LocalDateTime.now();
        
        // Zorunlu çerezler her zaman true (değiştirilemez)
        preference.setNecessary(true);
        
        // Diğer tercihleri güncelle
        preference.setAnalytics(request.getAnalytics() != null ? request.getAnalytics() : false);
        preference.setMarketing(request.getMarketing() != null ? request.getMarketing() : false);
        preference.setPersonalization(request.getPersonalization() != null ? request.getPersonalization() : false);
        
        // Consent bilgilerini güncelle
        if (!preference.getConsentGiven() || !consentVersion.equals(preference.getConsentVersion())) {
            preference.setConsentGiven(true);
            if (preference.getConsentDate() == null) {
                preference.setConsentDate(now);
            }
        }
        preference.setConsentVersion(consentVersion);
        preference.setUpdatedAt(now);
    }
    
    /**
     * Önceki tercihleri kaydet (JSON formatında)
     */
    private void savePreviousPreferences(CookiePreference preference) {
        try {
            Map<String, Object> previousPrefs = new HashMap<>();
            previousPrefs.put("necessary", preference.getNecessary());
            previousPrefs.put("analytics", preference.getAnalytics());
            previousPrefs.put("marketing", preference.getMarketing());
            previousPrefs.put("personalization", preference.getPersonalization());
            previousPrefs.put("consentVersion", preference.getConsentVersion());
            previousPrefs.put("consentDate", preference.getConsentDate());
            previousPrefs.put("updatedAt", preference.getUpdatedAt());
            
            String previousPrefsJson = objectMapper.writeValueAsString(previousPrefs);
            preference.setPreviousPreferences(previousPrefsJson);
            log.debug("Önceki tercihler kaydedildi: PreferenceId={}", preference.getId());
        } catch (Exception e) {
            log.warn("Önceki tercihler kaydedilemedi: {}", e.getMessage());
        }
    }
    
    /**
     * Tercihler değişmiş mi kontrol et
     */
    private boolean hasPreferencesChanged(CookiePreference preference, CookiePreferenceRequest request) {
        boolean analyticsChanged = !preference.getAnalytics().equals(request.getAnalytics() != null ? request.getAnalytics() : false);
        boolean marketingChanged = !preference.getMarketing().equals(request.getMarketing() != null ? request.getMarketing() : false);
        boolean personalizationChanged = !preference.getPersonalization().equals(request.getPersonalization() != null ? request.getPersonalization() : false);
        
        return analyticsChanged || marketingChanged || personalizationChanged;
    }
    
    /**
     * Request validasyonu
     */
    private void validateRequest(CookiePreferenceRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Cookie tercih isteği boş olamaz");
        }
        
        // Zorunlu çerezler her zaman true olmalı
        if (request.getNecessary() != null && !request.getNecessary()) {
            log.warn("Zorunlu çerezler false olarak gönderildi, true olarak ayarlanıyor");
            request.setNecessary(true);
        }
    }

    /**
     * Çerez tercihlerini getir
     * Öncelik sırası: User > Session ID > IP Address
     * 
     * @param user Giriş yapmış kullanıcı (null ise misafir)
     * @param sessionId Session ID (guest kullanıcılar için)
     * @param httpRequest HTTP request
     * @return Cookie preference (varsa)
     */
    @Transactional(readOnly = true)
    public Optional<CookiePreference> getCookiePreference(
            AppUser user, 
            String sessionId, 
            HttpServletRequest httpRequest) {
        try {
            // 1. Kullanıcı giriş yapmışsa kullanıcı ID ile ara
            if (user != null) {
                Optional<CookiePreference> userPreference = cookiePreferenceRepository.findByUserId(user.getId());
                if (userPreference.isPresent()) {
                    CookiePreference pref = userPreference.get();
                    // Consent geçerli mi kontrol et
                    if (pref.isConsentValid()) {
                        log.debug("Kullanıcı cookie tercihi bulundu: UserId={}, PreferenceId={}", 
                                user.getId(), pref.getId());
                        return Optional.of(pref);
                    } else {
                        log.debug("Kullanıcı cookie tercihi iptal edilmiş: UserId={}", user.getId());
                        return Optional.empty();
                    }
                }
            }
            
            // 2. Session ID varsa session ID ile ara
            if (sessionId != null && !sessionId.isEmpty()) {
                Optional<CookiePreference> sessionPreference = cookiePreferenceRepository.findBySessionId(sessionId);
                if (sessionPreference.isPresent()) {
                    CookiePreference pref = sessionPreference.get();
                    // Consent geçerli mi kontrol et
                    if (pref.isConsentValid()) {
                        log.debug("Session cookie tercihi bulundu: SessionId={}, PreferenceId={}", 
                                sessionId, pref.getId());
                        return Optional.of(pref);
                    } else {
                        log.debug("Session cookie tercihi iptal edilmiş: SessionId={}", sessionId);
                        return Optional.empty();
                    }
                }
            }
            
            // 3. IP adresi ile ara (anonim kullanıcılar için - fallback)
            String ipAddress = getClientIpAddress(httpRequest);
            Optional<CookiePreference> ipPreference = cookiePreferenceRepository.findLatestByIpAddress(ipAddress);
            if (ipPreference.isPresent()) {
                CookiePreference pref = ipPreference.get();
                // Consent geçerli mi kontrol et
                if (pref.isConsentValid()) {
                    log.debug("IP cookie tercihi bulundu: IP={}, PreferenceId={}", ipAddress, pref.getId());
                    return Optional.of(pref);
                } else {
                    log.debug("IP cookie tercihi iptal edilmiş: IP={}", ipAddress);
                    return Optional.empty();
                }
            }
            
            log.debug("Cookie tercihi bulunamadı: UserId={}, SessionId={}, IP={}", 
                    user != null ? user.getId() : null, sessionId, ipAddress);
            return Optional.empty();
            
        } catch (Exception e) {
            log.error("Cookie tercihi getirilirken hata: ", e);
            return Optional.empty();
        }
    }
    
    /**
     * Consent'i iptal et
     * GDPR uyumluluğu için kullanıcı consent'i iptal edebilir
     * 
     * @param user Giriş yapmış kullanıcı
     * @param sessionId Session ID (guest için)
     * @param reason İptal nedeni (opsiyonel)
     * @param httpRequest HTTP request
     * @return İptal edilmiş preference
     */
    @Transactional
    public CookiePreference revokeConsent(
            AppUser user, 
            String sessionId, 
            String reason,
            HttpServletRequest httpRequest) {
        try {
            Optional<CookiePreference> preferenceOpt = getCookiePreference(user, sessionId, httpRequest);
            
            if (preferenceOpt.isEmpty()) {
                throw new IllegalArgumentException("İptal edilecek cookie tercihi bulunamadı");
            }
            
            CookiePreference preference = preferenceOpt.get();
            preference.revokeConsent(reason);
            
            CookiePreference saved = cookiePreferenceRepository.save(preference);
            log.info("Cookie consent iptal edildi: PreferenceId={}, UserId={}, Reason={}", 
                    saved.getId(), user != null ? user.getId() : null, reason);
            
            return saved;
            
        } catch (Exception e) {
            log.error("Cookie consent iptal edilirken hata: ", e);
            throw new RuntimeException("Cookie consent iptal edilemedi: " + e.getMessage(), e);
        }
    }
    
    /**
     * Guest kullanıcının tercihlerini kullanıcıya transfer et
     * Kullanıcı giriş yaptığında çağrılır
     * 
     * @param user Giriş yapan kullanıcı
     * @param sessionId Guest session ID
     * @param httpRequest HTTP request
     * @return Transfer edilmiş preference
     */
    @Transactional
    public CookiePreference transferGuestPreferencesToUser(
            AppUser user, 
            String sessionId, 
            HttpServletRequest httpRequest) {
        try {
            if (user == null) {
                throw new IllegalArgumentException("Kullanıcı boş olamaz");
            }
            
            // Kullanıcının zaten tercihi var mı kontrol et
            Optional<CookiePreference> userPreference = cookiePreferenceRepository.findByUserId(user.getId());
            if (userPreference.isPresent()) {
                log.debug("Kullanıcının zaten tercihi var, transfer atlandı: UserId={}", user.getId());
                return userPreference.get();
            }
            
            // Session ID ile guest tercihini bul
            if (sessionId != null && !sessionId.isEmpty()) {
                Optional<CookiePreference> guestPreference = cookiePreferenceRepository.findBySessionId(sessionId);
                
                if (guestPreference.isPresent()) {
                    CookiePreference preference = guestPreference.get();
                    preference.setUser(user);
                    preference.setSessionId(null); // Session ID'yi temizle
                    
                    CookiePreference saved = cookiePreferenceRepository.save(preference);
                    log.info("Guest tercihi kullanıcıya transfer edildi: UserId={}, SessionId={}, PreferenceId={}", 
                            user.getId(), sessionId, saved.getId());
                    
                    return saved;
                }
            }
            
            // Guest tercihi yoksa yeni oluştur
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            
            CookiePreference newPreference = createNewPreference(user, null, ipAddress, userAgent);
            CookiePreference saved = cookiePreferenceRepository.save(newPreference);
            
            log.info("Kullanıcı için yeni cookie tercihi oluşturuldu: UserId={}, PreferenceId={}", 
                    user.getId(), saved.getId());
            
            return saved;
            
        } catch (Exception e) {
            log.error("Guest tercihi kullanıcıya transfer edilirken hata: ", e);
            throw new RuntimeException("Tercih transferi başarısız: " + e.getMessage(), e);
        }
    }
    
    /**
     * Consent versiyonu güncel mi kontrol et
     * 
     * @param user Kullanıcı
     * @param sessionId Session ID
     * @param httpRequest HTTP request
     * @return Consent güncel mi?
     */
    @Transactional(readOnly = true)
    public boolean isConsentVersionCurrent(AppUser user, String sessionId, HttpServletRequest httpRequest) {
        Optional<CookiePreference> preferenceOpt = getCookiePreference(user, sessionId, httpRequest);
        
        if (preferenceOpt.isEmpty()) {
            return false; // Tercih yoksa yeni consent gerekli
        }
        
        CookiePreference preference = preferenceOpt.get();
        return CURRENT_CONSENT_VERSION.equals(preference.getConsentVersion());
    }

    /**
     * Client IP adresini al
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("X-Real-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        
        // X-Forwarded-For birden fazla IP içerebilir, ilkini al
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        
        return ipAddress;
    }
}


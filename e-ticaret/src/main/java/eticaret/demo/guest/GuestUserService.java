package eticaret.demo.guest;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Guest kullanıcı yönetimi servisi
 * Çerez tabanlı kimlik doğrulama ve guest kullanıcı işlemleri
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GuestUserService {

    private final GuestUserRepository guestUserRepository;
    
    // Çerez adı
    private static final String GUEST_USER_ID_COOKIE = "hiedra_guest_id";
    private static final int COOKIE_MAX_AGE_DAYS = 365; // 1 yıl
    private static final int COOKIE_MAX_AGE_SECONDS = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    
    // Guest User ID format kontrolü - UUID veya guest_ formatını kabul et
    private static final Pattern UUID_PATTERN = Pattern.compile(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    );
    // Frontend'den gelen guest_ formatı: guest_timestamp_randomstring
    private static final Pattern GUEST_PREFIX_PATTERN = Pattern.compile(
        "^guest_[0-9]+_[a-zA-Z0-9]+$"
    );

    /**
     * Guest kullanıcı ID'sini çerezden al veya oluştur
     * @param request HTTP request
     * @param response HTTP response (yeni çerez oluşturmak için)
     * @return Guest kullanıcı ID'si
     */
    @Transactional
    public String getOrCreateGuestUserId(HttpServletRequest request, HttpServletResponse response) {
        // Önce çerezden kontrol et
        String guestUserId = getGuestUserIdFromCookie(request);
        
        // Çerez yoksa veya geçersizse yeni oluştur
        if (guestUserId == null || !isValidGuestUserId(guestUserId)) {
            guestUserId = generateGuestUserId();
            setGuestUserIdCookie(response, guestUserId);
            log.debug("Yeni guest kullanıcı ID oluşturuldu: {}", guestUserId);
        }
        
        return guestUserId;
    }

    /**
     * Çerezden guest kullanıcı ID'sini al
     */
    public String getGuestUserIdFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        
        for (Cookie cookie : request.getCookies()) {
            if (GUEST_USER_ID_COOKIE.equals(cookie.getName())) {
                String value = cookie.getValue();
                if (value != null && !value.isEmpty() && isValidGuestUserId(value)) {
                    return value;
                }
            }
        }
        
        return null;
    }

    /**
     * Guest kullanıcı ID'sini çereze kaydet
     */
    public void setGuestUserIdCookie(HttpServletResponse response, String guestUserId) {
        if (guestUserId == null || guestUserId.isEmpty()) {
            return;
        }
        
        Cookie cookie = new Cookie(GUEST_USER_ID_COOKIE, guestUserId);
        cookie.setMaxAge(COOKIE_MAX_AGE_SECONDS);
        cookie.setPath("/");
        cookie.setHttpOnly(true); // XSS koruması için
        // Secure flag'i response'dan alınamaz, bu yüzden kaldırıyoruz
        // cookie.setSecure(true); // Production'da HTTPS kullanılıyorsa true yapılmalı
        
        response.addCookie(cookie);
        log.debug("Guest kullanıcı ID çereze kaydedildi: {}", guestUserId);
    }

    /**
     * Guest kullanıcı ID'sini doğrula
     * UUID formatı veya guest_ prefix formatını kabul eder
     */
    public boolean isValidGuestUserId(String guestUserId) {
        if (guestUserId == null || guestUserId.isEmpty()) {
            return false;
        }
        
        // UUID formatını kontrol et
        if (UUID_PATTERN.matcher(guestUserId).matches()) {
            try {
                UUID.fromString(guestUserId);
                return true;
            } catch (IllegalArgumentException e) {
                return false;
            }
        }
        
        // Frontend'den gelen guest_ formatını kontrol et
        if (GUEST_PREFIX_PATTERN.matcher(guestUserId).matches()) {
            return true;
        }
        
        return false;
    }

    /**
     * Yeni guest kullanıcı ID'si oluştur
     */
    private String generateGuestUserId() {
        return UUID.randomUUID().toString();
    }

    /**
     * Guest kullanıcı ID'sini temizle (çerez sil)
     */
    public void clearGuestUserIdCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(GUEST_USER_ID_COOKIE, "");
        cookie.setMaxAge(0);
        cookie.setPath("/");
        response.addCookie(cookie);
        log.debug("Guest kullanıcı ID çerezi temizlendi");
    }

    /**
     * Guest kullanıcıyı email ile bul veya oluştur
     */
    @Transactional
    public GuestUser findOrCreateGuestUserByEmail(String email, String fullName, String phone, 
                                                   String ipAddress, String userAgent) {
        Optional<GuestUser> existing = guestUserRepository.findByEmailIgnoreCase(email);
        
        if (existing.isPresent()) {
            GuestUser guest = existing.get();
            guest.setLastSeenAt(LocalDateTime.now());
            guest.setViewCount(guest.getViewCount() + 1);
            
            // Eksik bilgileri güncelle
            if (guest.getFullName() == null || guest.getFullName().isEmpty()) {
                guest.setFullName(fullName);
            }
            if (guest.getPhone() == null || guest.getPhone().isEmpty()) {
                guest.setPhone(phone);
            }
            if (ipAddress != null && (guest.getIpAddress() == null || guest.getIpAddress().isEmpty())) {
                guest.setIpAddress(ipAddress);
            }
            
            return guestUserRepository.save(guest);
        } else {
            GuestUser newGuest = GuestUser.builder()
                    .email(email)
                    .fullName(fullName)
                    .phone(phone)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent != null && userAgent.length() > 500 ? 
                              userAgent.substring(0, 500) : userAgent)
                    .firstSeenAt(LocalDateTime.now())
                    .lastSeenAt(LocalDateTime.now())
                    .orderCount(0)
                    .viewCount(1)
                    .build();
            
            return guestUserRepository.save(newGuest);
        }
    }

    /**
     * Guest kullanıcının siparişlerini getir
     */
    @Transactional(readOnly = true)
    public boolean hasGuestOrders(String guestUserId) {
        // OrderRepository'de guestUserId ile sorgu yapılabilir
        // Şimdilik email ile kontrol ediyoruz
        return false; // OrderRepository'ye query eklenmeli
    }

    /**
     * Guest kullanıcının sepetini kontrol et
     */
    @Transactional(readOnly = true)
    public boolean hasGuestCart(String guestUserId) {
        // CartRepository'de kontrol edilebilir
        return guestUserId != null && !guestUserId.isEmpty();
    }
}


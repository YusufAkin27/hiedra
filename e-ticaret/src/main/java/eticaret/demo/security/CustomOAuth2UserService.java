package eticaret.demo.security;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final AppUserRepository appUserRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        
        try {
            return processOAuth2User(oauth2User);
        } catch (Exception e) {
            log.error("OAuth2 kullanıcı işleme hatası", e);
            throw new OAuth2AuthenticationException("OAuth2 kullanıcı işleme hatası: " );
        }
    }

    @Transactional
    public OAuth2User processOAuth2User(OAuth2User oauth2User) {
        Map<String, Object> attributes = oauth2User.getAttributes();
        
        String email = (String) attributes.get("email");
        if (email == null || email.isEmpty()) {
            throw new OAuth2AuthenticationException("Google hesabından e-posta adresi alınamadı");
        }
        
        email = email.trim().toLowerCase(Locale.ROOT);
        String name = (String) attributes.get("name");
        String picture = (String) attributes.get("picture");
        
        // Google'dan telefon numarasını al (People API'den gelebilir)
        String phone = extractPhoneFromAttributes(attributes);
        
        log.info("Google OAuth2 kullanıcı bilgileri alındı - Email: {}, Name: {}, Phone: {}", email, name, phone != null ? "***" : "yok");
        
        // Kullanıcıyı bul veya oluştur
        String finalEmail = email;
        String finalName = name;
        String finalPhone = phone;
        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> {
                    AppUser newUser = AppUser.builder()
                            .email(finalEmail)
                            .fullName(finalName)
                            .phone(finalPhone)
                            .role(UserRole.USER)
                            .emailVerified(true) // Google'dan gelen kullanıcılar zaten doğrulanmış
                            .active(true)
                            .build();
                    return appUserRepository.save(newUser);
                });
        
        // Kullanıcı bilgilerini güncelle - Google'dan gelen veriler her zaman güncel olsun
        boolean needsUpdate = false;
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            needsUpdate = true;
        }
        if (!user.isActive()) {
            user.setActive(true);
            needsUpdate = true;
        }
        // Ad soyadı her zaman güncelle (Google'dan gelen veri daha güncel olabilir)
        if (name != null && !name.isEmpty() && !name.equals(user.getFullName())) {
            user.setFullName(name);
            needsUpdate = true;
        }
        // Telefon numarasını güncelle (varsa ve farklıysa)
        if (phone != null && !phone.isEmpty() && !phone.equals(user.getPhone())) {
            user.setPhone(phone);
            needsUpdate = true;
        }
        // Last login zamanını güncelle
        user.setLastLoginAt(LocalDateTime.now());
        needsUpdate = true;
        
        if (needsUpdate) {
            appUserRepository.save(user);
        }
        
        // CustomOAuth2User oluştur ve döndür
        return CustomOAuth2User.builder()
                .oauth2User(oauth2User)
                .email(email)
                .name(name)
                .picture(picture)
                .appUser(user)
                .build();
    }
    
    /**
     * Google OAuth2 attributes'inden telefon numarasını çıkar
     * Google People API'den gelen telefon numarası farklı formatlarda olabilir
     */
    private String extractPhoneFromAttributes(Map<String, Object> attributes) {
        // Önce direkt phone attribute'unu kontrol et
        Object phoneObj = attributes.get("phone");
        if (phoneObj != null) {
            String phone = phoneObj.toString().trim();
            if (!phone.isEmpty()) {
                return normalizePhoneNumber(phone);
            }
        }
        
        // Google People API'den gelen telefon numaraları farklı formatlarda olabilir
        // phoneNumbers array'i içinde gelebilir
        Object phoneNumbersObj = attributes.get("phoneNumbers");
        if (phoneNumbersObj instanceof java.util.List) {
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> phoneNumbers = (java.util.List<Map<String, Object>>) phoneNumbersObj;
            if (!phoneNumbers.isEmpty()) {
                Map<String, Object> firstPhone = phoneNumbers.get(0);
                Object value = firstPhone.get("value");
                if (value != null) {
                    String phone = value.toString().trim();
                    if (!phone.isEmpty()) {
                        return normalizePhoneNumber(phone);
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Telefon numarasını normalize et (Türkiye formatına uygun)
     */
    private String normalizePhoneNumber(String phone) {
        if (phone == null || phone.isEmpty()) {
            return null;
        }
        
        // Sadece rakamları al
        String digits = phone.replaceAll("[^0-9+]", "");
        
        // +90 ile başlıyorsa, 0 ile değiştir
        if (digits.startsWith("+90")) {
            digits = "0" + digits.substring(3);
        }
        
        // 90 ile başlıyorsa (ama + yok), 0 ile değiştir
        if (digits.startsWith("90") && digits.length() == 12) {
            digits = "0" + digits.substring(2);
        }
        
        // Türkiye telefon numarası formatı kontrolü (05XX XXX XX XX)
        if (digits.length() >= 10 && digits.startsWith("0")) {
            return digits;
        }
        
        // Eğer format uygun değilse, olduğu gibi döndür
        return digits;
    }
}


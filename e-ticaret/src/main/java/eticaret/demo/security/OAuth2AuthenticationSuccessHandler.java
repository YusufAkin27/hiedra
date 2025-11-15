package eticaret.demo.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AuthResponse;
import eticaret.demo.auth.AuthService;
import eticaret.demo.auth.UserSummary;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        log.info("OAuth2 başarılı - Authentication: {}", authentication);
        log.info("Principal tipi: {}", authentication.getPrincipal().getClass().getName());
        
        AppUser appUser = null;
        
        // CustomOAuth2User kontrolü
        if (authentication.getPrincipal() instanceof CustomOAuth2User) {
            CustomOAuth2User customOAuth2User = (CustomOAuth2User) authentication.getPrincipal();
            appUser = customOAuth2User.getAppUser();
            log.info("CustomOAuth2User'dan AppUser alındı: {}", appUser.getEmail());
        } 
        // Standart OAuth2User kontrolü (fallback)
        else if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
            org.springframework.security.oauth2.core.user.OAuth2User oauth2User = 
                (org.springframework.security.oauth2.core.user.OAuth2User) authentication.getPrincipal();
            
            Map<String, Object> attributes = oauth2User.getAttributes();
            String email = (String) attributes.get("email");
            
            if (email != null && !email.isEmpty()) {
                email = email.trim().toLowerCase();
                log.info("OAuth2User'dan email alındı: {}, AppUser bulunuyor...", email);
                
                // Google'dan telefon numarasını çıkar
                String phone = extractPhoneFromAttributes(attributes);
                
                // AppUser'ı email ile bul
                try {
                    appUser = authService.findOrCreateUserByEmail(email, 
                        (String) attributes.get("name"), phone, request);
                    log.info("AppUser bulundu/oluşturuldu: {}", appUser.getEmail());
                } catch (Exception e) {
                    log.error("AppUser bulunurken/oluşturulurken hata: ", e);
                    String errorHtml = buildErrorHtml("Kullanıcı bilgileri alınamadı: " + e.getMessage());
                    response.setContentType("text/html;charset=UTF-8");
                    response.getWriter().write(errorHtml);
                    response.getWriter().flush();
                    return;
                }
            } else {
                log.error("OAuth2User attributes'inde email bulunamadı");
                String errorHtml = buildErrorHtml("E-posta adresi alınamadı");
                response.setContentType("text/html;charset=UTF-8");
                response.getWriter().write(errorHtml);
                response.getWriter().flush();
                return;
            }
        } else {
            log.error("OAuth2 principal beklenen tipte değil: {}", authentication.getPrincipal().getClass());
            String errorHtml = buildErrorHtml("Beklenmeyen kullanıcı tipi: " + authentication.getPrincipal().getClass().getName());
            response.setContentType("text/html;charset=UTF-8");
            response.getWriter().write(errorHtml);
            response.getWriter().flush();
            return;
        }
        
        // AppUser bulundu, JWT token oluştur
        if (appUser != null) {
            try {
                // JWT token oluştur
                AuthResponse authResponse = authService.buildAuthResponseForOAuth2(appUser);
                
                // HTML sayfası oluştur ve frontend'e mesaj gönder
                String html = buildSuccessHtml(authResponse);
                response.setContentType("text/html;charset=UTF-8");
                response.getWriter().write(html);
                response.getWriter().flush();
                
                log.info("OAuth2 giriş başarılı - User: {}", appUser.getEmail());
                
            } catch (Exception e) {
                log.error("OAuth2 token oluşturma hatası", e);
                String errorHtml = buildErrorHtml("Token oluşturulurken hata oluştu: " + e.getMessage());
                response.setContentType("text/html;charset=UTF-8");
                response.getWriter().write(errorHtml);
                response.getWriter().flush();
            }
        } else {
            log.error("AppUser null, token oluşturulamıyor");
            String errorHtml = buildErrorHtml("Kullanıcı bilgileri alınamadı");
            response.setContentType("text/html;charset=UTF-8");
            response.getWriter().write(errorHtml);
            response.getWriter().flush();
        }
    }

    private String buildSuccessHtml(AuthResponse authResponse) {
        UserSummary user = authResponse.getUser();
        // JSON string'i güvenli şekilde oluştur (escape karakterleri ile)
        String email = escapeJson(user.getEmail());
        String role = escapeJson(user.getRole().name());
        String lastLoginAt = user.getLastLoginAt() != null ? "\"" + escapeJson(user.getLastLoginAt().toString()) + "\"" : "null";
        String accessToken = escapeJson(authResponse.getAccessToken());
        
        String userJson = String.format(
            "{\"id\":%d,\"email\":\"%s\",\"role\":\"%s\",\"emailVerified\":%s,\"active\":%s,\"lastLoginAt\":%s}",
            user.getId(),
            email,
            role,
            user.isEmailVerified(),
            user.isActive(),
            lastLoginAt
        );
        
        return "<!DOCTYPE html>" +
                "<html><head>" +
                "<meta charset='UTF-8'>" +
                "<title>Google Giriş Başarılı</title>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }" +
                ".container { background: white; color: #333; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }" +
                "h1 { color: #4CAF50; }" +
                "</style>" +
                "</head><body>" +
                "<div class='container'>" +
                "<h1>✓ Giriş Başarılı!</h1>" +
                "<p>Yönlendiriliyorsunuz...</p>" +
                "</div>" +
                "<script>" +
                "try {" +
                "  const authData = {" +
                "    user: " + userJson + "," +
                "    accessToken: '" + accessToken + "'" +
                "  };" +
                "  window.opener.postMessage({" +
                "    type: 'GOOGLE_AUTH_SUCCESS'," +
                "    authData: authData" +
                "  }, '*');" +
                "  setTimeout(function() { window.close(); }, 1000);" +
                "} catch(e) {" +
                "  console.error('PostMessage hatası:', e);" +
                "  window.opener.postMessage({" +
                "    type: 'GOOGLE_AUTH_ERROR'," +
                "    error: 'Mesaj gönderilirken hata oluştu: ' + e.message" +
                "  }, '*');" +
                "  setTimeout(function() { window.close(); }, 2000);" +
                "}" +
                "</script>" +
                "</body></html>";
    }

    private String buildErrorHtml(String errorMessage) {
        return "<!DOCTYPE html>" +
                "<html><head>" +
                "<meta charset='UTF-8'>" +
                "<title>Google Giriş Hatası</title>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }" +
                ".container { background: white; color: #333; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }" +
                "h1 { color: #f44336; }" +
                "</style>" +
                "</head><body>" +
                "<div class='container'>" +
                "<h1>✗ Giriş Başarısız</h1>" +
                "<p>" + errorMessage + "</p>" +
                "</div>" +
                "<script>" +
                "window.opener.postMessage({" +
                "  type: 'GOOGLE_AUTH_ERROR'," +
                "  error: '" + errorMessage.replace("'", "\\'") + "'" +
                "}, '*');" +
                "setTimeout(function() { window.close(); }, 2000);" +
                "</script>" +
                "</body></html>";
    }
    
    private String escapeJson(String str) {
        if (str == null) {
            return "";
        }
        return str.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
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


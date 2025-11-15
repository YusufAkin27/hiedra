package eticaret.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate limiting filter - API isteklerini sınırlar
 * Sadece kritik endpoint'ler için rate limiting uygular
 * Email doğrulama için EmailVerificationSecurityService kullanılır
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitingService rateLimitingService;
    
    // Email doğrulama endpoint'leri için sıkı rate limiting (ekstra koruma)
    // Asıl kontrol EmailVerificationSecurityService'de yapılıyor
    private static final int MAX_EMAIL_VERIFICATION_REQUESTS_PER_15MIN = 10; // 15 dakikada 10 istek
    
    // Admin endpoint'leri için makul rate limiting (abuse önleme)
    private static final int MAX_ADMIN_REQUESTS_PER_MINUTE = 100; // 1 dakikada 100 istek (çok esnek)
    
    // Genel endpoint'ler için rate limiting YOK - kullanıcı deneyimini bozmamak için

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        if (path == null) {
            filterChain.doFilter(request, response);
            return;
        }
        
        String ipAddress = getClientIpAddress(request);
        
        // Sadece email doğrulama endpoint'leri için rate limiting
        // (request-code, verify-code, resend-code)
        if (isEmailVerificationEndpoint(path)) {
            if (!rateLimitingService.isAllowed(ipAddress, MAX_EMAIL_VERIFICATION_REQUESTS_PER_15MIN, 900)) {
                log.warn("Rate limit aşıldı - Email doğrulama endpoint: IP={}, Path={}", ipAddress, path);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Çok fazla istek. Lütfen birkaç dakika bekleyip tekrar deneyin.\"}");
                return;
            }
        }
        // Admin endpoint'leri için çok esnek rate limiting (sadece aşırı abuse önleme)
        else if (path.startsWith("/api/admin/")) {
            if (!rateLimitingService.isAllowed(ipAddress, MAX_ADMIN_REQUESTS_PER_MINUTE, 60)) {
                log.warn("Rate limit aşıldı - Admin endpoint: IP={}, Path={}", ipAddress, path);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Çok fazla istek. Lütfen birkaç dakika bekleyip tekrar deneyin.\"}");
                return;
            }
        }
        // Diğer tüm endpoint'ler için rate limiting YOK
        // Kullanıcı deneyimini bozmamak için
        
        filterChain.doFilter(request, response);
    }
    
    /**
     * Email doğrulama endpoint'i mi kontrol et
     */
    private boolean isEmailVerificationEndpoint(String path) {
        return path.equals("/api/auth/request-code") ||
               path.equals("/api/auth/verify-code") ||
               path.equals("/api/auth/resend-code") ||
               path.equals("/api/auth/admin/request-code") ||
               path.equals("/api/auth/admin/verify-code") ||
               path.equals("/api/auth/admin/resend-code");
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}

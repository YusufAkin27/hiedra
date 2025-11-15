package eticaret.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Security headers ekleyen filter
 * XSS, clickjacking ve diğer güvenlik açıklarını önler
 */
@Component
@Order(1)
@Slf4j
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        
        // XSS Protection
        response.setHeader("X-XSS-Protection", "1; mode=block");
        
        // Clickjacking Protection
        response.setHeader("X-Frame-Options", "DENY");
        
        // Content Type Options (MIME type sniffing önleme)
        response.setHeader("X-Content-Type-Options", "nosniff");
        
        // Referrer Policy
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        
        // Permissions Policy (eski Feature-Policy)
        response.setHeader("Permissions-Policy", 
            "geolocation=(), microphone=(), camera=()");
        
        // Strict Transport Security (HTTPS için)
        // Sadece HTTPS isteklerinde gönderilmeli
        if (request.isSecure()) {
            response.setHeader("Strict-Transport-Security", 
                "max-age=31536000; includeSubDomains");
        }
        
        // Content Security Policy (CSP) - güvenli politika
        // Frontend'in çalışması için gerekli kaynaklara izin ver
        response.setHeader("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data: https: http:; " +
            "connect-src 'self' https://api.iyzipay.com https://sandbox-api.iyzipay.com https://accounts.google.com; " +
            "frame-src 'self' https://accounts.google.com; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "frame-ancestors 'none';");
        
        // X-Permitted-Cross-Domain-Policies
        response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        
        // Cross-Origin-Embedder-Policy
        response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        
        // Cross-Origin-Opener-Policy
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        
        // Cross-Origin-Resource-Policy
        response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        
        filterChain.doFilter(request, response);
    }
}


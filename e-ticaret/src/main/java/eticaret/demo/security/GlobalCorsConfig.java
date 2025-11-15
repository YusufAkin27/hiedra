package eticaret.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.util.List;

@Configuration
public class GlobalCorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // Tüm localhost portlarına izin ver (pattern kullanarak)
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "https://localhost:*",
            "http://127.0.0.1:*",
            "https://127.0.0.1:*",
            "https://yusufakin.online",
            "https://*.yusufakin.online"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        config.setExposedHeaders(List.of("Authorization", "Content-Type", "Location"));
        config.setAllowPrivateNetwork(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        
        // Genel CORS ayarları
        source.registerCorsConfiguration("/**", config);
        
        // 3D Secure callback için özel CORS ayarları (null origin'e izin ver)
        CorsConfiguration callbackConfig = new CorsConfiguration();
        callbackConfig.addAllowedOriginPattern("*"); // Tüm origin'lere izin ver (null dahil)
        callbackConfig.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        callbackConfig.setAllowedHeaders(List.of("*"));
        callbackConfig.setAllowCredentials(false); // Null origin ile credentials çalışmaz
        callbackConfig.setMaxAge(3600L);
        source.registerCorsConfiguration("/api/payment/3d-callback", callbackConfig);
        
        return new CorsFilter(source);
    }
    
    /**
     * 3D Secure callback için özel CORS filter - null origin'e izin verir
     * Bu filter Spring Security'den önce çalışır
     */
    @Component
    @Order(0) // En önce çalışsın
    public static class PaymentCallbackCorsFilter extends OncePerRequestFilter {
        
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            
            String path = request.getRequestURI();
            
            // 3D Secure callback endpoint'i için özel işlem
            if (path != null && path.contains("/api/payment/3d-callback")) {
                String origin = request.getHeader("Origin");
                
                // Null origin veya herhangi bir origin'e izin ver
                // 3D Secure callback'leri genellikle null origin ile gelir
                response.setHeader("Access-Control-Allow-Origin", origin != null && !origin.isEmpty() ? origin : "*");
                response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
                response.setHeader("Access-Control-Allow-Headers", "*");
                response.setHeader("Access-Control-Max-Age", "3600");
                response.setHeader("Access-Control-Allow-Credentials", "false");
                
                // OPTIONS preflight request için
                if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                    response.setStatus(HttpServletResponse.SC_OK);
                    return;
                }
            }
            
            filterChain.doFilter(request, response);
        }
    }
}

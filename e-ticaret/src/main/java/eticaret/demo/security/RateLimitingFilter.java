package eticaret.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate limiting filter - DEVRE DIŞI
 * Rate limiting kaldırıldı, tüm istekler geçiriliyor
 */
@Component
@Order(2)
public class RateLimitingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        
        // Rate limiting devre dışı bırakıldı - tüm istekler geçiriliyor
        filterChain.doFilter(request, response);
    }
}

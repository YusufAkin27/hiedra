package eticaret.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.security.JwtTokenBlacklist;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;
    private final JwtTokenBlacklist tokenBlacklist;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // Admin ve user endpoint'leri için detaylı log
        boolean isAdminEndpoint = request.getRequestURI().startsWith("/api/admin/");
        boolean isUserEndpoint = request.getRequestURI().startsWith("/api/user/");
        boolean shouldLog = isAdminEndpoint || isUserEndpoint;
        
        if (shouldLog) {
            log.info("Endpoint isteği: {} {}", request.getMethod(), request.getRequestURI());
                log.info("Authorization header: {}", authHeader != null ? (authHeader.length() > 20 ? authHeader.substring(0, 20) + "..." : authHeader) : "YOK");
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            if (shouldLog) {
                log.warn("Authorization header eksik veya geçersiz format: {}", authHeader);
            }
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            // Blacklist kontrolü
            if (tokenBlacklist.isBlacklisted(jwt)) {
                if (shouldLog) {
                    log.warn("JWT token blacklist'te - token geçersiz");
                }
                filterChain.doFilter(request, response);
                return;
            }
            
            username = jwtService.extractEmail(jwt);
            
            if (shouldLog) {
                log.info("JWT token'dan email çıkarıldı: {}", username);
            }

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                AppUser user = null;
                try {
                    user = appUserRepository.findByEmailIgnoreCase(username)
                            .filter(AppUser::isActive)
                            .orElse(null);
                } catch (Exception dbException) {
                    log.error("Veritabanı hatası - kullanıcı sorgulanamadı: {}", dbException.getMessage());
                    // Hata durumunda null döndür, authentication başarısız olur
                    filterChain.doFilter(request, response);
                    return;
                }

                if (user != null) {
                    if (shouldLog) {
                        log.info("Kullanıcı bulundu: email={}, role={}, active={}", user.getEmail(), user.getRole(), user.isActive());
                    }
                    
                    boolean isValid = jwtService.validateToken(jwt, user);
                    if (shouldLog) {
                        log.info("Token doğrulama sonucu: {}", isValid);
                    }
                    
                    if (isValid) {
                        List<SimpleGrantedAuthority> authorities = buildAuthorities(user.getRole());
                        if (shouldLog) {
                            log.info("Oluşturulan authorities: {}", authorities);
                        }
                        
                        
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                authorities
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        if (shouldLog) {
                            log.info("JWT authentication başarılı: user={}, role={}, authorities={}", username, user.getRole(), authorities);
                        }
                    } else {
                        if (shouldLog) {
                            log.warn("JWT token doğrulama başarısız: user={}, token geçersiz", username);
                        }
                    }
                } else {
                    if (shouldLog) {
                        log.warn("Kullanıcı bulunamadı veya aktif değil: email={}", username);
                    }
                }
            } else {
                if (shouldLog) {
                    log.warn("JWT token doğrulama başarısız: username={}, authentication zaten var={}", 
                            username, SecurityContextHolder.getContext().getAuthentication() != null);
                }
            }
        } catch (Exception e) {
            // Token geçersiz, devam et
            if (shouldLog) {
                log.error("JWT token doğrulama hatası: {}", e.getMessage(), e);
            }
        }

        filterChain.doFilter(request, response);
    }

    private List<SimpleGrantedAuthority> buildAuthorities(UserRole role) {
        if (role == null) {
            return Collections.emptyList();
        }
        if (role == UserRole.ADMIN) {
            return List.of(
                    new SimpleGrantedAuthority("ROLE_ADMIN"),
                    new SimpleGrantedAuthority("ROLE_USER")
            );
        }
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}


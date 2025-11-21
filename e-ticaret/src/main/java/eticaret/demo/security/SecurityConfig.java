package eticaret.demo.security;

import eticaret.demo.security.ip.IpAccessFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oauth2AuthenticationFailureHandler;
    private final IpAccessFilter ipAccessFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                // OAuth2 için session gerekli, diğer endpoint'ler için STATELESS (JWT kullanılıyor)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation().migrateSession())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/auth/oauth2/**").permitAll() // OAuth2 endpoint'leri
                        .requestMatchers("/api/products/**").permitAll() // Ürünler herkese açık
                        .requestMatchers("/api/categories/**").permitAll() // Kategoriler herkese açık
                        .requestMatchers("/api/payment/3d-callback").permitAll() // 3D Secure callback - CORS için özel
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/user/**").authenticated() // Kullanıcı endpoint'leri authentication gerektirir
                        .anyRequest().permitAll()
                )
                .oauth2Login(oauth2 -> oauth2
                        .authorizationEndpoint(authorization -> authorization
                                .baseUri("/api/auth/oauth2/authorization")
                                .authorizationRequestRepository(new org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository()))
                        .redirectionEndpoint(redirection -> redirection
                                .baseUri("/api/auth/oauth2/callback/*"))
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService))
                        .successHandler(oauth2AuthenticationSuccessHandler)
                        .failureHandler(oauth2AuthenticationFailureHandler)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(ipAccessFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
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
        config.setAllowCredentials(true); // cookie / token taşıyacaksa
        config.setMaxAge(3600L); // 1 saat cache
        config.setExposedHeaders(List.of("Authorization", "Content-Type", "Location"));
        // OAuth2 redirect'ler için önemli
        config.setAllowPrivateNetwork(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource() {
            @Override
            public CorsConfiguration getCorsConfiguration(jakarta.servlet.http.HttpServletRequest request) {
                String path = request.getRequestURI();
                // 3D Secure callback için özel CORS yapılandırması (null origin'e izin ver)
                if (path != null && path.contains("/api/payment/3d-callback")) {
                    CorsConfiguration callbackConfig = new CorsConfiguration();
                    callbackConfig.addAllowedOriginPattern("*"); // Tüm origin'lere izin ver (null dahil)
                    callbackConfig.setAllowedMethods(List.of("GET", "POST", "OPTIONS", "HEAD"));
                    callbackConfig.setAllowedHeaders(List.of("*"));
                    callbackConfig.setAllowCredentials(false); // Null origin ile credentials çalışmaz
                    callbackConfig.setMaxAge(3600L);
                    callbackConfig.setAllowPrivateNetwork(true);
                    return callbackConfig;
                }
                return super.getCorsConfiguration(request);
            }
        };
        
        // Genel CORS ayarları
        source.registerCorsConfiguration("/**", config);
        
        return source;
    }
}

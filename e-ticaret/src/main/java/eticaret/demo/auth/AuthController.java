package eticaret.demo.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;
import eticaret.demo.admin.AdminIpService;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final AdminIpService adminIpService;
    private final AuditLogService auditLogService;

    private Set<String> getAllowedAdminIps() {
        return adminIpService.getAllowedIps();
    }

    @PostMapping("/request-code")
    public ResponseEntity<ResponseMessage> requestLoginCode(@Valid @RequestBody LoginCodeRequest request,
                                                            HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        String userAgent = Optional.ofNullable(httpServletRequest.getHeader("User-Agent")).orElse("unknown");
        
        try {
            authService.requestLoginCode(request.getEmail(), clientIp, userAgent);

            auditLogService.logSuccess(
                    "REQUEST_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş doğrulama kodu istendi",
                    Map.of("email", request.getEmail(), "ip", clientIp),
                    Map.of("email", request.getEmail(), "status", "code_sent"),
                    httpServletRequest
            );

            return ResponseEntity.ok(ResponseMessage.builder()
                    .message("Doğrulama kodu e-posta adresinize gönderildi.")
                    .isSuccess(true)
                    .build());
        } catch (AuthException e) {
            log.warn("Giriş kodu istenirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "REQUEST_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş kodu istenirken hata",
                    e.getMessage(),
                    httpServletRequest
            );
            throw e;
        } catch (Exception e) {
            log.error("Giriş kodu istenirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "REQUEST_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş kodu istenirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            throw new AuthException("Doğrulama kodu gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
    }

    @PostMapping("/admin/check-email")
    public ResponseEntity<DataResponseMessage<Boolean>> checkAdminEmail(
            @Valid @RequestBody LoginCodeRequest request,
            HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        
        try {
            boolean isAdmin = authService.isAdminEmail(request.getEmail());
            
            if (!isAdmin) {
                auditLogService.logError(
                        "CHECK_ADMIN_EMAIL",
                        "Auth",
                        null,
                        "Admin e-posta kontrolü başarısız",
                        "Bu e-posta için yönetici yetkisi bulunmuyor: " + request.getEmail() + " (IP: " + clientIp + ")",
                        httpServletRequest
                );
                
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new DataResponseMessage<>(
                                "Bu e-posta için yönetici yetkisi bulunmuyor.",
                                false,
                                Boolean.FALSE
                        ));
            }

            auditLogService.logSuccess(
                    "CHECK_ADMIN_EMAIL",
                    "Auth",
                    null,
                    "Admin e-posta kontrolü başarılı",
                    Map.of("email", request.getEmail(), "ip", clientIp),
                    Map.of("isAdmin", true),
                    httpServletRequest
            );

            return ResponseEntity.ok(new DataResponseMessage<>(
                    "Yönetici e-postası doğrulandı.",
                    true,
                    Boolean.TRUE
            ));
        } catch (Exception e) {
            log.error("Admin e-posta kontrolü sırasında hata: ", e);
            auditLogService.logError(
                    "CHECK_ADMIN_EMAIL",
                    "Auth",
                    null,
                    "Admin e-posta kontrolü sırasında hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new DataResponseMessage<>(
                            "E-posta kontrolü sırasında bir hata oluştu.",
                            false,
                            Boolean.FALSE
                    ));
        }
    }

    @PostMapping("/admin/request-code")
    public ResponseEntity<ResponseMessage> requestAdminLoginCode(
            @Valid @RequestBody LoginCodeRequest request,
            HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        String userAgent = Optional.ofNullable(httpServletRequest.getHeader("User-Agent")).orElse("unknown");
        
        try {
            authService.requestAdminLoginCode(request.getEmail(), clientIp, userAgent);

            auditLogService.logSuccess(
                    "REQUEST_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş doğrulama kodu istendi",
                    Map.of("email", request.getEmail(), "ip", clientIp, "userAgent", userAgent),
                    Map.of("email", request.getEmail(), "status", "code_sent", "ip", clientIp),
                    httpServletRequest
            );

            return ResponseEntity.ok(ResponseMessage.builder()
                    .message("Doğrulama kodu e-posta adresinize gönderildi.")
                    .isSuccess(true)
                    .build());
        } catch (AuthException e) {
            log.warn("Admin giriş kodu istenirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "REQUEST_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş kodu istenirken hata",
                    e.getMessage() + " (IP: " + clientIp + ")",
                    httpServletRequest
            );
            throw e;
        } catch (Exception e) {
            log.error("Admin giriş kodu istenirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "REQUEST_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş kodu istenirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            throw new AuthException("Doğrulama kodu gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
    }

    @PostMapping("/admin/resend-code")
    public ResponseEntity<ResponseMessage> resendAdminLoginCode(
            @Valid @RequestBody LoginCodeRequest request,
            HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        String userAgent = Optional.ofNullable(httpServletRequest.getHeader("User-Agent")).orElse("unknown");
        
        try {
            authService.resendAdminLoginCode(request.getEmail(), clientIp, userAgent);

            auditLogService.logSuccess(
                    "RESEND_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş doğrulama kodu yeniden gönderildi",
                    Map.of("email", request.getEmail(), "ip", clientIp, "userAgent", userAgent),
                    Map.of("email", request.getEmail(), "status", "code_resent", "ip", clientIp),
                    httpServletRequest
            );

            return ResponseEntity.ok(ResponseMessage.builder()
                    .message("Yeni doğrulama kodu e-posta adresinize gönderildi.")
                    .isSuccess(true)
                    .build());
        } catch (AuthException e) {
            log.warn("Admin giriş kodu yeniden gönderilirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "RESEND_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş kodu yeniden gönderilirken hata",
                    e.getMessage() + " (IP: " + clientIp + ")",
                    httpServletRequest
            );
            throw e;
        } catch (Exception e) {
            log.error("Admin giriş kodu yeniden gönderilirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "RESEND_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş kodu yeniden gönderilirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            throw new AuthException("Doğrulama kodu gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
    }

    @PostMapping("/verify-code")
    public ResponseEntity<DataResponseMessage<AuthResponse>> verifyLoginCode(
            @Valid @RequestBody VerifyCodeRequest request,
            HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        String userAgent = Optional.ofNullable(httpServletRequest.getHeader("User-Agent")).orElse("unknown");
        
        try {
            AuthResponse response = authService.verifyLoginCode(
                    request.getEmail(),
                    request.getCode(),
                    clientIp,
                    userAgent,
                    httpServletRequest
            );

            Long userId = response.getUser() != null ? response.getUser().getId() : null;
            String userEmail = response.getUser() != null ? response.getUser().getEmail() : null;
            String userRole = response.getUser() != null ? response.getUser().getRole().name() : null;

            auditLogService.logSuccess(
                    "VERIFY_LOGIN_CODE",
                    "Auth",
                    userId,
                    "Giriş doğrulama kodu başarıyla doğrulandı",
                    Map.of("email", request.getEmail(), "ip", clientIp, "userAgent", userAgent),
                    Map.of(
                            "userId", userId != null ? userId : "N/A",
                            "email", userEmail != null ? userEmail : request.getEmail(),
                            "role", userRole != null ? userRole : "N/A",
                            "ip", clientIp
                    ),
                    httpServletRequest
            );

            return ResponseEntity.ok(DataResponseMessage.success("Giriş başarılı", response));
        } catch (AuthException e) {
            log.warn("Giriş doğrulama hatası: {}", e.getMessage());
            auditLogService.logError(
                    "VERIFY_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş doğrulama hatası",
                    e.getMessage() + " (Email: " + request.getEmail() + ", IP: " + clientIp + ")",
                    httpServletRequest
            );
            throw e;
        } catch (Exception e) {
            log.error("Giriş doğrulama sırasında beklenmeyen hata: ", e);
            auditLogService.logError(
                    "VERIFY_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş doğrulama sırasında beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            throw new AuthException("Giriş doğrulama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
    }

    @PostMapping("/admin/verify-code")
    public ResponseEntity<DataResponseMessage<AuthResponse>> verifyAdminLoginCode(
            @Valid @RequestBody VerifyCodeRequest request,
            HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        String userAgent = Optional.ofNullable(httpServletRequest.getHeader("User-Agent")).orElse("unknown");
        
        try {
            AuthResponse response = authService.verifyAdminLoginCode(
                    request.getEmail(),
                    request.getCode(),
                    clientIp,
                    userAgent,
                    httpServletRequest
            );

            Long userId = response.getUser() != null ? response.getUser().getId() : null;
            String userEmail = response.getUser() != null ? response.getUser().getEmail() : null;
            String userRole = response.getUser() != null ? response.getUser().getRole().name() : null;

            auditLogService.logSuccess(
                    "VERIFY_ADMIN_LOGIN_CODE",
                    "Auth",
                    userId,
                    "Admin giriş doğrulama kodu başarıyla doğrulandı",
                    Map.of("email", request.getEmail(), "ip", clientIp, "userAgent", userAgent),
                    Map.of(
                            "userId", userId != null ? userId : "N/A",
                            "email", userEmail != null ? userEmail : request.getEmail(),
                            "role", userRole != null ? userRole : "N/A",
                            "ip", clientIp
                    ),
                    httpServletRequest
            );

            return ResponseEntity.ok(DataResponseMessage.success("Yönetici girişi başarılı", response));
        } catch (AuthException e) {
            log.warn("Admin giriş doğrulama hatası: {}", e.getMessage());
            auditLogService.logError(
                    "VERIFY_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş doğrulama hatası",
                    e.getMessage() + " (Email: " + request.getEmail() + ", IP: " + clientIp + ")",
                    httpServletRequest
            );
            throw e;
        } catch (Exception e) {
            log.error("Admin giriş doğrulama sırasında beklenmeyen hata: ", e);
            auditLogService.logError(
                    "VERIFY_ADMIN_LOGIN_CODE",
                    "Auth",
                    null,
                    "Admin giriş doğrulama sırasında beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            throw new AuthException("Giriş doğrulama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
    }

    @GetMapping("/admin/allowed-ip")
    public ResponseEntity<DataResponseMessage<Boolean>> checkAdminIp(HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        
        log.info("IP kontrol endpoint'i çağrıldı. Gelen IP: {}, İzin verilen IP'ler: {}", clientIp, getAllowedAdminIps());
        
        if (!isAllowedAdminIp(clientIp)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new DataResponseMessage<>(
                            "Bu ağ adresinden yönetici paneline erişim yetkisi yok. Gelen IP: " + clientIp,
                            false,
                            Boolean.FALSE
                    ));
        }

        return ResponseEntity.ok(new DataResponseMessage<>(
                "IP adresi yönetici paneline erişim için yetkilendirildi.",
                true,
                Boolean.TRUE
        ));
    }

    @GetMapping("/client-ip")
    public ResponseEntity<DataResponseMessage<Map<String, String>>> getClientIpInfo(HttpServletRequest httpServletRequest) {
        Map<String, String> ipInfo = new HashMap<>();
        ipInfo.put("clientIp", getClientIp(httpServletRequest));
        ipInfo.put("remoteAddr", httpServletRequest.getRemoteAddr());
        ipInfo.put("xForwardedFor", Optional.ofNullable(httpServletRequest.getHeader("X-Forwarded-For")).orElse(""));
        ipInfo.put("xRealIp", Optional.ofNullable(httpServletRequest.getHeader("X-Real-IP")).orElse(""));
        ipInfo.put("xClientIp", Optional.ofNullable(httpServletRequest.getHeader("X-Client-IP")).orElse(""));
        
        return ResponseEntity.ok(new DataResponseMessage<>(
                "Client IP bilgisi",
                true,
                ipInfo
        ));
    }

    @PostMapping("/resend-code")
    public ResponseEntity<ResponseMessage> resendLoginCode(@Valid @RequestBody LoginCodeRequest request,
                                                           HttpServletRequest httpServletRequest) {
        String clientIp = getClientIp(httpServletRequest);
        String userAgent = Optional.ofNullable(httpServletRequest.getHeader("User-Agent")).orElse("unknown");
        
        try {
            authService.resendLoginCode(request.getEmail(), clientIp, userAgent);

            auditLogService.logSuccess(
                    "RESEND_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş doğrulama kodu yeniden gönderildi",
                    Map.of("email", request.getEmail(), "ip", clientIp, "userAgent", userAgent),
                    Map.of("email", request.getEmail(), "status", "code_resent"),
                    httpServletRequest
            );

            return ResponseEntity.ok(ResponseMessage.builder()
                    .message("Yeni doğrulama kodu gönderildi.")
                    .isSuccess(true)
                    .build());
        } catch (AuthException e) {
            log.warn("Giriş kodu yeniden gönderilirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "RESEND_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş kodu yeniden gönderilirken hata",
                    e.getMessage(),
                    httpServletRequest
            );
            throw e;
        } catch (Exception e) {
            log.error("Giriş kodu yeniden gönderilirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "RESEND_LOGIN_CODE",
                    "Auth",
                    null,
                    "Giriş kodu yeniden gönderilirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            throw new AuthException("Doğrulama kodu gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ResponseMessage> logout(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpServletRequest) {
        try {
            String clientIp = getClientIp(httpServletRequest);
            String userAgent = Optional.ofNullable(httpServletRequest.getHeader("User-Agent")).orElse("unknown");
            
            Long userId = currentUser != null ? currentUser.getId() : null;
            String userEmail = currentUser != null ? currentUser.getEmail() : null;

            auditLogService.logSuccess(
                    "LOGOUT",
                    "Auth",
                    userId,
                    "Kullanıcı çıkış yaptı",
                    Map.of(
                            "userId", userId != null ? userId : "N/A",
                            "email", userEmail != null ? userEmail : "N/A",
                            "ip", clientIp
                    ),
                    Map.of("status", "logged_out", "ip", clientIp),
                    httpServletRequest
            );
            
            return ResponseEntity.ok(ResponseMessage.builder()
                    .message("Çıkış işlemi tamamlandı. Tarayıcıda saklanan token'ı silmeyi unutmayın.")
                    .isSuccess(true)
                    .build());
        } catch (Exception e) {
            log.error("Çıkış işlemi sırasında hata: ", e);
            auditLogService.logError(
                    "LOGOUT",
                    "Auth",
                    currentUser != null ? currentUser.getId() : null,
                    "Çıkış işlemi sırasında hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            // Çıkış işleminde hata olsa bile başarılı dönelim
            return ResponseEntity.ok(ResponseMessage.builder()
                    .message("Çıkış işlemi tamamlandı.")
                    .isSuccess(true)
                    .build());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<DataResponseMessage<UserSummary>> me(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpServletRequest) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "GET_CURRENT_USER",
                        "Auth",
                        null,
                        "Kullanıcı bilgileri getirilirken oturum bulunamadı",
                        "Oturum bulunamadı",
                        httpServletRequest
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            UserSummary summary = UserSummary.builder()
                    .id(currentUser.getId())
                    .email(currentUser.getEmail())
                    .role(currentUser.getRole())
                    .emailVerified(currentUser.isEmailVerified())
                    .active(currentUser.isActive())
                    .lastLoginAt(currentUser.getLastLoginAt())
                    .build();

            auditLogService.logSuccess(
                    "GET_CURRENT_USER",
                    "Auth",
                    currentUser.getId(),
                    "Kullanıcı bilgileri getirildi",
                    Map.of("userId", currentUser.getId()),
                    summary,
                    httpServletRequest
            );

            return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı bilgileri", summary));
        } catch (Exception e) {
            log.error("Kullanıcı bilgileri getirilirken hata: ", e);
            auditLogService.logError(
                    "GET_CURRENT_USER",
                    "Auth",
                    currentUser != null ? currentUser.getId() : null,
                    "Kullanıcı bilgileri getirilirken hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    httpServletRequest
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Kullanıcı bilgileri getirilemedi"));
        }
    }

    /**
     * Google OAuth giriş endpoint'i
     * Spring Security OAuth2 Client otomatik olarak /api/auth/oauth2/authorization/google endpoint'ini oluşturur
     * Bu endpoint sadece redirect için kullanılır
     */
    @GetMapping("/google")
    public void googleLogin(HttpServletResponse response) throws IOException {
        // Spring Security OAuth2 Client otomatik olarak /api/auth/oauth2/authorization/google endpoint'ini oluşturur
        // Bu endpoint'e redirect yap
        response.sendRedirect("/api/auth/oauth2/authorization/google");
    }

    private String getClientIp(HttpServletRequest request) {
        // X-Client-IP header'ını kontrol et (frontend'den gönderilen)
        String clientIp = request.getHeader("X-Client-IP");
        if (clientIp != null && !clientIp.isBlank()) {
            log.debug("X-Client-IP header'dan IP alındı: {}", clientIp);
            return clientIp.trim();
        }

        // X-Real-IP header'ını kontrol et (nginx, reverse proxy)
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            log.debug("X-Real-IP header'dan IP alındı: {}", realIp);
            return realIp.trim();
        }

        // X-Forwarded-For header'ını kontrol et
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String firstIp = forwarded.split(",")[0].trim();
            log.debug("X-Forwarded-For header'dan IP alındı: {}", firstIp);
            return firstIp;
        }

        String remoteAddr = request.getRemoteAddr();
        log.debug("RemoteAddr'den IP alındı: {}", remoteAddr);
        return remoteAddr;
    }

    private boolean isAllowedAdminIp(String clientIp) {
        return adminIpService.isAllowed(clientIp);
    }

    @Data
    public static class LoginCodeRequest {
        @NotBlank(message = "Email zorunludur.")
        @Email(message = "Geçerli bir email adresi girin.")
        private String email;
    }

    @Data
    public static class VerifyCodeRequest extends LoginCodeRequest {
        @NotBlank(message = "Doğrulama kodu zorunludur.")
        private String code;
    }
}



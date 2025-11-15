package eticaret.demo.admin;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.AuthService;
import eticaret.demo.auth.UserRole;
import eticaret.demo.common.response.DataResponseMessage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/admins")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminManagementController {

    private final AppUserRepository userRepository;
    private final AuthService authService;

    /**
     * Tüm adminleri listele
     * GET /api/admin/admins
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<AdminSummary>>> getAllAdmins() {
        List<AppUser> admins = userRepository.findByRole(UserRole.ADMIN);
        List<AdminSummary> summaries = admins.stream()
                .map(admin -> AdminSummary.builder()
                        .id(admin.getId())
                        .email(admin.getEmail())
                        .fullName(admin.getFullName())
                        .phone(admin.getPhone())
                        .emailVerified(admin.isEmailVerified())
                        .active(admin.isActive())
                        .lastLoginAt(admin.getLastLoginAt())
                        .createdAt(admin.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(DataResponseMessage.success("Adminler başarıyla getirildi", summaries));
    }

    /**
     * Yeni admin ekle
     * POST /api/admin/admins
     */
    @PostMapping
    public ResponseEntity<DataResponseMessage<AdminSummary>> createAdmin(
            @RequestBody CreateAdminRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            // Email kontrolü
            String email = request.getEmail().trim().toLowerCase();
            if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
                return ResponseEntity.ok(DataResponseMessage.error("Bu email adresi zaten kullanılıyor."));
            }

            // Yeni admin oluştur - Direkt aktif ve doğrulanmış olarak
            AppUser newAdmin = AppUser.builder()
                    .email(email)
                    .fullName(request.getFullName() != null ? request.getFullName().trim() : null)
                    .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                    .role(UserRole.ADMIN)
                    .emailVerified(true) // Direkt doğrulanmış olarak oluştur
                    .active(true)
                    .build();

            AppUser savedAdmin = userRepository.save(newAdmin);
            log.info("Yeni admin oluşturuldu: {} (Email doğrulanmış, aktif)", savedAdmin.getEmail());

            AdminSummary summary = AdminSummary.builder()
                    .id(savedAdmin.getId())
                    .email(savedAdmin.getEmail())
                    .fullName(savedAdmin.getFullName())
                    .phone(savedAdmin.getPhone())
                    .emailVerified(savedAdmin.isEmailVerified())
                    .active(savedAdmin.isActive())
                    .lastLoginAt(savedAdmin.getLastLoginAt())
                    .createdAt(savedAdmin.getCreatedAt())
                    .build();

            return ResponseEntity.ok(DataResponseMessage.success(
                    "Admin başarıyla oluşturuldu.", 
                    summary
            ));

        } catch (Exception e) {
            log.error("Admin oluşturulurken hata: {}", e.getMessage(), e);
            return ResponseEntity.ok(DataResponseMessage.error("Admin oluşturulamadı: " + e.getMessage()));
        }
    }

    /**
     * Admin'e doğrulama kodu gönder
     * POST /api/admin/admins/{id}/send-code
     */
    @PostMapping("/{id}/send-code")
    public ResponseEntity<DataResponseMessage<String>> sendVerificationCode(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        
        try {
            AppUser admin = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Admin bulunamadı."));

            if (admin.getRole() != UserRole.ADMIN) {
                return ResponseEntity.ok(DataResponseMessage.error("Bu kullanıcı bir admin değil."));
            }

            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            authService.requestAdminLoginCode(admin.getEmail(), ipAddress, userAgent);

            log.info("Admin doğrulama kodu gönderildi: {}", admin.getEmail());
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Doğrulama kodu başarıyla gönderildi.", 
                    admin.getEmail()
            ));

        } catch (Exception e) {
            log.error("Doğrulama kodu gönderilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.ok(DataResponseMessage.error("Doğrulama kodu gönderilemedi: " + e.getMessage()));
        }
    }

    /**
     * Admin sil
     * DELETE /api/admin/admins/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<String>> deleteAdmin(@PathVariable Long id) {
        try {
            // Mevcut admin bilgisini al
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String currentAdminEmail = authentication.getName();
            
            AppUser currentAdmin = userRepository.findByEmailIgnoreCase(currentAdminEmail)
                    .orElseThrow(() -> new RuntimeException("Mevcut admin bulunamadı."));

            AppUser adminToDelete = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Silinecek admin bulunamadı."));

            if (adminToDelete.getRole() != UserRole.ADMIN) {
                return ResponseEntity.ok(DataResponseMessage.error("Bu kullanıcı bir admin değil."));
            }

            // Kendini silmeyi engelle
            if (adminToDelete.getId().equals(currentAdmin.getId())) {
                return ResponseEntity.ok(DataResponseMessage.error("Kendi hesabınızı silemezsiniz."));
            }

            // Son admin kontrolü - en az 1 admin kalmalı
            long adminCount = userRepository.countByRole(UserRole.ADMIN);
            if (adminCount <= 1) {
                return ResponseEntity.ok(DataResponseMessage.error("Sistemde en az bir admin bulunmalıdır."));
            }

            String deletedEmail = adminToDelete.getEmail();
            userRepository.delete(adminToDelete);
            log.info("Admin silindi: {} (Silen: {})", deletedEmail, currentAdminEmail);

            return ResponseEntity.ok(DataResponseMessage.success(
                    "Admin başarıyla silindi.", 
                    deletedEmail
            ));

        } catch (Exception e) {
            log.error("Admin silinirken hata: {}", e.getMessage(), e);
            return ResponseEntity.ok(DataResponseMessage.error("Admin silinemedi: " + e.getMessage()));
        }
    }

    /**
     * Admin durumunu güncelle (aktif/pasif)
     * PUT /api/admin/admins/{id}/status
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<DataResponseMessage<AdminSummary>> updateAdminStatus(
            @PathVariable Long id,
            @RequestBody UpdateAdminStatusRequest request) {
        
        try {
            AppUser admin = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Admin bulunamadı."));

            if (admin.getRole() != UserRole.ADMIN) {
                return ResponseEntity.ok(DataResponseMessage.error("Bu kullanıcı bir admin değil."));
            }

            // Son aktif admin kontrolü
            if (!request.isActive()) {
                long activeAdminCount = userRepository.findByRole(UserRole.ADMIN).stream()
                        .filter(AppUser::isActive)
                        .count();
                if (activeAdminCount <= 1 && admin.isActive()) {
                    return ResponseEntity.ok(DataResponseMessage.error("Sistemde en az bir aktif admin bulunmalıdır."));
                }
            }

            admin.setActive(request.isActive());
            AppUser updated = userRepository.save(admin);

            AdminSummary summary = AdminSummary.builder()
                    .id(updated.getId())
                    .email(updated.getEmail())
                    .fullName(updated.getFullName())
                    .phone(updated.getPhone())
                    .emailVerified(updated.isEmailVerified())
                    .active(updated.isActive())
                    .lastLoginAt(updated.getLastLoginAt())
                    .createdAt(updated.getCreatedAt())
                    .build();

            return ResponseEntity.ok(DataResponseMessage.success("Admin durumu güncellendi", summary));

        } catch (Exception e) {
            log.error("Admin durumu güncellenirken hata: {}", e.getMessage(), e);
            return ResponseEntity.ok(DataResponseMessage.error("Admin durumu güncellenemedi: " + e.getMessage()));
        }
    }

    /**
     * Client IP adresini al
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        String xClientIp = request.getHeader("X-Client-IP");
        if (xClientIp != null && !xClientIp.isEmpty()) {
            return xClientIp;
        }
        return request.getRemoteAddr();
    }

    @Data
    @lombok.Builder
    public static class AdminSummary {
        private Long id;
        private String email;
        private String fullName;
        private String phone;
        private boolean emailVerified;
        private boolean active;
        private LocalDateTime lastLoginAt;
        private LocalDateTime createdAt;
    }

    @Data
    public static class CreateAdminRequest {
        private String email;
        private String fullName;
        private String phone;
    }

    @Data
    public static class UpdateAdminStatusRequest {
        private boolean active;
    }
}


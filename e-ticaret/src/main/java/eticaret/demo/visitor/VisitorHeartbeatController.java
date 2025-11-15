package eticaret.demo.visitor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.response.DataResponseMessage;
import eticaret.demo.audit.AuditLogService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/visitors")
@RequiredArgsConstructor
@Validated
@Slf4j
public class VisitorHeartbeatController {

    private final VisitorTrackingService visitorTrackingService;
    private final AppUserRepository appUserRepository;
    private final ActiveVisitorRepository activeVisitorRepository;
    private final VisitorPageViewRepository pageViewRepository;
    private final AuditLogService auditLogService;

    /**
     * Ziyaretçi heartbeat - sayfa görüntüleme ve aktivite takibi
     * POST /api/visitors/heartbeat
     */
    @PostMapping("/heartbeat")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> heartbeat(
            @RequestBody(required = false) @Valid VisitorHeartbeatRequest body,
            HttpServletRequest request,
            Authentication authentication
    ) {
        try {
            VisitorHeartbeatRequest sanitized = sanitizeRequest(body);
            AppUser appUser = resolveAppUser(authentication);
            VisitorType visitorType = resolveVisitorType(appUser, sanitized != null ? sanitized.getVisitorType() : null);

            String sessionId = visitorTrackingService.trackVisitor(
                    request,
                    sanitized != null ? sanitized.getCurrentPage() : "/",
                    sanitized != null ? sanitized.getSessionId() : null,
                    visitorType,
                    appUser != null ? appUser.getId() : null,
                    appUser != null ? appUser.getEmail() : null
            );

            Map<String, Object> payload = new HashMap<>();
            payload.put("sessionId", sessionId);
            payload.put("visitorType", visitorType != null ? visitorType.name() : "MISAFIR");
            payload.put("serverTime", LocalDateTime.now());
            payload.put("isAuthenticated", appUser != null);
            
            // Aktif ziyaretçi sayısı (opsiyonel)
            try {
                long activeCount = visitorTrackingService.getActiveVisitorCount();
                payload.put("activeVisitors", activeCount);
            } catch (Exception e) {
                log.debug("Aktif ziyaretçi sayısı alınamadı: {}", e.getMessage());
            }

            return ResponseEntity.ok(DataResponseMessage.success("Ziyaretçi heartbeat kaydedildi", payload));
        } catch (Exception e) {
            log.error("Ziyaretçi heartbeat hatası: {}", e.getMessage(), e);
            // Hata durumunda bile sessionId döndür
            Map<String, Object> payload = new HashMap<>();
            payload.put("sessionId", body != null && body.getSessionId() != null ? body.getSessionId() : "");
            payload.put("visitorType", "MISAFIR");
            payload.put("serverTime", LocalDateTime.now());
            payload.put("isAuthenticated", false);
            return ResponseEntity.ok(DataResponseMessage.success("Ziyaretçi heartbeat işlendi", payload));
        }
    }
    
    /**
     * Aktif ziyaretçi sayısını getir (public)
     * GET /api/visitors/active-count
     */
    @GetMapping("/active-count")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getActiveVisitorCount() {
        try {
            long totalCount = visitorTrackingService.getActiveVisitorCount();
            long guestCount = visitorTrackingService.getActiveVisitorCountByType(VisitorType.MISAFIR);
            long userCount = visitorTrackingService.getActiveVisitorCountByType(VisitorType.KULLANICI);
            long adminCount = visitorTrackingService.getActiveVisitorCountByType(VisitorType.YONETICI);
            
            Map<String, Object> response = new HashMap<>();
            response.put("total", totalCount);
            response.put("guests", guestCount);
            response.put("users", userCount);
            response.put("admins", adminCount);
            response.put("timestamp", LocalDateTime.now());
            
            return ResponseEntity.ok(DataResponseMessage.success("Aktif ziyaretçi sayısı getirildi", response));
        } catch (Exception e) {
            log.error("Aktif ziyaretçi sayısı alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Aktif ziyaretçi sayısı alınamadı: " + e.getMessage()));
        }
    }
    
    /**
     * Kullanıcının sayfa görüntüleme geçmişini getir (authenticated)
     * GET /api/visitors/my-page-views
     */
    @GetMapping("/my-page-views")
    public ResponseEntity<DataResponseMessage<List<VisitorPageView>>> getMyPageViews(
            Authentication authentication,
            HttpServletRequest request) {
        try {
            AppUser appUser = resolveAppUser(authentication);
            if (appUser == null) {
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Giriş yapmanız gerekmektedir"));
            }
            
            List<VisitorPageView> pageViews = pageViewRepository.findByUserIdOrderByCreatedAtDesc(appUser.getId())
                    .stream()
                    .limit(50) // Son 50 görüntüleme
                    .toList();
            
            auditLogService.logSuccess(
                    "GET_MY_PAGE_VIEWS",
                    "Visitor",
                    appUser.getId(),
                    "Sayfa görüntüleme geçmişi getirildi",
                    Map.of("pageViewCount", pageViews.size()),
                    pageViews,
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Sayfa görüntüleme geçmişi getirildi", pageViews));
        } catch (Exception e) {
            log.error("Sayfa görüntüleme geçmişi alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Sayfa görüntüleme geçmişi alınamadı: " + e.getMessage()));
        }
    }

    private VisitorHeartbeatRequest sanitizeRequest(VisitorHeartbeatRequest request) {
        VisitorHeartbeatRequest sanitized = new VisitorHeartbeatRequest();
        sanitized.setSessionId(request != null ? request.getSessionId() : null);
        sanitized.setVisitorType(request != null ? request.getVisitorType() : null);

        String currentPage = request != null ? request.getCurrentPage() : null;
        if (currentPage == null || currentPage.isBlank()) {
            currentPage = "/";
        } else if (currentPage.length() > 500) {
            currentPage = currentPage.substring(0, 500);
        }
        sanitized.setCurrentPage(currentPage);
        return sanitized;
    }

    private AppUser resolveAppUser(Authentication authentication) {
        Authentication auth = Optional.ofNullable(authentication)
                .orElse(SecurityContextHolder.getContext().getAuthentication());

        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof AppUser appUser) {
            return appUser;
        }

        if (principal instanceof org.springframework.security.core.userdetails.UserDetails details) {
            return appUserRepository.findByEmailIgnoreCase(details.getUsername()).orElse(null);
        }

        if (principal instanceof String email) {
            return appUserRepository.findByEmailIgnoreCase(email).orElse(null);
        }

        return null;
    }

    private VisitorType resolveVisitorType(AppUser appUser, String requestedType) {
        if (appUser != null) {
            if (appUser.getRole() == UserRole.ADMIN) {
                return VisitorType.YONETICI;
            }
            return VisitorType.KULLANICI;
        }

        if (requestedType != null) {
            try {
                return VisitorType.valueOf(requestedType.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // bilinmeyen ziyaretçi tipi, guest olarak devam et
            }
        }

        return VisitorType.MISAFIR;
    }

    @Data
    public static class VisitorHeartbeatRequest {
        @Size(max = 255, message = "Session ID en fazla 255 karakter olabilir")
        private String sessionId;
        
        @Size(max = 500, message = "Sayfa yolu en fazla 500 karakter olabilir")
        private String currentPage;
        
        @Size(max = 20, message = "Ziyaretçi tipi en fazla 20 karakter olabilir")
        private String visitorType;
        
        private Integer durationSeconds; // Sayfada geçirilen süre (saniye)
        private String pageTitle; // Sayfa başlığı
        private String screenResolution; // Ekran çözünürlüğü
    }
}



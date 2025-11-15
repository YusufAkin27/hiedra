package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.cookie.CookiePreference;
import eticaret.demo.cookie.CookiePreferenceRepository;
import eticaret.demo.response.DataResponseMessage;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/cookies")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCookieController {

    private final CookiePreferenceRepository cookiePreferenceRepository;

    /**
     * Tüm çerez tercihlerini listele (sayfalama ile)
     * GET /api/admin/cookies?page=0&size=20&sort=updatedAt,desc
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getAllCookiePreferences(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean analytics,
            @RequestParam(required = false) Boolean marketing,
            @AuthenticationPrincipal AppUser currentUser) {
        
        try {
            Sort sort = sortDir.equalsIgnoreCase("ASC") 
                ? Sort.by(sortBy).ascending() 
                : Sort.by(sortBy).descending();
            
            Pageable pageable = PageRequest.of(page, size, sort);
            Page<CookiePreference> cookiePage = cookiePreferenceRepository.findAll(pageable);
            
            // Filtreleme
            List<CookiePreference> filtered = cookiePage.getContent();
            
            // Arama filtresi
            if (search != null && !search.isEmpty()) {
                filtered = filtered.stream()
                    .filter(cp -> {
                        if (cp.getIpAddress() != null && cp.getIpAddress().contains(search)) {
                            return true;
                        }
                        if (cp.getSessionId() != null && cp.getSessionId().contains(search)) {
                            return true;
                        }
                        if (cp.getUser() != null && cp.getUser().getEmail() != null && cp.getUser().getEmail().contains(search)) {
                            return true;
                        }
                        return false;
                    })
                    .collect(Collectors.toList());
            }
            
            // Analytics ve marketing filtreleri
            if (analytics != null) {
                filtered = filtered.stream()
                    .filter(cp -> cp.getAnalytics() != null && cp.getAnalytics() == analytics)
                    .collect(Collectors.toList());
            }
            if (marketing != null) {
                filtered = filtered.stream()
                    .filter(cp -> cp.getMarketing() != null && cp.getMarketing() == marketing)
                    .collect(Collectors.toList());
            }
            
            // Response DTO'ları oluştur
            List<Map<String, Object>> cookieData = filtered.stream().map(cp -> {
                Map<String, Object> data = new HashMap<>();
                data.put("id", cp.getId());
                data.put("userId", cp.getUser() != null ? cp.getUser().getId() : null);
                data.put("userEmail", cp.getUser() != null ? cp.getUser().getEmail() : null);
                data.put("sessionId", cp.getSessionId());
                data.put("ipAddress", cp.getIpAddress());
                data.put("necessary", cp.getNecessary());
                data.put("analytics", cp.getAnalytics());
                data.put("marketing", cp.getMarketing());
                data.put("consentGiven", cp.getConsentGiven());
                data.put("consentDate", cp.getConsentDate());
                data.put("updatedAt", cp.getUpdatedAt());
                data.put("userAgent", cp.getUserAgent());
                return data;
            }).collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("cookies", cookieData);
            response.put("totalElements", cookiePage.getTotalElements());
            response.put("totalPages", cookiePage.getTotalPages());
            response.put("currentPage", cookiePage.getNumber());
            response.put("size", cookiePage.getSize());
            
            return ResponseEntity.ok(DataResponseMessage.success("Çerez tercihleri başarıyla getirildi", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Çerez tercihleri getirilirken bir hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Çerez tercihi detayını getir
     * GET /api/admin/cookies/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getCookiePreference(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser) {
        
        try {
            CookiePreference cp = cookiePreferenceRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Çerez tercihi bulunamadı"));
            
            Map<String, Object> data = new HashMap<>();
            data.put("id", cp.getId());
            data.put("userId", cp.getUser() != null ? cp.getUser().getId() : null);
            data.put("userEmail", cp.getUser() != null ? cp.getUser().getEmail() : null);
            data.put("sessionId", cp.getSessionId());
            data.put("ipAddress", cp.getIpAddress());
            data.put("necessary", cp.getNecessary());
            data.put("analytics", cp.getAnalytics());
            data.put("marketing", cp.getMarketing());
            data.put("consentGiven", cp.getConsentGiven());
            data.put("consentDate", cp.getConsentDate());
            data.put("updatedAt", cp.getUpdatedAt());
            data.put("userAgent", cp.getUserAgent());
            
            return ResponseEntity.ok(DataResponseMessage.success("Çerez tercihi başarıyla getirildi", data));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Çerez tercihi getirilirken bir hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Çerez tercih istatistikleri
     * GET /api/admin/cookies/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getCookieStats(
            @AuthenticationPrincipal AppUser currentUser) {
        
        try {
            List<CookiePreference> allCookies = cookiePreferenceRepository.findAll();
            
            long total = allCookies.size();
            long withUser = allCookies.stream().filter(cp -> cp.getUser() != null).count();
            long withSession = allCookies.stream().filter(cp -> cp.getSessionId() != null && cp.getUser() == null).count();
            long withIpOnly = allCookies.stream().filter(cp -> cp.getSessionId() == null && cp.getUser() == null).count();
            
            long analyticsEnabled = allCookies.stream().filter(cp -> cp.getAnalytics() != null && cp.getAnalytics()).count();
            long marketingEnabled = allCookies.stream().filter(cp -> cp.getMarketing() != null && cp.getMarketing()).count();
            long consentGiven = allCookies.stream().filter(cp -> cp.getConsentGiven() != null && cp.getConsentGiven()).count();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", total);
            stats.put("withUser", withUser);
            stats.put("withSession", withSession);
            stats.put("withIpOnly", withIpOnly);
            stats.put("analyticsEnabled", analyticsEnabled);
            stats.put("marketingEnabled", marketingEnabled);
            stats.put("consentGiven", consentGiven);
            stats.put("analyticsPercentage", total > 0 ? (analyticsEnabled * 100.0 / total) : 0);
            stats.put("marketingPercentage", total > 0 ? (marketingEnabled * 100.0 / total) : 0);
            stats.put("consentPercentage", total > 0 ? (consentGiven * 100.0 / total) : 0);
            
            return ResponseEntity.ok(DataResponseMessage.success("İstatistikler başarıyla getirildi", stats));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("İstatistikler getirilirken bir hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Çerez tercihini sil
     * DELETE /api/admin/cookies/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteCookiePreference(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser) {
        
        try {
            if (!cookiePreferenceRepository.existsById(id)) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Çerez tercihi bulunamadı"));
            }
            
            cookiePreferenceRepository.deleteById(id);
            return ResponseEntity.ok(DataResponseMessage.success("Çerez tercihi başarıyla silindi", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Çerez tercihi silinirken bir hata oluştu: " + e.getMessage()));
        }
    }
}


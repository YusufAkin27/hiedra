package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.visitor.ActiveVisitor;
import eticaret.demo.visitor.ActiveVisitorRepository;
import eticaret.demo.visitor.VisitorAnalyticsService;
import eticaret.demo.visitor.VisitorPageView;
import eticaret.demo.visitor.VisitorPageViewRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin ziyaretçi takibi endpoint'leri
 * Tüm işlemler admin yetkisi gerektirir
 */
@RestController
@RequestMapping("/api/admin/visitors")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminVisitorController {

    private final ActiveVisitorRepository visitorRepository;
    private final VisitorPageViewRepository pageViewRepository;
    private final VisitorAnalyticsService analyticsService;

    /**
     * Aktif ziyaretçileri listele (son 5 dakika)
     * GET /api/admin/visitors/active
     */
    @GetMapping("/active")
    public ResponseEntity<DataResponseMessage<List<ActiveVisitor>>> getActiveVisitors() {
        LocalDateTime since = LocalDateTime.now().minusMinutes(5);
        List<ActiveVisitor> activeVisitors = visitorRepository.findActiveVisitors(since);
        return ResponseEntity.ok(DataResponseMessage.success("Aktif ziyaretçiler başarıyla getirildi", activeVisitors));
    }

    /**
     * Ziyaretçi istatistikleri (detaylı)
     * GET /api/admin/visitors/stats?since=60 (dakika)
     */
    @GetMapping("/stats")
    public ResponseEntity<DataResponseMessage<VisitorAnalyticsService.VisitorStatistics>> getVisitorStats(
            @RequestParam(value = "since", defaultValue = "60") int sinceMinutes) {
        try {
            LocalDateTime since = LocalDateTime.now().minusMinutes(sinceMinutes);
            VisitorAnalyticsService.VisitorStatistics stats = analyticsService.getVisitorStatistics(since);
            
            return ResponseEntity.ok(DataResponseMessage.success("İstatistikler başarıyla getirildi", stats));
        } catch (Exception e) {
            log.error("Ziyaretçi istatistikleri alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("İstatistikler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Ziyaretçi trend analizi
     * GET /api/admin/visitors/trend?days=7
     */
    @GetMapping("/trend")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getTrend(
            @RequestParam(value = "days", defaultValue = "7") int days) {
        try {
            Map<String, Object> trend = new HashMap<>();
            trend.put("visitorTrend", analyticsService.getDailyVisitorTrend(days));
            trend.put("pageViewTrend", analyticsService.getPageViewTrend(days));
            
            return ResponseEntity.ok(DataResponseMessage.success("Trend analizi getirildi", trend));
        } catch (Exception e) {
            log.error("Trend analizi alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Trend analizi getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * En çok görüntülenen sayfalar
     * GET /api/admin/visitors/top-pages?since=24 (saat)
     */
    @GetMapping("/top-pages")
    public ResponseEntity<DataResponseMessage<List<Object[]>>> getTopPages(
            @RequestParam(value = "since", defaultValue = "24") int sinceHours) {
        try {
            LocalDateTime since = LocalDateTime.now().minusHours(sinceHours);
            List<Object[]> topPages = pageViewRepository.findMostViewedPages(since);
            
            return ResponseEntity.ok(DataResponseMessage.success("En çok görüntülenen sayfalar getirildi", topPages));
        } catch (Exception e) {
            log.error("Top sayfalar alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Top sayfalar getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Cihaz istatistikleri
     * GET /api/admin/visitors/device-stats?since=24 (saat)
     */
    @GetMapping("/device-stats")
    public ResponseEntity<DataResponseMessage<Map<String, Long>>> getDeviceStats(
            @RequestParam(value = "since", defaultValue = "24") int sinceHours) {
        try {
            LocalDateTime since = LocalDateTime.now().minusHours(sinceHours);
            Map<String, Long> deviceStats = new HashMap<>();
            
            for (VisitorPageView.DeviceType deviceType : VisitorPageView.DeviceType.values()) {
                long count = pageViewRepository.countByDeviceTypeAndCreatedAtAfter(deviceType, since);
                deviceStats.put(deviceType.name(), count);
            }
            
            return ResponseEntity.ok(DataResponseMessage.success("Cihaz istatistikleri getirildi", deviceStats));
        } catch (Exception e) {
            log.error("Cihaz istatistikleri alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Cihaz istatistikleri getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Tarayıcı istatistikleri
     * GET /api/admin/visitors/browser-stats?since=24 (saat)
     */
    @GetMapping("/browser-stats")
    public ResponseEntity<DataResponseMessage<List<Object[]>>> getBrowserStats(
            @RequestParam(value = "since", defaultValue = "24") int sinceHours) {
        try {
            LocalDateTime since = LocalDateTime.now().minusHours(sinceHours);
            List<Object[]> browserStats = pageViewRepository.findBrowserStatistics(since);
            
            return ResponseEntity.ok(DataResponseMessage.success("Tarayıcı istatistikleri getirildi", browserStats));
        } catch (Exception e) {
            log.error("Tarayıcı istatistikleri alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Tarayıcı istatistikleri getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Tüm ziyaretçileri listele (son 1 saat)
     * GET /api/admin/visitors
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<ActiveVisitor>>> getAllVisitors() {
        LocalDateTime since = LocalDateTime.now().minusHours(1);
        List<ActiveVisitor> visitors = visitorRepository.findActiveVisitors(since);
        return ResponseEntity.ok(DataResponseMessage.success("Ziyaretçiler başarıyla getirildi", visitors));
    }
}


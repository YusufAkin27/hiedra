package eticaret.demo.admin.analytics;

import eticaret.demo.response.DataResponseMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin kullanıcı analitik controller
 * Kullanıcı davranışları ve istatistikleri için endpoint'ler
 */
@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {
    
    private final UserAnalyticsService analyticsService;
    private final UserBehaviorRepository behaviorRepository;
    
    /**
     * Kullanıcı istatistiklerini getir
     * GET /api/admin/analytics/users/{userId}/statistics
     */
    @GetMapping("/users/{userId}/statistics")
    public ResponseEntity<DataResponseMessage<UserAnalyticsService.UserStatistics>> getUserStatistics(
            @PathVariable Long userId) {
        try {
            UserAnalyticsService.UserStatistics stats = analyticsService.getUserStatistics(userId);
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Kullanıcı istatistikleri başarıyla getirildi", stats));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("İstatistikler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Kullanıcı davranışlarını getir
     * GET /api/admin/analytics/users/{userId}/behaviors
     */
    @GetMapping("/users/{userId}/behaviors")
    public ResponseEntity<DataResponseMessage<List<UserBehavior>>> getUserBehaviors(
            @PathVariable Long userId,
            @RequestParam(required = false) UserBehavior.BehaviorType behaviorType,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "50") int size) {
        try {
            List<UserBehavior> behaviors;
            if (behaviorType != null) {
                behaviors = behaviorRepository.findByUserIdAndBehaviorTypeOrderByCreatedAtDesc(userId, behaviorType);
            } else {
                behaviors = behaviorRepository.findByUserIdOrderByCreatedAtDesc(userId);
            }
            
            // Basit sayfalama
            int start = page * size;
            int end = Math.min(start + size, behaviors.size());
            List<UserBehavior> pagedBehaviors = behaviors.subList(
                    Math.min(start, behaviors.size()), 
                    end
            );
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Kullanıcı davranışları başarıyla getirildi", pagedBehaviors));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Davranışlar getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Analitik özeti getir
     * GET /api/admin/analytics/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<DataResponseMessage<UserAnalyticsService.UserAnalyticsSummary>> getAnalyticsSummary(
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        try {
            if (startDate == null) {
                startDate = LocalDateTime.now().minusDays(30);
            }
            if (endDate == null) {
                endDate = LocalDateTime.now();
            }
            
            UserAnalyticsService.UserAnalyticsSummary summary = 
                    analyticsService.getAnalyticsSummary(startDate, endDate);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Analitik özeti başarıyla getirildi", summary));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Analitik özeti getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * En sık yapılan davranışları getir
     * GET /api/admin/analytics/behaviors/most-common
     */
    @GetMapping("/behaviors/most-common")
    public ResponseEntity<DataResponseMessage<Map<String, Long>>> getMostCommonBehaviors() {
        try {
            List<Object[]> results = behaviorRepository.findMostCommonBehaviors();
            Map<String, Long> behaviorMap = new java.util.HashMap<>();
            
            for (Object[] result : results) {
                UserBehavior.BehaviorType type = (UserBehavior.BehaviorType) result[0];
                Long count = ((Number) result[1]).longValue();
                behaviorMap.put(type.name(), count);
            }
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "En sık yapılan davranışlar başarıyla getirildi", behaviorMap));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Davranışlar getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Tarih aralığına göre davranışları getir
     * GET /api/admin/analytics/behaviors
     */
    @GetMapping("/behaviors")
    public ResponseEntity<DataResponseMessage<List<UserBehavior>>> getBehaviorsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) UserBehavior.BehaviorType behaviorType) {
        try {
            List<UserBehavior> behaviors = behaviorRepository.findByCreatedAtBetween(startDate, endDate);
            
            if (behaviorType != null) {
                behaviors = behaviors.stream()
                        .filter(b -> b.getBehaviorType() == behaviorType)
                        .collect(java.util.stream.Collectors.toList());
            }
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Davranışlar başarıyla getirildi", behaviors));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Davranışlar getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Entity'ye göre davranışları getir
     * GET /api/admin/analytics/entities/{entityType}/{entityId}/behaviors
     */
    @GetMapping("/entities/{entityType}/{entityId}/behaviors")
    public ResponseEntity<DataResponseMessage<List<UserBehavior>>> getEntityBehaviors(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        try {
            List<UserBehavior> behaviors = behaviorRepository.findByEntityTypeAndEntityId(entityType, entityId);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Entity davranışları başarıyla getirildi", behaviors));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Davranışlar getirilemedi: " + e.getMessage()));
        }
    }
}


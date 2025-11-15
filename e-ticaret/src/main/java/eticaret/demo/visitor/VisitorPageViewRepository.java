package eticaret.demo.visitor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * VisitorPageView repository
 */
public interface VisitorPageViewRepository extends JpaRepository<VisitorPageView, Long> {
    
    /**
     * Session ID'ye göre sayfa görüntülemeleri
     */
    List<VisitorPageView> findBySessionIdOrderByCreatedAtDesc(String sessionId);
    
    /**
     * User ID'ye göre sayfa görüntülemeleri
     */
    List<VisitorPageView> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Belirli bir tarihten sonraki görüntülemeler
     */
    @Query("SELECT vpv FROM VisitorPageView vpv WHERE vpv.createdAt >= :since ORDER BY vpv.createdAt DESC")
    List<VisitorPageView> findByCreatedAtAfter(@Param("since") LocalDateTime since);
    
    /**
     * Belirli bir sayfa yoluna göre görüntülemeler
     */
    @Query("SELECT vpv FROM VisitorPageView vpv WHERE vpv.pagePath = :pagePath ORDER BY vpv.createdAt DESC")
    List<VisitorPageView> findByPagePath(@Param("pagePath") String pagePath);
    
    /**
     * En çok görüntülenen sayfalar
     */
    @Query("SELECT vpv.pagePath, COUNT(vpv) as count FROM VisitorPageView vpv " +
           "WHERE vpv.createdAt >= :since GROUP BY vpv.pagePath ORDER BY count DESC")
    List<Object[]> findMostViewedPages(@Param("since") LocalDateTime since);
    
    /**
     * Cihaz tipine göre sayı
     */
    @Query("SELECT COUNT(vpv) FROM VisitorPageView vpv WHERE vpv.deviceType = :deviceType AND vpv.createdAt >= :since")
    long countByDeviceTypeAndCreatedAtAfter(@Param("deviceType") VisitorPageView.DeviceType deviceType, 
                                            @Param("since") LocalDateTime since);
    
    /**
     * Tarayıcıya göre sayı
     */
    @Query("SELECT vpv.browser, COUNT(vpv) as count FROM VisitorPageView vpv " +
           "WHERE vpv.createdAt >= :since AND vpv.browser IS NOT NULL " +
           "GROUP BY vpv.browser ORDER BY count DESC")
    List<Object[]> findBrowserStatistics(@Param("since") LocalDateTime since);
    
    /**
     * Ortalama sayfa görüntüleme süresi
     */
    @Query("SELECT AVG(vpv.durationSeconds) FROM VisitorPageView vpv " +
           "WHERE vpv.durationSeconds IS NOT NULL AND vpv.createdAt >= :since")
    Double calculateAverageDuration(@Param("since") LocalDateTime since);
    
    /**
     * Toplam sayfa görüntüleme sayısı
     */
    @Query("SELECT COUNT(vpv) FROM VisitorPageView vpv WHERE vpv.createdAt >= :since")
    long countByCreatedAtAfter(@Param("since") LocalDateTime since);
    
    /**
     * Benzersiz ziyaretçi sayısı (session ID bazlı)
     */
    @Query("SELECT COUNT(DISTINCT vpv.sessionId) FROM VisitorPageView vpv WHERE vpv.createdAt >= :since")
    long countDistinctSessions(@Param("since") LocalDateTime since);
}


package eticaret.demo.visitor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ActiveVisitorRepository extends JpaRepository<ActiveVisitor, Long> {
    /**
     * IP adresi ve session ID ile aktif ziyaretçi bul
     */
    Optional<ActiveVisitor> findByIpAddressAndSessionId(String ipAddress, String sessionId);

    /**
     * Aktif ziyaretçileri getir (son 5 dakika içinde aktivite gösterenler)
     */
    @Query("SELECT v FROM ActiveVisitor v WHERE v.lastActivityAt >= :since ORDER BY v.lastActivityAt DESC")
    List<ActiveVisitor> findActiveVisitors(LocalDateTime since);

    /**
     * Aktif ziyaretçi sayısı (son 5 dakika)
     */
    @Query("SELECT COUNT(DISTINCT v.id) FROM ActiveVisitor v WHERE v.lastActivityAt >= :since")
    Long countActiveVisitors(LocalDateTime since);

    /**
     * Belirli ziyaretçi tipine göre aktif ziyaretçi sayısı
     */
    @Query("SELECT COUNT(DISTINCT v.id) FROM ActiveVisitor v WHERE v.lastActivityAt >= :since AND v.visitorType = :type")
    Long countActiveVisitorsByType(@Param("since") LocalDateTime since, @Param("type") VisitorType type);

    /**
     * Belirli ziyaretçi tipine göre aktif ziyaretçi listesi
     */
    @Query("SELECT v FROM ActiveVisitor v WHERE v.lastActivityAt >= :since AND v.visitorType = :type ORDER BY v.lastActivityAt DESC")
    List<ActiveVisitor> findActiveVisitorsByType(@Param("since") LocalDateTime since, @Param("type") VisitorType type);

    /**
     * Eski kayıtları temizle (30 dakikadan eski)
     */
    @Modifying
    @Query("DELETE FROM ActiveVisitor v WHERE v.lastActivityAt < :cutoff")
    int deleteOldVisitors(LocalDateTime cutoff);

    /**
     * IP adresi ile ziyaretçi bul
     */
    Optional<ActiveVisitor> findByIpAddress(String ipAddress);
    
    /**
     * Session ID ile ziyaretçi bul (en son aktif olan)
     */
    @Query("SELECT v FROM ActiveVisitor v WHERE v.sessionId = :sessionId ORDER BY v.lastActivityAt DESC")
    List<ActiveVisitor> findBySessionIdOrderByLastActivityDesc(@Param("sessionId") String sessionId);
    
    /**
     * Session ID ile tek ziyaretçi bul (en son aktif olan)
     */
    default Optional<ActiveVisitor> findBySessionId(String sessionId) {
        List<ActiveVisitor> visitors = findBySessionIdOrderByLastActivityDesc(sessionId);
        return visitors.isEmpty() ? Optional.empty() : Optional.of(visitors.get(0));
    }
    
    /**
     * User ID ile aktif ziyaretçileri bul
     */
    @Query("SELECT v FROM ActiveVisitor v WHERE v.userId = :userId AND v.lastActivityAt >= :since ORDER BY v.lastActivityAt DESC")
    List<ActiveVisitor> findByUserIdAndLastActivityAfter(@Param("userId") Long userId, 
                                                          @Param("since") LocalDateTime since);
    
    /**
     * Cihaz tipine göre aktif ziyaretçiler
     */
    @Query("SELECT v FROM ActiveVisitor v WHERE v.deviceType = :deviceType AND v.lastActivityAt >= :since ORDER BY v.lastActivityAt DESC")
    List<ActiveVisitor> findByDeviceTypeAndLastActivityAfter(@Param("deviceType") VisitorPageView.DeviceType deviceType,
                                                             @Param("since") LocalDateTime since);
    
    /**
     * En çok sayfa görüntüleyen ziyaretçiler
     */
    @Query("SELECT v FROM ActiveVisitor v WHERE v.lastActivityAt >= :since ORDER BY v.pageViews DESC")
    List<ActiveVisitor> findTopVisitorsByPageViews(@Param("since") LocalDateTime since);
}


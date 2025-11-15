package eticaret.demo.admin.analytics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UserBehavior repository
 */
public interface UserBehaviorRepository extends JpaRepository<UserBehavior, Long> {
    
    /**
     * Kullanıcıya göre davranışları getir
     */
    @Query("SELECT ub FROM UserBehavior ub WHERE ub.user.id = :userId ORDER BY ub.createdAt DESC")
    List<UserBehavior> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);
    
    /**
     * Guest kullanıcıya göre davranışları getir
     */
    List<UserBehavior> findByGuestUserIdOrderByCreatedAtDesc(String guestUserId);
    
    /**
     * Session ID'ye göre davranışları getir
     */
    List<UserBehavior> findBySessionIdOrderByCreatedAtDesc(String sessionId);
    
    /**
     * Davranış tipine göre getir
     */
    List<UserBehavior> findByBehaviorTypeOrderByCreatedAtDesc(UserBehavior.BehaviorType behaviorType);
    
    /**
     * Tarih aralığına göre getir
     */
    @Query("SELECT ub FROM UserBehavior ub WHERE ub.createdAt BETWEEN :startDate AND :endDate ORDER BY ub.createdAt DESC")
    List<UserBehavior> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, 
                                               @Param("endDate") LocalDateTime endDate);
    
    /**
     * Kullanıcı ve davranış tipine göre getir
     */
    @Query("SELECT ub FROM UserBehavior ub WHERE ub.user.id = :userId AND ub.behaviorType = :behaviorType ORDER BY ub.createdAt DESC")
    List<UserBehavior> findByUserIdAndBehaviorTypeOrderByCreatedAtDesc(@Param("userId") Long userId, 
                                                                        @Param("behaviorType") UserBehavior.BehaviorType behaviorType);
    
    /**
     * Entity tipi ve ID'ye göre getir
     */
    @Query("SELECT ub FROM UserBehavior ub WHERE ub.entityType = :entityType AND ub.entityId = :entityId ORDER BY ub.createdAt DESC")
    List<UserBehavior> findByEntityTypeAndEntityId(@Param("entityType") String entityType, 
                                                    @Param("entityId") Long entityId);
    
    /**
     * Belirli bir tarihten sonraki davranış sayısı
     */
    @Query("SELECT COUNT(ub) FROM UserBehavior ub WHERE ub.createdAt >= :since")
    long countByCreatedAtAfter(@Param("since") LocalDateTime since);
    
    /**
     * Kullanıcıya göre davranış sayısı
     */
    @Query("SELECT COUNT(ub) FROM UserBehavior ub WHERE ub.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);
    
    /**
     * Davranış tipine göre sayı
     */
    long countByBehaviorType(UserBehavior.BehaviorType behaviorType);
    
    /**
     * En sık yapılan davranışlar
     */
    @Query("SELECT ub.behaviorType, COUNT(ub) as count FROM UserBehavior ub GROUP BY ub.behaviorType ORDER BY COUNT(ub) DESC")
    List<Object[]> findMostCommonBehaviors();
    
    /**
     * Kullanıcının son N davranışını getir
     */
    @Query("SELECT ub FROM UserBehavior ub WHERE ub.user.id = :userId ORDER BY ub.createdAt DESC")
    List<UserBehavior> findRecentBehaviorsByUserId(@Param("userId") Long userId);
}


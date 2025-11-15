package eticaret.demo.audit;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    // Kullanıcıya göre loglar
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(String userId);
    
    // Email'e göre loglar
    List<AuditLog> findByUserEmailOrderByCreatedAtDesc(String userEmail);
    
    // Entity tipine göre loglar
    List<AuditLog> findByEntityTypeOrderByCreatedAtDesc(String entityType);
    
    // Action'a göre loglar
    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);
    
    // Tarih aralığına göre loglar
    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);
    
    // Tarihten önceki loglar
    List<AuditLog> findByCreatedAtBefore(LocalDateTime date);
    
    // IP adresine göre loglar
    List<AuditLog> findByIpAddressOrderByCreatedAtDesc(String ipAddress);
    
    // Status'e göre loglar
    List<AuditLog> findByStatusOrderByCreatedAtDesc(String status);
    
    // Kullanıcı ve entity tipine göre
    @Query("SELECT a FROM AuditLog a WHERE a.userId = :userId AND a.entityType = :entityType ORDER BY a.createdAt DESC")
    List<AuditLog> findByUserIdAndEntityType(@Param("userId") String userId, @Param("entityType") String entityType);
    
    // Sayfalama ile tüm loglar
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    // Son N kayıt
    @Query("SELECT a FROM AuditLog a ORDER BY a.createdAt DESC")
    List<AuditLog> findTopNByOrderByCreatedAtDesc(Pageable pageable);
    
    // Belirli entity, action ve entityId için kayıt var mı?
    boolean existsByEntityTypeAndEntityIdAndAction(String entityType, Long entityId, String action);
    
    // Kullanıcıya göre sayfalama ile loglar
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    
    // Email'e göre sayfalama ile loglar
    Page<AuditLog> findByUserEmailOrderByCreatedAtDesc(String userEmail, Pageable pageable);
    
    // Entity tipine göre sayfalama ile loglar
    Page<AuditLog> findByEntityTypeOrderByCreatedAtDesc(String entityType, Pageable pageable);
    
    // Action'a göre sayfalama ile loglar
    Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
    
    // Tarih aralığına göre sayfalama ile loglar
    Page<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    // IP adresine göre sayfalama ile loglar
    Page<AuditLog> findByIpAddressOrderByCreatedAtDesc(String ipAddress, Pageable pageable);
    
    // Status'e göre sayfalama ile loglar
    Page<AuditLog> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    
    // Tarihten önceki logları sil
    @Modifying
    @Transactional
    @Query("DELETE FROM AuditLog a WHERE a.createdAt < :date")
    void deleteByCreatedAtBefore(@Param("date") LocalDateTime date);
    
    // Kullanıcıya göre logları sil
    @Modifying
    @Transactional
    @Query("DELETE FROM AuditLog a WHERE a.userId = :userId")
    void deleteByUserId(@Param("userId") String userId);
    
    // Email'e göre logları sil
    @Modifying
    @Transactional
    @Query("DELETE FROM AuditLog a WHERE a.userEmail = :userEmail")
    void deleteByUserEmail(@Param("userEmail") String userEmail);
    
    // Tarih aralığına göre logları sil
    @Modifying
    @Transactional
    @Query("DELETE FROM AuditLog a WHERE a.createdAt BETWEEN :start AND :end")
    void deleteByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}


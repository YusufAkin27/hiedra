package eticaret.demo.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AuthVerificationCodeRepository extends JpaRepository<AuthVerificationCode, Long> {

    Optional<AuthVerificationCode> findTopByUserAndCodeAndUsedFalseOrderByCreatedAtDesc(AppUser user, String code);

    Optional<AuthVerificationCode> findTopByUserOrderByCreatedAtDesc(AppUser user);

    long countByUserAndUsedFalseAndExpiresAtAfter(AppUser user, LocalDateTime referenceTime);

    List<AuthVerificationCode> findByUserAndUsedFalse(AppUser user);
    
    List<AuthVerificationCode> findByUserAndCreatedAtAfter(AppUser user, LocalDateTime createdAt);

    /**
     * Belirli bir tarihten önce oluşturulmuş doğrulama kodlarını siler
     * Kullanılmış veya süresi dolmuş kodları temizlemek için kullanılır
     */
    @Modifying
    @Query("DELETE FROM AuthVerificationCode v WHERE v.createdAt < :cutoffDate")
    void deleteByCreatedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Belirli bir tarihten önce oluşturulmuş kodların sayısını döndürür
     */
    @Query("SELECT COUNT(v) FROM AuthVerificationCode v WHERE v.createdAt < :cutoffDate")
    long countByCreatedAtBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
}



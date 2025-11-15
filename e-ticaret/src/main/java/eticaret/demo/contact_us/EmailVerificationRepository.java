package eticaret.demo.contact_us;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerificationCode, Long> {

    /**
     * Kullanılmamış ve en son oluşturulan doğrulama kodunu getir
     */
    Optional<EmailVerificationCode> findTopByCodeAndUsedFalseOrderByCreatedAtDesc(String code);
    
    /**
     * Email'e göre kullanılmamış kodları getir
     */
    List<EmailVerificationCode> findByEmailIgnoreCaseAndUsedFalse(String email);
    
    /**
     * Süresi dolmuş kodları temizle (batch işlem)
     */
    @Modifying
    @Query("UPDATE EmailVerificationCode e SET e.used = true WHERE e.expiresAt < :now AND e.used = false")
    int invalidateExpiredCodes(@Param("now") LocalDateTime now);
    
    /**
     * Email'e göre aktif (kullanılmamış ve süresi dolmamış) kod sayısı
     */
    @Query("SELECT COUNT(e) FROM EmailVerificationCode e WHERE LOWER(e.email) = LOWER(:email) AND e.used = false AND e.expiresAt > :now")
    long countActiveCodesByEmail(@Param("email") String email, @Param("now") LocalDateTime now);
}
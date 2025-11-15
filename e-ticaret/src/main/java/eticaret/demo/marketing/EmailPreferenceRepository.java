package eticaret.demo.marketing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Email tercihleri repository
 * Optimize edilmiş sorgular ile
 */
public interface EmailPreferenceRepository extends JpaRepository<EmailPreference, Long> {
    
    /**
     * Kullanıcı ID ile email tercihini bul
     */
    @Query("SELECT ep FROM EmailPreference ep WHERE ep.user.id = :userId")
    Optional<EmailPreference> findByUserId(@Param("userId") Long userId);
    
    /**
     * Marketing email almak isteyen ve belirli bir süredir email almayan kullanıcıları getir
     * Unsubscribe edilmemiş, bounce sayısı düşük, aktif ve doğrulanmış kullanıcılar
     */
    @Query("SELECT ep FROM EmailPreference ep " +
           "WHERE ep.marketingEmailsEnabled = true " +
           "AND ep.unsubscribed = false " +
           "AND ep.bounceCount < 3 " +
           "AND ep.user.active = true " +
           "AND ep.user.emailVerified = true " +
           "AND (ep.lastMarketingEmailSentAt IS NULL OR ep.lastMarketingEmailSentAt < :since)")
    List<EmailPreference> findUsersEligibleForMarketingEmail(
            @Param("since") LocalDateTime since);
    
    /**
     * Marketing email almak isteyen tüm aktif kullanıcıları getir
     */
    @Query("SELECT ep FROM EmailPreference ep " +
           "WHERE ep.marketingEmailsEnabled = true " +
           "AND ep.unsubscribed = false " +
           "AND ep.bounceCount < 3 " +
           "AND ep.user.active = true " +
           "AND ep.user.emailVerified = true")
    List<EmailPreference> findAllActiveMarketingUsers();
    
    /**
     * Unsubscribe edilmiş kullanıcıları getir
     */
    @Query("SELECT ep FROM EmailPreference ep WHERE ep.unsubscribed = true")
    List<EmailPreference> findAllUnsubscribedUsers();
    
    /**
     * Yüksek bounce sayısına sahip kullanıcıları getir
     */
    @Query("SELECT ep FROM EmailPreference ep WHERE ep.bounceCount >= 3")
    List<EmailPreference> findUsersWithHighBounceCount();
    
    /**
     * Belirli bir tarihten sonra email açılmamış kullanıcıları getir
     */
    @Query("SELECT ep FROM EmailPreference ep " +
           "WHERE ep.marketingEmailsEnabled = true " +
           "AND ep.unsubscribed = false " +
           "AND (ep.lastEmailOpenedAt IS NULL OR ep.lastEmailOpenedAt < :since)")
    List<EmailPreference> findUsersWithNoEmailOpensSince(@Param("since") LocalDateTime since);
    
    /**
     * Email tercihlerini toplu güncelle (unsubscribe)
     */
    @Modifying
    @Query("UPDATE EmailPreference ep SET ep.unsubscribed = true, ep.unsubscribedAt = :now, ep.marketingEmailsEnabled = false " +
           "WHERE ep.user.id = :userId")
    int unsubscribeUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);
    
    /**
     * Bounce sayısını artır
     */
    @Modifying
    @Query("UPDATE EmailPreference ep SET ep.bounceCount = ep.bounceCount + 1, ep.lastBounceAt = :now " +
           "WHERE ep.id = :id")
    int incrementBounceCount(@Param("id") Long id, @Param("now") LocalDateTime now);
    
    /**
     * Email açılma sayısını artır
     */
    @Modifying
    @Query("UPDATE EmailPreference ep SET ep.emailOpenCount = ep.emailOpenCount + 1, ep.lastEmailOpenedAt = :now " +
           "WHERE ep.id = :id")
    int incrementEmailOpenCount(@Param("id") Long id, @Param("now") LocalDateTime now);
    
    /**
     * Email tıklama sayısını artır
     */
    @Modifying
    @Query("UPDATE EmailPreference ep SET ep.emailClickCount = ep.emailClickCount + 1, ep.lastEmailClickedAt = :now " +
           "WHERE ep.id = :id")
    int incrementEmailClickCount(@Param("id") Long id, @Param("now") LocalDateTime now);
    
    /**
     * Aktif marketing email kullanıcı sayısı
     */
    @Query("SELECT COUNT(ep) FROM EmailPreference ep " +
           "WHERE ep.marketingEmailsEnabled = true " +
           "AND ep.unsubscribed = false " +
           "AND ep.bounceCount < 3 " +
           "AND ep.user.active = true " +
           "AND ep.user.emailVerified = true")
    long countActiveMarketingUsers();
}


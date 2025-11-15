package eticaret.demo.cookie;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Cookie tercihleri repository
 * Optimize edilmiş sorgular ile
 */
public interface CookiePreferenceRepository extends JpaRepository<CookiePreference, Long> {
    
    /**
     * Kullanıcı ID ile çerez tercihlerini bul
     * En güncel olanı getirir
     */
    @Query("SELECT cp FROM CookiePreference cp WHERE cp.user.id = :userId ORDER BY cp.updatedAt DESC")
    Optional<CookiePreference> findByUserId(@Param("userId") Long userId);
    
    /**
     * Session ID ile çerez tercihlerini bul
     */
    Optional<CookiePreference> findBySessionId(String sessionId);
    
    /**
     * IP adresi ile çerez tercihlerini bul (en son olanı)
     * Sadece user ve sessionId null olanları getirir (anonim kullanıcılar)
     */
    @Query("SELECT cp FROM CookiePreference cp WHERE cp.ipAddress = :ipAddress AND cp.user IS NULL AND cp.sessionId IS NULL ORDER BY cp.updatedAt DESC")
    Optional<CookiePreference> findLatestByIpAddress(@Param("ipAddress") String ipAddress);
    
    /**
     * Kullanıcı veya session ID ile çerez tercihlerini bul
     */
    @Query("SELECT cp FROM CookiePreference cp WHERE (cp.user.id = :userId OR cp.sessionId = :sessionId) ORDER BY cp.updatedAt DESC")
    Optional<CookiePreference> findByUserIdOrSessionId(@Param("userId") Long userId, @Param("sessionId") String sessionId);
    
    /**
     * Belirli bir kullanıcının tüm tercihlerini getir (geçmiş için)
     */
    @Query("SELECT cp FROM CookiePreference cp WHERE cp.user.id = :userId ORDER BY cp.updatedAt DESC")
    List<CookiePreference> findAllByUserId(@Param("userId") Long userId);
    
    /**
     * İptal edilmiş consent'leri temizle (eski kayıtlar için)
     * Belirli bir tarihten önce iptal edilmiş consent'leri sil
     */
    @Modifying
    @Query("DELETE FROM CookiePreference cp WHERE cp.revokedAt IS NOT NULL AND cp.revokedAt < :beforeDate")
    int deleteOldRevokedConsents(@Param("beforeDate") LocalDateTime beforeDate);
    
    /**
     * Consent versiyonuna göre tercihleri say
     */
    @Query("SELECT COUNT(cp) FROM CookiePreference cp WHERE cp.consentVersion = :version")
    long countByConsentVersion(@Param("version") String version);
    
    /**
     * Aktif consent sayısı (iptal edilmemiş)
     */
    @Query("SELECT COUNT(cp) FROM CookiePreference cp WHERE cp.consentGiven = true AND cp.revokedAt IS NULL")
    long countActiveConsents();
}


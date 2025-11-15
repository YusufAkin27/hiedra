package eticaret.demo.cookie;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.auth.AppUser;

import java.time.LocalDateTime;

/**
 * Cookie tercihleri entity'si
 * GDPR uyumlu çerez yönetimi için
 * Kullanıcılar ve misafirler için ayrı ayrı yönetilir
 */
@Entity
@Table(name = "cookie_preferences", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_session_id", columnList = "session_id"),
    @Index(name = "idx_ip_address", columnList = "ip_address"),
    @Index(name = "idx_consent_date", columnList = "consent_date")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
public class CookiePreference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Kullanıcı (giriş yapmış kullanıcılar için)
     * Null ise misafir kullanıcıdır
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * Guest kullanıcılar için session ID veya unique identifier
     * Frontend'den gönderilen benzersiz session ID
     */
    @Column(name = "session_id", length = 255, unique = true)
    private String sessionId;

    /**
     * IP adresi (anonim kullanıcılar için)
     * IPv4 veya IPv6 formatında
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * Zorunlu çerezler (her zaman true, değiştirilemez)
     * Site işlevselliği için gerekli çerezler
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean necessary = true;

    /**
     * Analitik çerezler
     * Kullanıcı davranışlarını analiz etmek için
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean analytics = false;

    /**
     * Pazarlama çerezleri
     * Kişiselleştirilmiş reklamlar ve pazarlama için
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean marketing = false;

    /**
     * Kişiselleştirme çerezleri (yeni kategori)
     * Kullanıcı deneyimini kişiselleştirmek için
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean personalization = false;

    /**
     * Onay durumu
     * Kullanıcı çerez tercihlerini onayladı mı?
     */
    @Column(name = "consent_given", nullable = false)
    @Builder.Default
    private Boolean consentGiven = false;

    /**
     * Onay tarihi
     * İlk onay verildiği tarih
     */
    @Column(name = "consent_date", nullable = false)
    private LocalDateTime consentDate;

    /**
     * Son güncelleme tarihi
     * Tercihlerin son güncellendiği tarih
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * User Agent bilgisi
     * Tarayıcı ve cihaz bilgisi
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /**
     * Consent versiyonu
     * GDPR uyumluluğu için consent politikası versiyonu
     * Politika değiştiğinde yeni consent istenir
     */
    @Column(name = "consent_version", length = 50)
    @Builder.Default
    private String consentVersion = "1.0";

    /**
     * Consent geçmişi tutulması için
     * Önceki tercihlerin saklanması
     */
    @Column(name = "previous_preferences", columnDefinition = "TEXT")
    private String previousPreferences; // JSON formatında önceki tercihler

    /**
     * İptal tarihi
     * Kullanıcı consent'i iptal etti mi?
     */
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    /**
     * İptal nedeni (opsiyonel)
     */
    @Column(name = "revocation_reason", length = 500)
    private String revocationReason;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.consentDate == null) {
            this.consentDate = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.necessary == null) {
            this.necessary = true; // Zorunlu çerezler her zaman true
        }
        if (this.analytics == null) {
            this.analytics = false;
        }
        if (this.marketing == null) {
            this.marketing = false;
        }
        if (this.personalization == null) {
            this.personalization = false;
        }
        if (this.consentGiven == null) {
            this.consentGiven = false;
        }
        if (this.consentVersion == null) {
            this.consentVersion = "1.0";
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Consent'i iptal et
     */
    public void revokeConsent(String reason) {
        this.consentGiven = false;
        this.revokedAt = LocalDateTime.now();
        this.revocationReason = reason;
        // Tüm çerez tercihlerini false yap (necessary hariç)
        this.analytics = false;
        this.marketing = false;
        this.personalization = false;
    }
    
    /**
     * Consent geçerli mi kontrol et
     */
    public boolean isConsentValid() {
        return consentGiven != null && consentGiven && revokedAt == null;
    }
}


package eticaret.demo.marketing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import eticaret.demo.auth.AppUser;

import java.time.LocalDateTime;

/**
 * Kullanıcı email tercihleri ve marketing email gönderim takibi
 * GDPR uyumlu email yönetimi
 */
@Entity
@Table(name = "email_preferences", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_marketing_enabled", columnList = "marketing_emails_enabled"),
    @Index(name = "idx_last_sent", columnList = "last_marketing_email_sent_at"),
    @Index(name = "idx_unsubscribed", columnList = "unsubscribed_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
public class EmailPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Kullanıcı (OneToOne ilişki)
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * Marketing email'leri aktif mi?
     * Varsayılan olarak true (opt-in)
     */
    @Column(name = "marketing_emails_enabled", nullable = false)
    @Builder.Default
    private boolean marketingEmailsEnabled = true;

    /**
     * Son marketing email gönderim tarihi
     */
    @Column(name = "last_marketing_email_sent_at")
    private LocalDateTime lastMarketingEmailSentAt;

    /**
     * Toplam gönderilen marketing email sayısı
     */
    @Column(name = "total_marketing_emails_sent", nullable = false)
    @Builder.Default
    private int totalMarketingEmailsSent = 0;

    /**
     * Son gönderilen email şablon indeksi
     * Şablon rotasyonu için
     */
    @Column(name = "last_email_template_index", nullable = false)
    @Builder.Default
    private int lastEmailTemplateIndex = -1;

    /**
     * Email bounce sayısı
     * Geçersiz email adresleri için
     */
    @Column(name = "bounce_count", nullable = false)
    @Builder.Default
    private int bounceCount = 0;

    /**
     * Son bounce tarihi
     */
    @Column(name = "last_bounce_at")
    private LocalDateTime lastBounceAt;

    /**
     * Unsubscribe durumu
     * Kullanıcı email listesinden çıkmış mı?
     */
    @Column(name = "unsubscribed", nullable = false)
    @Builder.Default
    private boolean unsubscribed = false;

    /**
     * Unsubscribe tarihi
     */
    @Column(name = "unsubscribed_at")
    private LocalDateTime unsubscribedAt;

    /**
     * Unsubscribe nedeni (opsiyonel)
     */
    @Column(name = "unsubscribe_reason", length = 500)
    private String unsubscribeReason;

    /**
     * Email açılma sayısı (tracking için)
     */
    @Column(name = "email_open_count", nullable = false)
    @Builder.Default
    private int emailOpenCount = 0;

    /**
     * Son email açılma tarihi
     */
    @Column(name = "last_email_opened_at")
    private LocalDateTime lastEmailOpenedAt;

    /**
     * Email tıklama sayısı (link tracking için)
     */
    @Column(name = "email_click_count", nullable = false)
    @Builder.Default
    private int emailClickCount = 0;

    /**
     * Son email tıklama tarihi
     */
    @Column(name = "last_email_clicked_at")
    private LocalDateTime lastEmailClickedAt;

    /**
     * Minimum email gönderim aralığı (gün)
     * Rate limiting için
     */
    @Column(name = "min_email_interval_days", nullable = false)
    @Builder.Default
    private int minEmailIntervalDays = 7; // Minimum 7 gün arayla email gönder

    /**
     * Oluşturulma tarihi
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Son güncelleme tarihi
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.totalMarketingEmailsSent < 0) {
            this.totalMarketingEmailsSent = 0;
        }
        if (this.bounceCount < 0) {
            this.bounceCount = 0;
        }
        if (this.minEmailIntervalDays < 1) {
            this.minEmailIntervalDays = 7; // Minimum 1 gün
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Email gönderilebilir mi kontrol et
     */
    public boolean canSendEmail() {
        // Unsubscribe edilmişse gönderilemez
        if (unsubscribed) {
            return false;
        }
        
        // Marketing email'ler kapalıysa gönderilemez
        if (!marketingEmailsEnabled) {
            return false;
        }
        
        // Çok fazla bounce varsa gönderilemez (3'ten fazla)
        if (bounceCount >= 3) {
            return false;
        }
        
        // Minimum interval kontrolü
        if (lastMarketingEmailSentAt != null) {
            LocalDateTime nextAllowedDate = lastMarketingEmailSentAt.plusDays(minEmailIntervalDays);
            if (LocalDateTime.now().isBefore(nextAllowedDate)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Unsubscribe işlemi
     */
    public void unsubscribe(String reason) {
        this.unsubscribed = true;
        this.unsubscribedAt = LocalDateTime.now();
        this.unsubscribeReason = reason;
        this.marketingEmailsEnabled = false;
    }
    
    /**
     * Bounce kaydı
     */
    public void recordBounce() {
        this.bounceCount++;
        this.lastBounceAt = LocalDateTime.now();
        
        // 3'ten fazla bounce varsa otomatik unsubscribe
        if (this.bounceCount >= 3) {
            unsubscribe("Çok fazla email bounce (geçersiz email adresi)");
        }
    }
    
    /**
     * Email açılma kaydı
     */
    public void recordEmailOpen() {
        this.emailOpenCount++;
        this.lastEmailOpenedAt = LocalDateTime.now();
    }
    
    /**
     * Email tıklama kaydı
     */
    public void recordEmailClick() {
        this.emailClickCount++;
        this.lastEmailClickedAt = LocalDateTime.now();
    }
}


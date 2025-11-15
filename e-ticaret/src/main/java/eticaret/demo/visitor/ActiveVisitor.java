package eticaret.demo.visitor;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "active_visitors", indexes = {
    @Index(name = "idx_active_visitor_session_id", columnList = "session_id"),
    @Index(name = "idx_active_visitor_user_id", columnList = "user_id"),
    @Index(name = "idx_active_visitor_ip", columnList = "ip_address"),
    @Index(name = "idx_active_visitor_last_activity", columnList = "last_activity_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActiveVisitor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ip_address", length = 45, nullable = false)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "session_id", length = 255, nullable = false, unique = true)
    private String sessionId; // Tarayıcı session ID

    @Column(name = "first_seen_at", nullable = false)
    private LocalDateTime firstSeenAt;

    @Column(name = "last_activity_at", nullable = false)
    private LocalDateTime lastActivityAt;

    @Column(name = "page_views", nullable = false)
    @Builder.Default
    private Integer pageViews = 0; // Bu ziyaretçinin toplam sayfa görüntüleme sayısı

    @Column(name = "current_page", length = 500)
    private String currentPage; // Şu an hangi sayfada

    @Column(name = "previous_page", length = 500)
    private String previousPage; // Önceki sayfa

    @Enumerated(EnumType.STRING)
    @Column(name = "visitor_type", length = 20, nullable = false)
    @Builder.Default
    private VisitorType visitorType = VisitorType.MISAFIR;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_email", length = 255)
    private String userEmail;
    
    /**
     * Cihaz tipi (MOBILE, DESKTOP, TABLET)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", length = 20)
    private VisitorPageView.DeviceType deviceType;
    
    /**
     * Tarayıcı
     */
    @Column(name = "browser", length = 50)
    private String browser;
    
    /**
     * İşletim sistemi
     */
    @Column(name = "operating_system", length = 50)
    private String operatingSystem;
    
    /**
     * Toplam oturum süresi (saniye)
     */
    @Column(name = "total_session_duration")
    private Integer totalSessionDuration;
    
    /**
     * Referrer (nereden geldi)
     */
    @Column(name = "referrer", length = 1000)
    private String referrer;
    
    /**
     * Dil kodu
     */
    @Column(name = "language", length = 10)
    private String language;
    
    /**
     * Ekran çözünürlüğü
     */
    @Column(name = "screen_resolution", length = 20)
    private String screenResolution;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.firstSeenAt == null) {
            this.firstSeenAt = now;
        }
        if (this.lastActivityAt == null) {
            this.lastActivityAt = now;
        }
        if (this.pageViews == null) {
            this.pageViews = 0;
        }
        if (this.visitorType == null) {
            this.visitorType = VisitorType.MISAFIR;
        }
        if (this.totalSessionDuration == null) {
            this.totalSessionDuration = 0;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.lastActivityAt = LocalDateTime.now();
        
        // Oturum süresini güncelle
        if (this.firstSeenAt != null && this.lastActivityAt != null) {
            long durationSeconds = java.time.Duration.between(this.firstSeenAt, this.lastActivityAt).getSeconds();
            this.totalSessionDuration = (int) durationSeconds;
        }
    }
    
    /**
     * Helper metodlar
     */
    public boolean isActive() {
        if (this.lastActivityAt == null) {
            return false;
        }
        // Son 5 dakika içinde aktivite varsa aktif sayılır
        return this.lastActivityAt.isAfter(LocalDateTime.now().minusMinutes(5));
    }
    
    public long getSessionDurationSeconds() {
        if (this.firstSeenAt == null || this.lastActivityAt == null) {
            return 0;
        }
        return java.time.Duration.between(this.firstSeenAt, this.lastActivityAt).getSeconds();
    }
    
    public void incrementPageView() {
        this.pageViews = (this.pageViews == null ? 0 : this.pageViews) + 1;
    }
    
    public void updateCurrentPage(String newPage) {
        if (this.currentPage != null && !this.currentPage.equals(newPage)) {
            this.previousPage = this.currentPage;
        }
        this.currentPage = newPage;
    }
}


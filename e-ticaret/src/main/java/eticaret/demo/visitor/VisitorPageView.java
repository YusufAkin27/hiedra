package eticaret.demo.visitor;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Ziyaretçi sayfa görüntüleme kayıtları
 * Her sayfa görüntülemesi için ayrı kayıt tutar
 */
@Entity
@Table(name = "visitor_page_views", indexes = {
    @Index(name = "idx_page_view_session_id", columnList = "session_id"),
    @Index(name = "idx_page_view_user_id", columnList = "user_id"),
    @Index(name = "idx_page_view_created_at", columnList = "created_at"),
    @Index(name = "idx_page_view_page", columnList = "page_path")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitorPageView {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Session ID
     */
    @Column(name = "session_id", length = 255, nullable = false)
    private String sessionId;
    
    /**
     * Kullanıcı ID (giriş yapmış kullanıcılar için)
     */
    @Column(name = "user_id")
    private Long userId;
    
    /**
     * IP adresi
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    /**
     * Sayfa yolu
     */
    @Column(name = "page_path", length = 500, nullable = false)
    private String pagePath;
    
    /**
     * Sayfa başlığı
     */
    @Column(name = "page_title", length = 255)
    private String pageTitle;
    
    /**
     * Referrer (nereden geldi)
     */
    @Column(name = "referrer", length = 1000)
    private String referrer;
    
    /**
     * Sayfada geçirilen süre (saniye)
     */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;
    
    /**
     * User-Agent
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    /**
     * Cihaz tipi (MOBILE, DESKTOP, TABLET)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", length = 20)
    private DeviceType deviceType;
    
    /**
     * Tarayıcı (CHROME, FIREFOX, SAFARI, EDGE, vb.)
     */
    @Column(name = "browser", length = 50)
    private String browser;
    
    /**
     * İşletim sistemi (WINDOWS, MACOS, LINUX, ANDROID, IOS)
     */
    @Column(name = "operating_system", length = 50)
    private String operatingSystem;
    
    /**
     * Ekran çözünürlüğü (örn: "1920x1080")
     */
    @Column(name = "screen_resolution", length = 20)
    private String screenResolution;
    
    /**
     * Dil kodu (tr, en, vb.)
     */
    @Column(name = "language", length = 10)
    private String language;
    
    /**
     * Ziyaretçi tipi
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "visitor_type", length = 20)
    private VisitorType visitorType;
    
    /**
     * Oluşturulma tarihi
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.visitorType == null) {
            this.visitorType = VisitorType.MISAFIR;
        }
    }
    
    /**
     * Cihaz tipleri
     */
    public enum DeviceType {
        MOBILE,
        DESKTOP,
        TABLET,
        UNKNOWN
    }
}


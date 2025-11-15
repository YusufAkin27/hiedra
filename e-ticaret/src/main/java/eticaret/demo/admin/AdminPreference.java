package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    // Tema ayarları
    @Column(name = "theme", length = 20)
    @Builder.Default
    private String theme = "light"; // light, dark, auto

    // Bildirim ayarları
    @Column(name = "email_notifications", nullable = false)
    @Builder.Default
    private Boolean emailNotifications = true;

    @Column(name = "order_notifications", nullable = false)
    @Builder.Default
    private Boolean orderNotifications = true;

    @Column(name = "user_notifications", nullable = false)
    @Builder.Default
    private Boolean userNotifications = true;

    @Column(name = "system_notifications", nullable = false)
    @Builder.Default
    private Boolean systemNotifications = true;

    // Görünüm ayarları
    @Column(name = "items_per_page", nullable = false)
    @Builder.Default
    private Integer itemsPerPage = 20;

    @Column(name = "compact_mode", nullable = false)
    @Builder.Default
    private Boolean compactMode = false;

    @Column(name = "show_sidebar", nullable = false)
    @Builder.Default
    private Boolean showSidebar = true;

    // Dil ayarları
    @Column(name = "language", length = 10)
    @Builder.Default
    private String language = "tr"; // tr, en

    // Zaman dilimi
    @Column(name = "timezone", length = 50)
    @Builder.Default
    private String timezone = "Europe/Istanbul";

    // Tarih formatı
    @Column(name = "date_format", length = 20)
    @Builder.Default
    private String dateFormat = "dd/MM/yyyy";

    // Saat formatı
    @Column(name = "time_format", length = 10)
    @Builder.Default
    private String timeFormat = "24"; // 12, 24

    // Dashboard ayarları
    @Column(name = "dashboard_refresh_interval", nullable = false)
    @Builder.Default
    private Integer dashboardRefreshInterval = 30; // saniye

    @Column(name = "show_charts", nullable = false)
    @Builder.Default
    private Boolean showCharts = true;

    @Column(name = "show_statistics", nullable = false)
    @Builder.Default
    private Boolean showStatistics = true;

    // Rapor Ayarları
    @Column(name = "daily_report_enabled", nullable = false)
    @Builder.Default
    private Boolean dailyReportEnabled = false;

    @Column(name = "weekly_report_enabled", nullable = false)
    @Builder.Default
    private Boolean weeklyReportEnabled = false;

    @Column(name = "monthly_report_enabled", nullable = false)
    @Builder.Default
    private Boolean monthlyReportEnabled = false;

    @Column(name = "report_time", length = 5)
    @Builder.Default
    private String reportTime = "09:00"; // HH:mm formatında

    @Column(name = "report_email", length = 255)
    private String reportEmail; // Özel rapor e-posta adresi (opsiyonel)

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}


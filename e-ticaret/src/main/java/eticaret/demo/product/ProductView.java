package eticaret.demo.product;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.auth.AppUser;

import java.time.LocalDateTime;

@Entity
@Table(name = "product_views", indexes = {
    @Index(name = "idx_view_product_id", columnList = "product_id"),
    @Index(name = "idx_view_user_id", columnList = "user_id"),
    @Index(name = "idx_view_ip_address", columnList = "ip_address"),
    @Index(name = "idx_view_viewed_at", columnList = "viewed_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"reviews", "category", "views", "hibernateLazyInitializer", "handler"})
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * IP adresi
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * Tarayıcı bilgisi (User-Agent)
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /**
     * Referrer (nereden geldi)
     */
    @Column(name = "referrer", length = 1000)
    private String referrer;

    /**
     * Görüntüleme süresi (saniye cinsinden, eğer hesaplanabilirse)
     */
    @Column(name = "view_duration")
    private Integer viewDuration;

    /**
     * Görüntüleme tarihi
     */
    @Column(name = "viewed_at", nullable = false, updatable = false)
    private LocalDateTime viewedAt;

    @PrePersist
    public void onCreate() {
        if (this.viewedAt == null) {
            this.viewedAt = LocalDateTime.now();
        }
    }
}


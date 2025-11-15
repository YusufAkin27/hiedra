package eticaret.demo.admin.analytics;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import eticaret.demo.auth.AppUser;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Kullanıcı davranış analizi entity'si
 * Kullanıcı etkileşimlerini ve davranışlarını kaydeder
 */
@Entity
@Table(name = "user_behaviors", indexes = {
    @Index(name = "idx_behavior_user_id", columnList = "user_id"),
    @Index(name = "idx_behavior_guest_user_id", columnList = "guest_user_id"),
    @Index(name = "idx_behavior_behavior_type", columnList = "behavior_type"),
    @Index(name = "idx_behavior_created_at", columnList = "created_at"),
    @Index(name = "idx_behavior_session_id", columnList = "session_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserBehavior {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Kullanıcı (giriş yapmış kullanıcılar için)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;
    
    /**
     * Guest kullanıcı ID'si
     */
    @Column(name = "guest_user_id", length = 100)
    private String guestUserId;
    
    /**
     * Session ID
     */
    @Column(name = "session_id", length = 255)
    private String sessionId;
    
    /**
     * Davranış tipi
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "behavior_type", nullable = false, length = 50)
    private BehaviorType behaviorType;
    
    /**
     * Entity tipi (Product, Order, Cart, vb.)
     */
    @Column(name = "entity_type", length = 50)
    private String entityType;
    
    /**
     * Entity ID
     */
    @Column(name = "entity_id")
    private Long entityId;
    
    /**
     * Davranış detayları (JSON formatında)
     */
    @Column(name = "details", columnDefinition = "TEXT")
    private String details;
    
    /**
     * IP adresi
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    /**
     * User-Agent
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    /**
     * Referrer
     */
    @Column(name = "referrer", length = 1000)
    private String referrer;
    
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
    }
    
    /**
     * Davranış tipleri
     */
    public enum BehaviorType {
        PRODUCT_VIEW,           // Ürün görüntüleme
        PRODUCT_SEARCH,         // Ürün arama
        CART_ADD,              // Sepete ekleme
        CART_REMOVE,           // Sepetten çıkarma
        CART_UPDATE,           // Sepet güncelleme
        ORDER_CREATE,          // Sipariş oluşturma
        ORDER_CANCEL,          // Sipariş iptal
        REVIEW_CREATE,         // Yorum oluşturma
        REVIEW_UPDATE,         // Yorum güncelleme
        COUPON_APPLY,          // Kupon uygulama
        WISHLIST_ADD,          // İstek listesine ekleme
        WISHLIST_REMOVE,       // İstek listesinden çıkarma
        PAGE_VIEW,             // Sayfa görüntüleme
        LOGIN,                 // Giriş yapma
        LOGOUT,                // Çıkış yapma
        REGISTER,              // Kayıt olma
        EMAIL_VERIFY,          // Email doğrulama
        PASSWORD_RESET,        // Şifre sıfırlama
        PROFILE_UPDATE         // Profil güncelleme
    }
}


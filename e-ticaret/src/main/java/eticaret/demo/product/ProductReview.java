package eticaret.demo.product;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.auth.AppUser;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product_reviews", indexes = {
    @Index(name = "idx_review_product_id", columnList = "product_id"),
    @Index(name = "idx_review_user_id", columnList = "user_id"),
    @Index(name = "idx_review_active", columnList = "active"),
    @Index(name = "idx_review_rating", columnList = "rating"),
    @Index(name = "idx_review_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"reviews", "category", "views", "hibernateLazyInitializer", "handler"})
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * Yıldız puanı (1-5 arası)
     */
    @Column(nullable = false)
    @jakarta.validation.constraints.Min(value = 1, message = "Puan en az 1 olmalıdır")
    @jakarta.validation.constraints.Max(value = 5, message = "Puan en fazla 5 olabilir")
    private Integer rating;

    /**
     * Yorum metni
     */
    @Column(length = 2000)
    @jakarta.validation.constraints.Size(max = 2000, message = "Yorum en fazla 2000 karakter olabilir")
    private String comment;

    /**
     * Yorum fotoğrafları
     */
    @ElementCollection
    @CollectionTable(name = "review_images", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "image_url", length = 1000)
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    /**
     * Yorum aktif mi (silinmiş mi)
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Yorum onaylandı mı (admin onayı)
     */
    @Column(name = "approved", nullable = false)
    @Builder.Default
    private Boolean approved = true;

    /**
     * Yorum beğeni sayısı
     */
    @Column(name = "like_count", nullable = false)
    @Builder.Default
    private Integer likeCount = 0;

    /**
     * Yorum beğenmeme sayısı
     */
    @Column(name = "dislike_count", nullable = false)
    @Builder.Default
    private Integer dislikeCount = 0;

    /**
     * Yorum yararlı bulundu mu (helpful)
     */
    @Column(name = "helpful_count", nullable = false)
    @Builder.Default
    private Integer helpfulCount = 0;

    /**
     * Admin notu (gerekirse)
     */
    @Column(name = "admin_note", length = 500)
    private String adminNote;

    /**
     * Oluşturulma tarihi
     */
    @Column(name = "created_at", nullable = false, updatable = false)
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
        if (this.active == null) {
            this.active = true;
        }
        if (this.approved == null) {
            this.approved = true;
        }
        if (this.likeCount == null) {
            this.likeCount = 0;
        }
        if (this.dislikeCount == null) {
            this.dislikeCount = 0;
        }
        if (this.helpfulCount == null) {
            this.helpfulCount = 0;
        }
        if (this.imageUrls == null) {
            this.imageUrls = new ArrayList<>();
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Yorumu beğen
     */
    public void incrementLike() {
        this.likeCount = (this.likeCount != null ? this.likeCount : 0) + 1;
    }
    
    /**
     * Yorumu beğenme
     */
    public void incrementDislike() {
        this.dislikeCount = (this.dislikeCount != null ? this.dislikeCount : 0) + 1;
    }
    
    /**
     * Yararlı bulundu
     */
    public void incrementHelpful() {
        this.helpfulCount = (this.helpfulCount != null ? this.helpfulCount : 0) + 1;
    }
    
    /**
     * Yorumu onayla
     */
    public void approve() {
        this.approved = true;
    }
    
    /**
     * Yorumu reddet
     */
    public void reject() {
        this.approved = false;
    }
    
    /**
     * Yorumu sil (soft delete)
     */
    public void delete() {
        this.active = false;
    }
}


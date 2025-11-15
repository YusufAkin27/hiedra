package eticaret.demo.coupon;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code; // Kupon kodu (örn: WELCOME10)

    @Column(nullable = false, length = 200)
    private String name; // Kupon adı (örn: Hoş Geldin İndirimi)

    @Column(length = 1000)
    private String description; // Kupon açıklaması

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CouponType type; // PERCENTAGE (yüzde) veya FIXED_AMOUNT (sabit tutar)

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue; // İndirim değeri (yüzde veya tutar)

    @Column(nullable = false)
    private Integer maxUsageCount; // Maksimum kullanım sayısı

    @Column(nullable = false)
    @Builder.Default
    private Integer currentUsageCount = 0; // Mevcut kullanım sayısı

    @Column(nullable = false)
    private LocalDateTime validFrom; // Geçerlilik başlangıç tarihi

    @Column(nullable = false)
    private LocalDateTime validUntil; // Geçerlilik bitiş tarihi

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true; // Aktif mi?

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(precision = 10, scale = 2)
    private BigDecimal minimumPurchaseAmount; // Minimum alışveriş tutarı (opsiyonel)

    /**
     * Kupon geçerli mi?
     */
    public boolean isValid() {
        LocalDateTime now = LocalDateTime.now();
        return active && 
               now.isAfter(validFrom) && 
               now.isBefore(validUntil) && 
               currentUsageCount < maxUsageCount;
    }

    /**
     * Kupon kullanılabilir mi? (stok kontrolü)
     */
    public boolean canBeUsed() {
        return isValid() && currentUsageCount < maxUsageCount;
    }

    /**
     * İndirim tutarını hesapla
     * NOT: Bu metod sadece indirim tutarını hesaplar, koşul kontrolleri yapmaz
     * Koşul kontrolleri için validateCouponUsage kullanılmalıdır
     */
    public BigDecimal calculateDiscount(BigDecimal totalAmount) {
        // Minimum alışveriş tutarı kontrolü
        if (minimumPurchaseAmount != null && totalAmount.compareTo(minimumPurchaseAmount) < 0) {
            return BigDecimal.ZERO;
        }

        if (type == CouponType.YUZDE) {
            BigDecimal discount = totalAmount.multiply(discountValue).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            return discount;
        } else {
            // SABIT_TUTAR
            return discountValue.min(totalAmount); // Toplam tutardan fazla indirim yapma
        }
    }

    /**
     * Kupon kullanım sayısını artır
     */
    public void incrementUsage() {
        this.currentUsageCount++;
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.currentUsageCount == null) {
            this.currentUsageCount = 0;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}


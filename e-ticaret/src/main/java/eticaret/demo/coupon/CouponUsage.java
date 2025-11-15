package eticaret.demo.coupon;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.auth.AppUser;
import eticaret.demo.order.Order;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupon_usages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CouponUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coupon_id", nullable = false)
    private Coupon coupon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private AppUser user; // Giriş yapmış kullanıcı

    @Column(length = 100)
    private String guestUserId; // Giriş yapmamış kullanıcı için session ID

    @Column(length = 100)
    private String userEmail; // Kullanıcı email (guest için)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = true)
    private Order order; // Sipariş (ödeme tamamlandıktan sonra set edilir)

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount; // Uygulanan indirim tutarı

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal orderTotalBeforeDiscount; // İndirim öncesi toplam

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal orderTotalAfterDiscount; // İndirim sonrası toplam

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CouponUsageStatus status = CouponUsageStatus.BEKLEMEDE; // BEKLEMEDE, KULLANILDI, IPTAL_EDILDI

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime usedAt; // Ödeme tamamlandığında set edilir

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}


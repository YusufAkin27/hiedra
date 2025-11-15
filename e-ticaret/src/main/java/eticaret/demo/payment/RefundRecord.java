package eticaret.demo.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import eticaret.demo.auth.AppUser;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * İade kaydı entity'si
 * Tüm iade işlemlerini kaydetmek için
 * Güvenlik ve audit için kritik
 */
@Entity
@Table(name = "refund_records")
// Index'ler veritabanında zaten mevcut, Hibernate'in tekrar oluşturmasını önlemek için kaldırıldı
// idx_payment_id, idx_order_number, idx_transaction_id, idx_status, idx_created_at
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "paymentRecord", "user"})
public class RefundRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * İlgili ödeme kaydı
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_record_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PaymentRecord paymentRecord;

    /**
     * İyzico Refund Transaction ID
     */
    @Column(name = "refund_transaction_id", length = 100, unique = true)
    private String refundTransactionId;

    /**
     * İyzico Payment Transaction ID (iade için kullanılan)
     */
    @Column(name = "payment_transaction_id", nullable = false, length = 100)
    private String paymentTransactionId;

    /**
     * Sipariş numarası
     */
    @Column(name = "order_number", nullable = false, length = 20)
    private String orderNumber;

    /**
     * İade tutarı
     */
    @Column(name = "refund_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal refundAmount;

    /**
     * Orijinal ödeme tutarı
     */
    @Column(name = "original_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal originalAmount;

    /**
     * İade durumu
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING;

    /**
     * İade nedeni
     */
    @Column(name = "reason", length = 500)
    private String reason;

    /**
     * İyzico'dan gelen status
     */
    @Column(name = "iyzico_status", length = 50)
    private String iyzicoStatus;

    /**
     * İyzico'dan gelen error message (varsa)
     */
    @Column(name = "iyzico_error_message", length = 500)
    private String iyzicoErrorMessage;

    /**
     * İyzico'dan gelen error code (varsa)
     */
    @Column(name = "iyzico_error_code", length = 50)
    private String iyzicoErrorCode;

    /**
     * İyzico'dan gelen raw response (JSON)
     */
    @Column(name = "iyzico_raw_response", columnDefinition = "TEXT")
    private String iyzicoRawResponse;

    /**
     * İade eden (ADMIN veya CUSTOMER)
     */
    @Column(name = "refunded_by", length = 50)
    private String refundedBy;

    /**
     * Kullanıcı (giriş yapmış kullanıcılar için)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * IP adresi
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * User Agent
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;

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

    /**
     * İade tamamlanma tarihi
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.status == null) {
            this.status = RefundStatus.PENDING;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * İade başarılı mı?
     */
    public boolean isSuccessful() {
        return status == RefundStatus.SUCCESS;
    }

    /**
     * İade başarısız mı?
     */
    public boolean isFailed() {
        return status == RefundStatus.FAILED;
    }

    /**
     * İade bekliyor mu?
     */
    public boolean isPending() {
        return status == RefundStatus.PENDING;
    }

    /**
     * İade durumunu güncelle
     */
    public void updateStatus(RefundStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = LocalDateTime.now();
        
        if (newStatus == RefundStatus.SUCCESS && this.completedAt == null) {
            this.completedAt = LocalDateTime.now();
        }
    }
}


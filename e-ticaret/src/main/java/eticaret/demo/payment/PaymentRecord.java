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
 * Ödeme kaydı entity'si
 * Tüm ödeme işlemlerini kaydetmek için
 * Güvenlik ve audit için kritik
 */
@Entity
@Table(name = "payment_records", indexes = {
    @Index(name = "idx_payment_id", columnList = "iyzico_payment_id"),
    @Index(name = "idx_transaction_id", columnList = "payment_transaction_id"),
    @Index(name = "idx_order_number", columnList = "order_number"),
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_guest_user_id", columnList = "guest_user_id"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
public class PaymentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * İyzico Payment ID (iade için gerekli)
     */
    @Column(name = "iyzico_payment_id", length = 100, unique = true)
    private String iyzicoPaymentId;

    /**
     * İyzico Payment Transaction ID
     */
    @Column(name = "payment_transaction_id", length = 100)
    private String paymentTransactionId;

    /**
     * Conversation ID (İyzico)
     */
    @Column(name = "conversation_id", length = 100, unique = true)
    private String conversationId;

    /**
     * Sipariş numarası
     */
    @Column(name = "order_number", length = 20, unique = true)
    private String orderNumber;

    /**
     * Ödeme tutarı
     */
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    /**
     * Ödeme durumu
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    /**
     * Ödeme yöntemi
     */
    @Column(name = "payment_method", length = 50)
    @Builder.Default
    private String paymentMethod = "CREDIT_CARD";

    /**
     * 3D Secure kullanıldı mı?
     */
    @Column(name = "is_3d_secure", nullable = false)
    @Builder.Default
    private Boolean is3DSecure = false;

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
     * Kullanıcı (giriş yapmış kullanıcılar için)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * Guest kullanıcı ID'si
     */
    @Column(name = "guest_user_id", length = 100)
    private String guestUserId;

    /**
     * Müşteri email
     */
    @Column(name = "customer_email", nullable = false, length = 255)
    private String customerEmail;

    /**
     * Müşteri adı
     */
    @Column(name = "customer_name", length = 100)
    private String customerName;

    /**
     * Müşteri telefon
     */
    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

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
     * Kart son 4 hanesi (güvenlik için)
     */
    @Column(name = "card_last_four", length = 4)
    private String cardLastFour;

    /**
     * Kart markası (VISA, MASTERCARD, vb.)
     */
    @Column(name = "card_brand", length = 50)
    private String cardBrand;

    /**
     * İyzico'dan gelen raw response (JSON)
     */
    @Column(name = "iyzico_raw_response", columnDefinition = "TEXT")
    private String iyzicoRawResponse;

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
     * Ödeme tamamlanma tarihi
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
            this.status = PaymentStatus.PENDING;
        }
        if (this.is3DSecure == null) {
            this.is3DSecure = false;
        }
        if (this.paymentMethod == null) {
            this.paymentMethod = "CREDIT_CARD";
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Ödeme başarılı mı?
     */
    public boolean isSuccessful() {
        return status == PaymentStatus.SUCCESS;
    }

    /**
     * Ödeme başarısız mı?
     */
    public boolean isFailed() {
        return status == PaymentStatus.FAILED;
    }

    /**
     * Ödeme bekliyor mu?
     */
    public boolean isPending() {
        return status == PaymentStatus.PENDING;
    }

    /**
     * Ödeme durumunu güncelle
     */
    public void updateStatus(PaymentStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = LocalDateTime.now();
        
        if (newStatus == PaymentStatus.SUCCESS && this.completedAt == null) {
            this.completedAt = LocalDateTime.now();
        }
    }
}


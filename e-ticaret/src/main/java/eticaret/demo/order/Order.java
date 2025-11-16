package eticaret.demo.order;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.address.Address;
import eticaret.demo.auth.AppUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Sipariş entity'si
 * Detaylı sipariş yönetimi için
 */
@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_number", columnList = "order_number"),
    @Index(name = "idx_customer_email", columnList = "customer_email"),
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_guest_user_id", columnList = "guest_user_id"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_created_at", columnList = "created_at"),
    @Index(name = "idx_tracking_number", columnList = "tracking_number")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Sipariş numarası (benzersiz)
     * Format: ORD-YYYYMMDD-XXXXX
     */
    @Column(name = "order_number", unique = true, nullable = false, length = 20)
    private String orderNumber;

    /**
     * Toplam tutar
     */
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    /**
     * Alt toplam (ürün fiyatları toplamı)
     */
    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    /**
     * Kargo ücreti
     */
    @Column(name = "shipping_cost", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal shippingCost = BigDecimal.ZERO;

    /**
     * İndirim tutarı
     */
    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    /**
     * KDV tutarı
     */
    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

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
     * Sipariş durumu
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private OrderStatus status;

    /**
     * Müşteri adı
     */
    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    /**
     * Müşteri email
     */
    @Column(name = "customer_email", nullable = false, length = 255)
    private String customerEmail;

    /**
     * Müşteri telefon
     */
    @Column(name = "customer_phone", nullable = false, length = 20)
    private String customerPhone;

    /**
     * İptal nedeni
     */
    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    /**
     * İptal tarihi
     */
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    /**
     * İptal eden (ADMIN veya CUSTOMER)
     */
    @Column(name = "cancelled_by", length = 50)
    private String cancelledBy;

    /**
     * İade tarihi
     */
    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    /**
     * İade tutarı
     */
    @Column(name = "refund_amount", precision = 10, scale = 2)
    private BigDecimal refundAmount;

    /**
     * İade nedeni
     */
    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    /**
     * Admin notları
     */
    @Column(name = "admin_notes", length = 2000)
    private String adminNotes;

    /**
     * Sipariş adresleri
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Address> addresses;

    /**
     * Sipariş kalemleri
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<OrderItem> orderItems;

    /**
     * Ödeme transaction ID
     */
    @Column(name = "payment_transaction_id", length = 100)
    private String paymentTransactionId;

    /**
     * Ödeme ID (Iyzico payment ID - iade için gerekli)
     */
    @Column(name = "payment_id", length = 100)
    private String paymentId;

    /**
     * Ödeme yöntemi
     */
    @Column(name = "payment_method", length = 50)
    private String paymentMethod; // CREDIT_CARD, BANK_TRANSFER, etc.

    /**
     * Ödeme tarihi
     */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /**
     * Kullanıcı (giriş yapmış kullanıcılar için)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties({"password", "verificationCodes", "hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * Guest kullanıcı ID'si (misafir kullanıcılar için)
     */
    @Column(name = "guest_user_id", length = 100)
    private String guestUserId;

    /**
     * Kargo takip numarası
     */
    @Column(name = "tracking_number", length = 100)
    private String trackingNumber;

    /**
     * Kargo firması
     */
    @Column(name = "carrier", length = 50)
    private String carrier; // DHL, ARAS, MNG, YURTICI, etc.

    /**
     * Kargoya verilme tarihi
     */
    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    /**
     * Teslim tarihi
     */
    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    /**
     * Beklenen teslimat tarihi
     */
    @Column(name = "expected_delivery_date")
    private LocalDateTime expectedDeliveryDate;

    /**
     * Sipariş kaynağı
     */
    @Column(name = "order_source", length = 50)
    @Builder.Default
    private String orderSource = "WEB"; // WEB, MOBILE, API, etc.

    /**
     * IP adresi (sipariş veren)
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * User Agent
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.subtotal == null) {
            this.subtotal = BigDecimal.ZERO;
        }
        if (this.shippingCost == null) {
            this.shippingCost = BigDecimal.ZERO;
        }
        if (this.discountAmount == null) {
            this.discountAmount = BigDecimal.ZERO;
        }
        if (this.taxAmount == null) {
            this.taxAmount = BigDecimal.ZERO;
        }
        if (this.orderSource == null) {
            this.orderSource = "WEB";
        }
        // customerPhone null ise varsayılan değer ata
        if (this.customerPhone == null || this.customerPhone.isBlank()) {
            this.customerPhone = "Bilinmiyor";
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * İptal edilebilir mi?
     */
    public boolean canCancel() {
        return status == OrderStatus.ODEME_BEKLIYOR ||
               status == OrderStatus.ODENDI ||
               status == OrderStatus.ISLEME_ALINDI;
    }
    
    /**
     * İade talep edilebilir mi?
     */
    public boolean canRefund() {
        return status != OrderStatus.IADE_YAPILDI &&
               status != OrderStatus.IADE_TALEP_EDILDI &&
               status != OrderStatus.IPTAL_EDILDI;
    }
    
    /**
     * Sipariş tamamlanmış mı?
     */
    public boolean isCompleted() {
        return status == OrderStatus.TESLIM_EDILDI ||
               status == OrderStatus.TAMAMLANDI;
    }
    
    /**
     * Sipariş iptal edilmiş mi?
     */
    public boolean isCancelled() {
        return status == OrderStatus.IPTAL_EDILDI;
    }
    
    /**
     * Sipariş iade edilmiş mi?
     */
    public boolean isRefunded() {
        return status == OrderStatus.IADE_YAPILDI;
    }
    
    /**
     * Toplam tutarı hesapla (subtotal + shipping - discount + tax)
     */
    public BigDecimal calculateTotalAmount() {
        return subtotal
                .add(shippingCost)
                .subtract(discountAmount)
                .add(taxAmount);
    }
    
    /**
     * Sipariş durumu güncelle (otomatik tarih güncellemeleri ile)
     */
    public void updateStatus(OrderStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = LocalDateTime.now();
        
        // Duruma göre otomatik tarih güncellemeleri
        switch (newStatus) {
            case ODENDI:
                if (this.paidAt == null) {
                    this.paidAt = LocalDateTime.now();
                }
                break;
            case KARGOYA_VERILDI:
                if (this.shippedAt == null) {
                    this.shippedAt = LocalDateTime.now();
                }
                break;
            case TESLIM_EDILDI:
            case TAMAMLANDI:
                if (this.deliveredAt == null) {
                    this.deliveredAt = LocalDateTime.now();
                }
                break;
            case IPTAL_EDILDI:
                if (this.cancelledAt == null) {
                    this.cancelledAt = LocalDateTime.now();
                }
                break;
            case IADE_YAPILDI:
                if (this.refundedAt == null) {
                    this.refundedAt = LocalDateTime.now();
                }
                break;
            case ODEME_BEKLIYOR:
            case ISLEME_ALINDI:
            case IADE_TALEP_EDILDI:
                // Bu durumlar için özel tarih güncellemesi yok
                break;
        }
    }
}
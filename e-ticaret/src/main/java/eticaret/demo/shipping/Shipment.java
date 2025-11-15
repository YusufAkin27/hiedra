package eticaret.demo.shipping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import eticaret.demo.order.Order;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Kargo gönderisi entity'si
 * DHL ve diğer kargo firmaları için gönderi bilgilerini saklar
 */
@Entity
@Table(name = "shipments", indexes = {
    @Index(name = "idx_shipment_order_id", columnList = "order_id"),
    @Index(name = "idx_shipment_tracking_number", columnList = "tracking_number"),
    @Index(name = "idx_shipment_carrier", columnList = "carrier"),
    @Index(name = "idx_shipment_status", columnList = "status"),
    @Index(name = "idx_shipment_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Shipment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Sipariş
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties({"addresses", "orderItems", "hibernateLazyInitializer", "handler"})
    private Order order;
    
    /**
     * Kargo takip numarası
     */
    @Column(name = "tracking_number", nullable = false, length = 100, unique = true)
    private String trackingNumber;
    
    /**
     * Kargo firması
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "carrier", nullable = false, length = 50)
    private Carrier carrier;
    
    /**
     * Kargo durumu
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private ShipmentStatus status = ShipmentStatus.CREATED;
    
    /**
     * Kargo ağırlığı (kg)
     */
    @Column(name = "weight", precision = 10, scale = 2)
    private BigDecimal weight;
    
    /**
     * Paket boyutları (cm)
     */
    @Column(name = "length", precision = 10, scale = 2)
    private BigDecimal length;
    
    @Column(name = "width", precision = 10, scale = 2)
    private BigDecimal width;
    
    @Column(name = "height", precision = 10, scale = 2)
    private BigDecimal height;
    
    /**
     * Kargo ücreti
     */
    @Column(name = "shipping_cost", precision = 10, scale = 2)
    private BigDecimal shippingCost;
    
    /**
     * DHL shipment ID (DHL API'den dönen ID)
     */
    @Column(name = "dhl_shipment_id", length = 100)
    private String dhlShipmentId;
    
    /**
     * DHL label (PDF base64)
     */
    @Column(name = "label_base64", columnDefinition = "TEXT")
    private String labelBase64;
    
    /**
     * DHL label URL
     */
    @Column(name = "label_url", length = 500)
    private String labelUrl;
    
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
     * Son takip kontrolü
     */
    @Column(name = "last_tracking_check")
    private LocalDateTime lastTrackingCheck;
    
    /**
     * Son durum güncellemesi
     */
    @Column(name = "last_status_update")
    private LocalDateTime lastStatusUpdate;
    
    /**
     * Hata mesajı (varsa)
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    /**
     * Oluşturulma tarihi
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    /**
     * Güncellenme tarihi
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = ShipmentStatus.CREATED;
        }
    }
    
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Kargo firmaları
     */
    public enum Carrier {
        DHL,
        ARAS,
        MNG,
        YURTICI,
        PTT,
        OTHER
    }
    
    /**
     * Kargo durumları
     */
    public enum ShipmentStatus {
        CREATED,              // Oluşturuldu
        LABEL_CREATED,        // Etiket oluşturuldu
        PICKED_UP,           // Toplandı
        IN_TRANSIT,          // Yolda
        OUT_FOR_DELIVERY,    // Teslim için çıktı
        DELIVERED,           // Teslim edildi
        EXCEPTION,           // Sorun var
        RETURNED,            // İade edildi
        CANCELLED            // İptal edildi
    }
    
    /**
     * Helper metodlar
     */
    public boolean isDelivered() {
        return status == ShipmentStatus.DELIVERED;
    }
    
    public boolean isInTransit() {
        return status == ShipmentStatus.IN_TRANSIT || 
               status == ShipmentStatus.OUT_FOR_DELIVERY ||
               status == ShipmentStatus.PICKED_UP;
    }
    
    public boolean canCancel() {
        return status == ShipmentStatus.CREATED || 
               status == ShipmentStatus.LABEL_CREATED;
    }
    
    public void updateStatus(ShipmentStatus newStatus) {
        this.status = newStatus;
        this.lastStatusUpdate = LocalDateTime.now();
        
        if (newStatus == ShipmentStatus.DELIVERED && this.deliveredAt == null) {
            this.deliveredAt = LocalDateTime.now();
        }
    }
}


package eticaret.demo.order;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Sipariş kalemi entity'si
 * Her siparişteki ürün detaylarını tutar
 */
@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "order_items", indexes = {
    @Index(name = "idx_order_id", columnList = "order_id"),
    @Index(name = "idx_product_id", columnList = "product_id")
})
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Ürün adı (sipariş anındaki adı)
     */
    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    /**
     * Genişlik (metre)
     */
    @Column(nullable = false)
    private Double width;

    /**
     * Yükseklik (metre)
     */
    @Column(nullable = false)
    private Double height;

    /**
     * Pilaj tipi (1x2, 1x2.5, vb.)
     */
    @Column(name = "pleat_type", nullable = false, length = 20)
    private String pleatType;

    /**
     * Miktar
     */
    @Column(nullable = false)
    private Integer quantity;

    /**
     * Birim fiyat (sipariş anındaki fiyat)
     */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    /**
     * Toplam fiyat (unitPrice * quantity * width * height * pleat multiplier)
     */
    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    /**
     * Ürün ID'si (yorum kontrolü ve stok yönetimi için)
     */
    @Column(name = "product_id")
    private Long productId;

    /**
     * Ürün görsel URL'si (sipariş anındaki görsel)
     */
    @Column(name = "product_image_url", length = 500)
    private String productImageUrl;

    /**
     * Ürün SKU (varsa)
     */
    @Column(name = "product_sku", length = 100)
    private String productSku;

    /**
     * Sipariş (ManyToOne ilişki)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    private Order order;

    /**
     * Toplam fiyatı hesapla
     */
    public BigDecimal calculateTotalPrice() {
        if (unitPrice == null || width == null || height == null || quantity == null) {
            return BigDecimal.ZERO;
        }
        
        // Pilaj çarpanını hesapla
        double pleatMultiplier = getPleatMultiplier(pleatType);
        
        // Toplam metrekare
        double totalSquareMeters = width * height * quantity;
        
        // Toplam fiyat = birim fiyat * toplam metrekare * pilaj çarpanı
        return unitPrice
                .multiply(BigDecimal.valueOf(totalSquareMeters))
                .multiply(BigDecimal.valueOf(pleatMultiplier));
    }
    
    /**
     * Pilaj tipine göre çarpanı al
     */
    private double getPleatMultiplier(String pleatType) {
        if (pleatType == null) {
            return 1.0;
        }
        
        return switch (pleatType.toUpperCase()) {
            case "1X2" -> 2.0;
            case "1X2.5" -> 2.5;
            case "1X3" -> 3.0;
            default -> 1.0;
        };
    }
}

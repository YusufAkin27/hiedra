package eticaret.demo.cart;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.product.Product;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cart_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    @JsonIgnoreProperties({"items", "user"})
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"reviews", "views", "category", "hibernateLazyInitializer", "handler"})
    private Product product;

    @Column(nullable = false)
    private Integer quantity; // Adet

    @Column
    private Double width; // Genişlik (cm)

    @Column
    private Double height; // Yükseklik (cm)

    @Column(length = 50)
    private String pleatType; // Pile tipi (örn: 1x2, 1x3)

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal unitPrice = BigDecimal.ZERO; // Birim fiyat

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO; // Ara toplam

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    /**
     * Ara toplamı hesapla
     */
    public void calculateSubtotal() {
        if (product != null && product.getPrice() != null && quantity != null) {
            BigDecimal basePrice = product.getPrice();
            
            // Genişlik ve pile tipine göre fiyat hesapla
            if (width != null && pleatType != null) {
                try {
                    double metreCinsindenEn = width / 100.0;
                    double pileCarpani = 1.0;
                    
                    // Pile tipini parse et (örn: "1x2" -> 2.0)
                    String[] parts = pleatType.split("x");
                    if (parts.length == 2) {
                        pileCarpani = Double.parseDouble(parts[1]);
                    }
                    
                    // Toplam fiyat = metre * pile * 1m fiyatı * adet
                    double toplam = metreCinsindenEn * pileCarpani * basePrice.doubleValue() * quantity;
                    this.subtotal = BigDecimal.valueOf(toplam).setScale(2, java.math.RoundingMode.HALF_UP);
                    this.unitPrice = BigDecimal.valueOf(toplam / quantity).setScale(2, java.math.RoundingMode.HALF_UP);
                } catch (Exception e) {
                    // Hesaplama hatası durumunda basit fiyat kullan
                    this.subtotal = basePrice.multiply(BigDecimal.valueOf(quantity));
                    this.unitPrice = basePrice;
                }
            } else {
                // Genişlik veya pile tipi yoksa basit fiyat
                this.subtotal = basePrice.multiply(BigDecimal.valueOf(quantity));
                this.unitPrice = basePrice;
            }
        }
    }
}


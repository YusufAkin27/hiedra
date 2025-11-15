package eticaret.demo.product;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Ürün entity'si
 * Detaylı ürün yönetimi için
 */
@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "products", indexes = {
    @Index(name = "idx_product_name", columnList = "name"),
    @Index(name = "idx_product_active", columnList = "active"),
    @Index(name = "idx_product_category", columnList = "category_id"),
    @Index(name = "idx_product_price", columnList = "price"),
    @Index(name = "idx_product_quantity", columnList = "quantity"),
    @Index(name = "idx_product_created_at", columnList = "created_at"),
    @Index(name = "idx_product_sku", columnList = "sku")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Ürün adı
     */
    @Column(nullable = false, length = 255)
    @NotBlank(message = "Ürün adı boş olamaz")
    @Size(min = 3, max = 255, message = "Ürün adı 3-255 karakter arasında olmalıdır")
    private String name;
    
    /**
     * Ürün açıklaması
     */
    @Column(length = 5000)
    @Size(max = 5000, message = "Açıklama en fazla 5000 karakter olabilir")
    private String description;
    
    /**
     * Ürün kısa açıklaması (liste görünümleri için)
     */
    @Column(name = "short_description", length = 500)
    @Size(max = 500, message = "Kısa açıklama en fazla 500 karakter olabilir")
    private String shortDescription;
    
    /**
     * SKU (Stok Takip Numarası)
     */
    @Column(unique = true, length = 100)
    @Size(max = 100, message = "SKU en fazla 100 karakter olabilir")
    private String sku;
    
    /**
     * Genişlik (cm cinsinden)
     */
    @Column
    @DecimalMin(value = "0.1", message = "Genişlik 0.1'den büyük olmalıdır")
    @DecimalMax(value = "1000.0", message = "Genişlik 1000'den küçük olmalıdır")
    private Double width;
    
    /**
     * Yükseklik (cm cinsinden)
     */
    @Column
    @DecimalMin(value = "0.1", message = "Yükseklik 0.1'den büyük olmalıdır")
    @DecimalMax(value = "1000.0", message = "Yükseklik 1000'den küçük olmalıdır")
    private Double height;
    
    /**
     * Pilaj tipi (1x2, 1x2.5, 1x3, vb.)
     */
    @Column(name = "pleat_type", length = 20)
    @Size(max = 20, message = "Pilaj tipi en fazla 20 karakter olabilir")
    private String pleatType;
    
    /**
     * Stok miktarı (metre cinsinden)
     */
    @Column(nullable = false)
    @NotNull(message = "Stok miktarı boş olamaz")
    @Min(value = 0, message = "Stok miktarı 0'dan küçük olamaz")
    @Builder.Default
    private Integer quantity = 0;
    
    /**
     * Metre fiyatı
     */
    @Column(nullable = false, precision = 10, scale = 2)
    @NotNull(message = "Fiyat boş olamaz")
    @DecimalMin(value = "0.01", message = "Fiyat 0.01'den büyük olmalıdır")
    private BigDecimal price;
    
    /**
     * Eski fiyat (indirimli ürünler için)
     */
    @Column(name = "old_price", precision = 10, scale = 2)
    @DecimalMin(value = "0.01", message = "Eski fiyat 0.01'den büyük olmalıdır")
    private BigDecimal oldPrice;
    
    /**
     * İndirim yüzdesi (hesaplanan)
     */
    @Transient
    private Double discountPercentage;
    
    /**
     * Kapak görseli URL'i
     */
    @Column(name = "cover_image_url", length = 1000)
    @Size(max = 1000, message = "Kapak görsel URL'i en fazla 1000 karakter olabilir")
    private String coverImageUrl;
    
    /**
     * Detay görseli URL'i
     */
    @Column(name = "detail_image_url", length = 1000)
    @Size(max = 1000, message = "Detay görsel URL'i en fazla 1000 karakter olabilir")
    private String detailImageUrl;
    
    /**
     * Ek görseller (gallery)
     */
    @ElementCollection
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url", length = 1000)
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();
    
    /**
     * Takma şekli
     */
    @Column(name = "mounting_type", length = 100)
    @Size(max = 100, message = "Takma şekli en fazla 100 karakter olabilir")
    private String mountingType;
    
    /**
     * Materyal
     */
    @Column(length = 100)
    @Size(max = 100, message = "Materyal en fazla 100 karakter olabilir")
    private String material;
    
    /**
     * Işık geçirgenliği
     */
    @Column(name = "light_transmittance", length = 100)
    @Size(max = 100, message = "Işık geçirgenliği en fazla 100 karakter olabilir")
    private String lightTransmittance;
    
    /**
     * Parça sayısı
     */
    @Column(name = "piece_count")
    @Min(value = 1, message = "Parça sayısı en az 1 olmalıdır")
    private Integer pieceCount;
    
    /**
     * Renk
     */
    @Column(length = 100)
    @Size(max = 100, message = "Renk en fazla 100 karakter olabilir")
    private String color;
    

    /**
     * Kullanım alanı
     */
    @Column(name = "usage_area", length = 200)
    @Size(max = 200, message = "Kullanım alanı en fazla 200 karakter olabilir")
    private String usageArea;
    
    /**
     * Ürün aktif mi (satışta mı)
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
    
    /**
     * Öne çıkarılmış ürün mü
     */
    @Column(name = "featured", nullable = false)
    @Builder.Default
    private Boolean featured = false;
    
    /**
     * Yeni ürün mü
     */
    @Column(name = "is_new", nullable = false)
    @Builder.Default
    private Boolean isNew = false;
    
    /**
     * İndirimli ürün mü
     */
    @Column(name = "on_sale", nullable = false)
    @Builder.Default
    private Boolean onSale = false;
    
    /**
     * Sıralama (gösterim sırası)
     */
    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
    
    /**
     * SEO başlığı
     */
    @Column(name = "seo_title", length = 255)
    @Size(max = 255, message = "SEO başlığı en fazla 255 karakter olabilir")
    private String seoTitle;
    
    /**
     * SEO açıklaması
     */
    @Column(name = "seo_description", length = 500)
    @Size(max = 500, message = "SEO açıklaması en fazla 500 karakter olabilir")
    private String seoDescription;
    
    /**
     * SEO anahtar kelimeleri
     */
    @Column(name = "seo_keywords", length = 500)
    @Size(max = 500, message = "SEO anahtar kelimeleri en fazla 500 karakter olabilir")
    private String seoKeywords;
    
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
    
    /**
     * Kategori
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties(value = {"products", "createdAt", "updatedAt", "hibernateLazyInitializer", "handler"}, allowSetters = true)
    private Category category;

    /**
     * Ürün yorumları
     */
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<ProductReview> reviews = new ArrayList<>();

    /**
     * Ürün görüntülemeleri
     */
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<ProductView> views = new ArrayList<>();

    /**
     * Yorum istatistikleri (transient - veritabanına kaydedilmez)
     */
    @Transient
    private Long reviewCount;
    
    @Transient
    private Double averageRating;
    
    /**
     * Görüntüleme istatistikleri (transient - veritabanına kaydedilmez)
     */
    @Transient
    private Long viewCount;
    
    /**
     * Satış sayısı (transient - veritabanına kaydedilmez)
     */
    @Transient
    private Long salesCount;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.quantity == null) {
            this.quantity = 0;
        }
        if (this.active == null) {
            this.active = true;
        }
        if (this.featured == null) {
            this.featured = false;
        }
        if (this.isNew == null) {
            this.isNew = false;
        }
        if (this.onSale == null) {
            this.onSale = false;
        }
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
        if (this.imageUrls == null) {
            this.imageUrls = new ArrayList<>();
        }
        
        // İndirim yüzdesini hesapla
        calculateDiscountPercentage();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        calculateDiscountPercentage();
    }
    
    /**
     * İndirim yüzdesini hesapla
     */
    private void calculateDiscountPercentage() {
        if (oldPrice != null && price != null && oldPrice.compareTo(price) > 0) {
            BigDecimal discount = oldPrice.subtract(price);
            this.discountPercentage = discount.divide(oldPrice, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
            this.onSale = true;
        } else {
            this.discountPercentage = null;
            if (oldPrice == null || oldPrice.compareTo(price) <= 0) {
                this.onSale = false;
            }
        }
    }

    /**
     * Fiyat hesapla (width, pleatType, price ile)
     */
    public BigDecimal fiyatHesapla() {
        if (width == null || pleatType == null || price == null) {
            throw new IllegalArgumentException("Width, pleatType ve price boş olamaz.");
        }

        double metreCinsindenEn = width / 100.0;

        double pileCarpani = getPleatMultiplier(pleatType);

        // Toplam fiyat = metre * pile * 1m fiyatı
        double toplam = metreCinsindenEn * pileCarpani * price.doubleValue();

        return BigDecimal.valueOf(toplam).setScale(2, RoundingMode.HALF_UP);
    }
    
    /**
     * Fiyat hesapla (width, height, pleatType, quantity, price ile)
     */
    public BigDecimal fiyatHesapla(Double width, Double height, String pleatType, Integer quantity) {
        if (width == null || pleatType == null || price == null) {
            throw new IllegalArgumentException("Width, pleatType ve price boş olamaz.");
        }
        
        if (height == null) {
            height = this.height != null ? this.height : 200.0; // Varsayılan yükseklik
        }
        
        if (quantity == null) {
            quantity = 1;
        }

        double metreCinsindenEn = width / 100.0;
        double metreCinsindenBoy = height / 100.0;
        double pileCarpani = getPleatMultiplier(pleatType);

        // Toplam fiyat = (en * boy) * pile * adet * 1m fiyatı
        double toplam = metreCinsindenEn * metreCinsindenBoy * pileCarpani * quantity * price.doubleValue();

        return BigDecimal.valueOf(toplam).setScale(2, RoundingMode.HALF_UP);
    }
    
    /**
     * Pilaj çarpanını hesapla
     */
    private double getPleatMultiplier(String pleatType) {
        if (pleatType == null || pleatType.isEmpty()) {
            return 1.0;
        }
        
        try {
            String[] parts = pleatType.split("x");
            if (parts.length == 2) {
                return Double.parseDouble(parts[1]);
            }
        } catch (NumberFormatException e) {
            // Hata durumunda varsayılan değer
        }
        
        return 1.0;
    }
    
    /**
     * Stokta var mı?
     */
    public boolean isInStock() {
        return quantity != null && quantity > 0;
    }
    
    /**
     * Stok az mı? (10 metrenin altında)
     */
    public boolean isLowStock() {
        return quantity != null && quantity > 0 && quantity < 10;
    }
    
    /**
     * Stokta yok mu?
     */
    public boolean isOutOfStock() {
        return quantity == null || quantity <= 0;
    }
    
    /**
     * İndirimli mi?
     */
    public boolean hasDiscount() {
        return oldPrice != null && price != null && oldPrice.compareTo(price) > 0;
    }
    
    /**
     * Ürün görseli var mı?
     */
    public boolean hasImage() {
        return coverImageUrl != null && !coverImageUrl.isEmpty();
    }
}

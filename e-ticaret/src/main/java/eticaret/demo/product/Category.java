package eticaret.demo.product;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categories", indexes = {
    @Index(name = "idx_category_name", columnList = "name"),
    @Index(name = "idx_category_active", columnList = "active"),
    @Index(name = "idx_category_sort_order", columnList = "sort_order")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Kategori adı
     */
    @Column(name = "name", nullable = false, unique = true, length = 255)
    @jakarta.validation.constraints.NotBlank(message = "Kategori adı boş olamaz")
    @jakarta.validation.constraints.Size(min = 2, max = 255, message = "Kategori adı 2-255 karakter arasında olmalıdır")
    private String name;

    /**
     * Kategori açıklaması
     */
    @Column(name = "description", length = 1000)
    @jakarta.validation.constraints.Size(max = 1000, message = "Açıklama en fazla 1000 karakter olabilir")
    private String description;

    /**
     * Kategori görseli URL'i
     */
    @Column(name = "image_url", length = 1000)
    @jakarta.validation.constraints.Size(max = 1000, message = "Görsel URL'i en fazla 1000 karakter olabilir")
    private String imageUrl;

    /**
     * Kategori aktif mi
     */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

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
    @jakarta.validation.constraints.Size(max = 255, message = "SEO başlığı en fazla 255 karakter olabilir")
    private String seoTitle;

    /**
     * SEO açıklaması
     */
    @Column(name = "seo_description", length = 500)
    @jakarta.validation.constraints.Size(max = 500, message = "SEO açıklaması en fazla 500 karakter olabilir")
    private String seoDescription;

    /**
     * SEO anahtar kelimeleri
     */
    @Column(name = "seo_keywords", length = 500)
    @jakarta.validation.constraints.Size(max = 500, message = "SEO anahtar kelimeleri en fazla 500 karakter olabilir")
    private String seoKeywords;

    /**
     * Üst kategori (hierarchical yapı için)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_category_id")
    @JsonIgnoreProperties({"products", "parentCategory", "subCategories", "hibernateLazyInitializer", "handler"})
    private Category parentCategory;

    /**
     * Alt kategoriler
     */
    @OneToMany(mappedBy = "parentCategory", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<Category> subCategories = new ArrayList<>();

    /**
     * Kategoriye ait ürünler
     */
    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<Product> products = new ArrayList<>();

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
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
        if (this.products == null) {
            this.products = new ArrayList<>();
        }
        if (this.subCategories == null) {
            this.subCategories = new ArrayList<>();
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * Kategori aktif mi?
     */
    public boolean isActive() {
        return active != null && active;
    }
    
    /**
     * Alt kategori var mı?
     */
    public boolean hasSubCategories() {
        return subCategories != null && !subCategories.isEmpty();
    }
    
    /**
     * Ürün var mı?
     */
    public boolean hasProducts() {
        return products != null && !products.isEmpty();
    }
    
    /**
     * Üst kategori var mı?
     */
    public boolean hasParent() {
        return parentCategory != null;
    }
}


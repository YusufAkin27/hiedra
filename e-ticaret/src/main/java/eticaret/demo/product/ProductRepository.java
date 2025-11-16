package eticaret.demo.product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Product repository
 * Gelişmiş sorgular ve filtreleme için
 */
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    /**
     * Tüm ürünleri kategori ile birlikte getir
     */
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category")
    List<Product> findAllWithCategory();
    
    /**
     * Aktif ürünleri kategori ile birlikte getir (sadece stokta olanlar)
     */
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category WHERE p.active = true AND p.quantity > 0")
    List<Product> findAllActiveWithCategory();
    
    @Override
    @EntityGraph(attributePaths = {"category"})
    List<Product> findAll();
    
    /**
     * Aktif ürünleri getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0")
    List<Product> findByActiveTrue();
    
    /**
     * Aktif ürünleri sayfalama ile getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0")
    Page<Product> findByActiveTrue(Pageable pageable);
    
    /**
     * Belirli bir ID'ye sahip aktif ürünü getir
     */
    @EntityGraph(attributePaths = {"category"})
    Optional<Product> findByIdAndActiveTrue(Long id);
    
    /**
     * SKU'ya göre ürün bul
     */
    Optional<Product> findBySku(String sku);
    
    /**
     * Kategoriye göre aktif ürünleri getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId AND p.active = true AND p.quantity > 0")
    List<Product> findByCategoryIdAndActiveTrue(@Param("categoryId") Long categoryId);
    
    /**
     * Kategoriye göre aktif ürünleri sayfalama ile getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId AND p.active = true AND p.quantity > 0")
    Page<Product> findByCategoryIdAndActiveTrue(@Param("categoryId") Long categoryId, Pageable pageable);
    
    /**
     * Öne çıkarılmış ürünleri getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.featured = true AND p.active = true AND p.quantity > 0 ORDER BY p.sortOrder ASC")
    List<Product> findByFeaturedTrueAndActiveTrueOrderBySortOrderAsc();
    
    /**
     * Yeni ürünleri getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.isNew = true AND p.active = true AND p.quantity > 0 ORDER BY p.createdAt DESC")
    List<Product> findByIsNewTrueAndActiveTrueOrderByCreatedAtDesc(Pageable pageable);
    
    /**
     * İndirimli ürünleri getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.onSale = true AND p.active = true AND p.quantity > 0 ORDER BY p.sortOrder ASC")
    List<Product> findByOnSaleTrueAndActiveTrueOrderBySortOrderAsc();
    
    /**
     * Stokta olan ürünleri getir
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0")
    List<Product> findInStockProducts();
    
    /**
     * Stokta olan ürünleri sayfalama ile getir
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0")
    Page<Product> findInStockProducts(Pageable pageable);
    
    /**
     * Stokta az kalan ürünleri getir (10 metrenin altında)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 AND p.quantity < 10")
    List<Product> findLowStockProducts();
    
    /**
     * Fiyat aralığına göre ürünleri getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 AND p.price BETWEEN :minPrice AND :maxPrice")
    List<Product> findByPriceBetween(@Param("minPrice") BigDecimal minPrice, @Param("maxPrice") BigDecimal maxPrice);
    
    /**
     * Fiyat aralığına göre ürünleri sayfalama ile getir (sadece stokta olanlar)
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 AND p.price BETWEEN :minPrice AND :maxPrice")
    Page<Product> findByPriceBetween(@Param("minPrice") BigDecimal minPrice, @Param("maxPrice") BigDecimal maxPrice, Pageable pageable);
    
    /**
     * İsme göre arama (case-insensitive, contains) - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 AND LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Product> searchByName(@Param("name") String name);
    
    /**
     * İsme göre arama (sayfalama ile) - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 AND LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Product> searchByName(@Param("name") String name, Pageable pageable);
    
    /**
     * Açıklamaya göre arama - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Product> searchByKeyword(@Param("keyword") String keyword);
    
    /**
     * Açıklamaya göre arama (sayfalama ile) - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Product> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
    
    /**
     * Renk, materyal, kullanım alanı gibi özelliklere göre filtreleme - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 " +
           "AND (:color IS NULL OR LOWER(p.color) = LOWER(:color)) " +
           "AND (:material IS NULL OR LOWER(p.material) = LOWER(:material)) " +
           "AND (:usageArea IS NULL OR LOWER(p.usageArea) LIKE LOWER(CONCAT('%', :usageArea, '%'))) " +
           "AND (:mountingType IS NULL OR LOWER(p.mountingType) = LOWER(:mountingType))")
    List<Product> filterProducts(
            @Param("color") String color,
            @Param("material") String material,
            @Param("usageArea") String usageArea,
            @Param("mountingType") String mountingType
    );
    
    /**
     * Fiyata göre sıralama (artan) - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 ORDER BY p.price ASC")
    List<Product> findAllActiveOrderByPriceAsc();
    
    /**
     * Fiyata göre sıralama (azalan) - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 ORDER BY p.price DESC")
    List<Product> findAllActiveOrderByPriceDesc();
    
    /**
     * Tarihe göre sıralama (yeni önce) - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 ORDER BY p.createdAt DESC")
    List<Product> findAllActiveOrderByCreatedAtDesc();
    
    /**
     * Sıralama değerine göre sıralama - sadece stokta olanlar
     */
    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity > 0 ORDER BY p.sortOrder ASC, p.createdAt DESC")
    List<Product> findAllActiveOrderBySortOrder();
    
    /**
     * Aktif ürün sayısı
     */
    long countByActiveTrue();
    
    /**
     * Kategoriye göre aktif ürün sayısı
     */
    long countByCategoryIdAndActiveTrue(Long categoryId);
    
    /**
     * Stokta olan ürün sayısı
     */
    @Query("SELECT COUNT(p) FROM Product p WHERE p.active = true AND p.quantity > 0")
    long countInStockProducts();
    
    /**
     * Stokta az kalan ürün sayısı
     */
    @Query("SELECT COUNT(p) FROM Product p WHERE p.active = true AND p.quantity > 0 AND p.quantity < 10")
    long countLowStockProducts();
}

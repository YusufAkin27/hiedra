package eticaret.demo.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductViewRepository extends JpaRepository<ProductView, Long> {
    /**
     * Belirli bir ürüne ait tüm görüntülemeleri getir
     */
    @Query("SELECT v FROM ProductView v WHERE v.product.id = :productId ORDER BY v.viewedAt DESC")
    List<ProductView> findByProductId(Long productId);

    /**
     * Belirli bir ürünün toplam görüntüleme sayısını getir
     */
    @Query("SELECT COUNT(v) FROM ProductView v WHERE v.product.id = :productId")
    Long countByProductId(Long productId);

    /**
     * Belirli bir ürünün belirli bir tarih aralığındaki görüntüleme sayısını getir
     */
    @Query("SELECT COUNT(v) FROM ProductView v WHERE v.product.id = :productId AND v.viewedAt >= :startDate AND v.viewedAt <= :endDate")
    Long countByProductIdAndDateRange(Long productId, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * En çok görüntülenen ürünleri getir
     */
    @Query("SELECT v.product.id, COUNT(v) as viewCount FROM ProductView v GROUP BY v.product.id ORDER BY COUNT(v) DESC")
    List<Object[]> findMostViewedProducts();

    /**
     * Kullanıcının belirli bir ürünü görüntüleyip görüntülemediğini kontrol et
     */
    @Query("SELECT COUNT(v) > 0 FROM ProductView v WHERE v.product.id = :productId AND v.user.id = :userId")
    boolean hasUserViewedProduct(Long productId, Long userId);

    /**
     * Son 24 saatteki görüntülemeleri getir
     */
    @Query("SELECT v FROM ProductView v WHERE v.viewedAt >= :since ORDER BY v.viewedAt DESC")
    List<ProductView> findRecentViews(LocalDateTime since);

    /**
     * Belirli bir IP adresinden belirli bir ürüne yapılan görüntülemeleri getir
     */
    @Query("SELECT COUNT(v) FROM ProductView v WHERE v.product.id = :productId AND v.ipAddress = :ipAddress AND v.viewedAt >= :since")
    Long countByProductIdAndIpAddressSince(Long productId, String ipAddress, LocalDateTime since);
    
    /**
     * Kullanıcının görüntülediği ürün ID'lerini getir (son N görüntüleme)
     */
    @Query("SELECT v.product.id FROM ProductView v " +
           "WHERE v.user.id = :userId " +
           "AND v.product.id IS NOT NULL " +
           "GROUP BY v.product.id " +
           "ORDER BY MAX(v.viewedAt) DESC")
    List<Long> findViewedProductIdsByUserId(Long userId);
    
    /**
     * IP adresine göre görüntülenen ürün ID'lerini getir (son N görüntüleme)
     */
    @Query("SELECT v.product.id FROM ProductView v " +
           "WHERE v.ipAddress = :ipAddress " +
           "AND v.product.id IS NOT NULL " +
           "GROUP BY v.product.id " +
           "ORDER BY MAX(v.viewedAt) DESC")
    List<Long> findViewedProductIdsByIpAddress(String ipAddress);
    
    /**
     * Belirli bir ürünü görüntüleyen kullanıcıların görüntülediği diğer ürünleri bul
     */
    @Query("SELECT v2.product.id, COUNT(DISTINCT v2.user.id) as userCount " +
           "FROM ProductView v1 " +
           "JOIN ProductView v2 ON v1.user.id = v2.user.id " +
           "WHERE v1.product.id = :productId " +
           "AND v2.product.id != :productId " +
           "AND v1.user.id IS NOT NULL " +
           "AND v2.user.id IS NOT NULL " +
           "GROUP BY v2.product.id " +
           "ORDER BY userCount DESC")
    List<Object[]> findSimilarProductsByUserViews(Long productId);
}


package eticaret.demo.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
    /**
     * Belirli bir ürüne ait aktif yorumları getir
     * JOIN FETCH ile lazy loading proxy hatasını önler
     */
    @Query("SELECT r FROM ProductReview r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.product WHERE r.product.id = :productId AND r.active = true ORDER BY r.createdAt DESC")
    List<ProductReview> findByProductIdAndActiveTrue(Long productId);

    /**
     * Kullanıcının belirli bir ürüne ait yorumunu getir (aktif veya pasif)
     * JOIN FETCH ile lazy loading proxy hatasını önler
     */
    @Query("SELECT r FROM ProductReview r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.product WHERE r.product.id = :productId AND r.user.id = :userId")
    Optional<ProductReview> findByProductIdAndUserId(Long productId, Long userId);
    
    /**
     * Kullanıcının belirli bir ürüne ait aktif yorumunu getir
     * JOIN FETCH ile lazy loading proxy hatasını önler
     */
    @Query("SELECT r FROM ProductReview r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.product WHERE r.product.id = :productId AND r.user.id = :userId AND r.active = true")
    Optional<ProductReview> findByProductIdAndUserIdAndActiveTrue(Long productId, Long userId);

    /**
     * Tüm aktif yorumları getir (admin için)
     * JOIN FETCH ile lazy loading proxy hatasını önler
     */
    @Query("SELECT r FROM ProductReview r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.product WHERE r.active = true ORDER BY r.createdAt DESC")
    List<ProductReview> findAllActive();

    /**
     * Tüm yorumları getir (admin için, silinmişler dahil)
     * JOIN FETCH ile lazy loading proxy hatasını önler
     */
    @Query("SELECT r FROM ProductReview r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.product ORDER BY r.createdAt DESC")
    List<ProductReview> findAllOrderByCreatedAtDesc();

    /**
     * Ürünün ortalama puanını hesapla
     */
    @Query("SELECT AVG(r.rating) FROM ProductReview r WHERE r.product.id = :productId AND r.active = true")
    Double calculateAverageRatingByProductId(Long productId);

    /**
     * Ürünün toplam yorum sayısını getir
     */
    @Query("SELECT COUNT(r) FROM ProductReview r WHERE r.product.id = :productId AND r.active = true")
    Long countByProductIdAndActiveTrue(Long productId);

    /**
     * Kullanıcının tüm yorumlarını getir
     * JOIN FETCH ile lazy loading proxy hatasını önler
     */
    @Query("SELECT r FROM ProductReview r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.product WHERE r.user.id = :userId ORDER BY r.createdAt DESC")
    List<ProductReview> findByUserId(Long userId);

    /**
     * ID'ye göre yorum getir (JOIN FETCH ile)
     * Lazy loading proxy hatasını önler
     */
    @Query("SELECT r FROM ProductReview r LEFT JOIN FETCH r.user LEFT JOIN FETCH r.product WHERE r.id = :id")
    Optional<ProductReview> findByIdWithUserAndProduct(Long id);
}


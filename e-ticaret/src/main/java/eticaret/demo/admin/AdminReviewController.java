package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.product.ProductReview;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.response.DataResponseMessage;

import java.util.List;
import java.util.Optional;

/**
 * Admin yorum yönetimi endpoint'leri
 * Tüm işlemler admin yetkisi gerektirir
 */
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewController {

    private final ProductReviewRepository reviewRepository;

    /**
     * Tüm yorumları listele (admin)
     * GET /api/admin/reviews
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<ProductReview>>> getAllReviews(
            @RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly
    ) {
        List<ProductReview> reviews;
        if (activeOnly) {
            reviews = reviewRepository.findAllActive();
        } else {
            reviews = reviewRepository.findAllOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(DataResponseMessage.success("Yorumlar başarıyla getirildi", reviews));
    }

    /**
     * Yorum detayı getir (admin)
     * GET /api/admin/reviews/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<ProductReview>> getReviewById(@PathVariable Long id) {
        Optional<ProductReview> review = reviewRepository.findByIdWithUserAndProduct(id);
        if (review.isPresent()) {
            return ResponseEntity.ok(DataResponseMessage.success("Yorum başarıyla getirildi", review.get()));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Yorumu sil (admin - hard delete veya soft delete)
     * DELETE /api/admin/reviews/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteReview(
            @PathVariable Long id,
            @RequestParam(value = "hardDelete", defaultValue = "false") boolean hardDelete
    ) {
        Optional<ProductReview> reviewOpt = reviewRepository.findById(id);
        if (reviewOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (hardDelete) {
            // Hard delete - veritabanından tamamen sil
            reviewRepository.deleteById(id);
            return ResponseEntity.ok(new DataResponseMessage<>("Yorum kalıcı olarak silindi.", true, null));
        } else {
            // Soft delete - sadece aktif durumunu değiştir
            ProductReview review = reviewOpt.get();
            review.setActive(false);
            reviewRepository.save(review);
            return ResponseEntity.ok(new DataResponseMessage<>("Yorum başarıyla silindi.", true, null));
        }
    }

    /**
     * Yorumu geri yükle (soft delete'ten sonra)
     * PATCH /api/admin/reviews/{id}/restore
     */
    @PatchMapping("/{id}/restore")
    public ResponseEntity<DataResponseMessage<ProductReview>> restoreReview(@PathVariable Long id) {
        Optional<ProductReview> reviewOpt = reviewRepository.findById(id);
        if (reviewOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ProductReview review = reviewOpt.get();
        review.setActive(true);
        ProductReview restored = reviewRepository.save(review);

        return ResponseEntity.ok(DataResponseMessage.success("Yorum başarıyla geri yüklendi.", restored));
    }

    /**
     * Yorumu aktif/pasif yap
     * PATCH /api/admin/reviews/{id}/toggle-active
     */
    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<DataResponseMessage<ProductReview>> toggleReviewActive(@PathVariable Long id) {
        Optional<ProductReview> reviewOpt = reviewRepository.findById(id);
        if (reviewOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ProductReview review = reviewOpt.get();
        Boolean currentActive = review.getActive();
        review.setActive(currentActive == null || !currentActive);
        ProductReview updated = reviewRepository.save(review);

        return ResponseEntity.ok(DataResponseMessage.success(
                Boolean.TRUE.equals(updated.getActive()) ? "Yorum aktif edildi." : "Yorum pasif edildi.",
                updated
        ));
    }

    /**
     * Belirli bir ürüne ait yorumları getir (admin)
     * GET /api/admin/reviews/product/{productId}
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<DataResponseMessage<List<ProductReview>>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly
    ) {
        List<ProductReview> reviews;
        if (activeOnly) {
            reviews = reviewRepository.findByProductIdAndActiveTrue(productId);
        } else {
            // Tüm yorumları getir (aktif ve pasif)
            // JOIN FETCH ile lazy loading proxy hatasını önlemek için findAllOrderByCreatedAtDesc kullan
            reviews = reviewRepository.findAllOrderByCreatedAtDesc().stream()
                    .filter(r -> r.getProduct() != null && r.getProduct().getId().equals(productId))
                    .toList();
        }
        return ResponseEntity.ok(DataResponseMessage.success("Yorumlar başarıyla getirildi", reviews));
    }
}


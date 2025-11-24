package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.product.ProductReview;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.common.response.DataResponseMessage;

import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

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
    private final ProductRepository productRepository;
    private final AppUserRepository userRepository;

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

    /**
     * Admin için sahte yorum ekle
     * POST /api/admin/reviews/create-fake
     * Admin herhangi bir ürün için, herhangi bir kullanıcı adıyla yorum ekleyebilir
     */
    @PostMapping(value = "/create-fake", consumes = {"application/x-www-form-urlencoded", "multipart/form-data"})
    public ResponseEntity<DataResponseMessage<ProductReview>> createFakeReview(
            @RequestParam("productId") Long productId,
            @RequestParam("rating") Integer rating,
            @RequestParam(value = "reviewerName", required = false) String reviewerName,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "imageUrls", required = false) List<String> imageUrls
    ) {
        try {
            // Ürün kontrolü
            Optional<eticaret.demo.product.Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Ürün bulunamadı."));
            }

            // Rating kontrolü
            if (rating == null || rating < 1 || rating > 5) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Puan 1-5 arasında olmalıdır."));
            }

            // Varsayılan kullanıcı adı
            String finalReviewerName = reviewerName != null && !reviewerName.trim().isEmpty()
                    ? reviewerName.trim()
                    : "Müşteri";

            // Varsayılan kullanıcıyı bul veya oluştur (sahte yorumlar için)
            // Eğer "fake-reviewer@hiedra.com" gibi bir kullanıcı yoksa, ilk admin kullanıcısını kullan
            eticaret.demo.auth.AppUser fakeUser = userRepository.findByEmailIgnoreCase("fake-reviewer@hiedra.com")
                    .orElseGet(() -> {
                        // Eğer fake kullanıcı yoksa, ilk admin kullanıcısını al
                        return userRepository.findFirstByRole(eticaret.demo.auth.UserRole.ADMIN)
                                .orElse(null);
                    });

            if (fakeUser == null) {
                return ResponseEntity.status(500)
                        .body(DataResponseMessage.error("Yorum eklemek için kullanıcı bulunamadı. Lütfen sistem yöneticisine başvurun."));
            }

            // Görsel URL'lerini kontrol et ve temizle
            List<String> finalImageUrls = new ArrayList<>();
            if (imageUrls != null && !imageUrls.isEmpty()) {
                for (String url : imageUrls) {
                    if (url != null && !url.trim().isEmpty()) {
                        String cleanedUrl = url.trim();
                        // Basit URL validasyonu
                        if (cleanedUrl.startsWith("http://") || cleanedUrl.startsWith("https://")) {
                            finalImageUrls.add(cleanedUrl);
                        }
                    }
                }
            }

            // Comment null kontrolü
            String finalComment = (comment != null && !comment.trim().isEmpty()) ? comment.trim() : null;

            // Sahte yorum için reviewer name'i adminNote alanında sakla
            // ProductReviewResponse.fromEntity() metodunda bu alan kontrol edilecek
            String adminNoteForReviewerName = finalReviewerName;

            // Sahte yorum oluştur
            ProductReview review = ProductReview.builder()
                    .product(productOpt.get())
                    .user(fakeUser)
                    .rating(rating)
                    .comment(finalComment)
                    .imageUrls(finalImageUrls)
                    .active(true)
                    .approved(true)
                    .adminNote(adminNoteForReviewerName) // Reviewer name'i buraya kaydediyoruz
                    .build();

            ProductReview saved = reviewRepository.save(review);

            return ResponseEntity.ok(DataResponseMessage.success(
                    "Sahte yorum başarıyla eklendi. (Yorumcu: " + finalReviewerName + ")",
                    saved
            ));
        } catch (Exception e) {
            e.printStackTrace(); // Log için
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Sahte yorum eklenirken hata oluştu: " + e.getMessage()));
        }
    }
}


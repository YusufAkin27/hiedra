package eticaret.demo.product;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.cloudinary.MediaUploadService;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.response.DataResponseMessage;


import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Kullanıcılar için yorum endpoint'leri
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final AppUserRepository userRepository;
    private final MediaUploadService mediaUploadService;
    private final OrderRepository orderRepository;

    /**
     * Ürüne yorum ekle
     * POST /api/reviews
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DataResponseMessage<ProductReview>> createReview(
            @RequestParam("productId") Long productId,
            @RequestParam("rating") Integer rating,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            Authentication authentication
    ) {
        try {
            // Kullanıcı bilgisini al
            if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails)) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

            String email = ((UserDetails) authentication.getPrincipal()).getUsername();
            Optional<AppUser> userOpt = userRepository.findByEmailIgnoreCase(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(DataResponseMessage.error("Kullanıcı bulunamadı."));
            }

            AppUser user = userOpt.get();

            // Ürün kontrolü
            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                return ResponseEntity.status(404).body(DataResponseMessage.error("Ürün bulunamadı."));
            }

            // Rating kontrolü
            if (rating == null || rating < 1 || rating > 5) {
                return ResponseEntity.badRequest().body(DataResponseMessage.error("Puan 1-5 arasında olmalıdır."));
            }

            // Kullanıcının bu ürüne daha önce yorum yapıp yapmadığını kontrol et
            Optional<ProductReview> existingReview = reviewRepository.findByProductIdAndUserId(productId, user.getId());
            if (existingReview.isPresent() && Boolean.TRUE.equals(existingReview.get().getActive())) {
                return ResponseEntity.badRequest().body(DataResponseMessage.error("Bu ürüne zaten yorum yaptınız. Her ürüne sadece bir kez yorum yapabilirsiniz. Yorumunuzu düzenleyebilirsiniz."));
            }

            // Kullanıcının bu ürünü satın alıp almadığını kontrol et
            Product product = productOpt.get();
            List<Order> userOrders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(user.getEmail());
            
            boolean hasPurchased = false;
            for (Order order : userOrders) {
                // Sadece teslim edilmiş veya tamamlanmış siparişlerdeki ürünlere yorum yapılabilir
                if (order.getStatus() == OrderStatus.TESLIM_EDILDI ||
                    order.getStatus() == OrderStatus.TAMAMLANDI ||
                    order.getStatus() == OrderStatus.ODENDI ||
                    order.getStatus() == OrderStatus.ISLEME_ALINDI ||
                    order.getStatus() == OrderStatus.KARGOYA_VERILDI) {
                    
                    // OrderItem'larda bu ürün var mı kontrol et
                    if (order.getOrderItems() != null) {
                        for (var orderItem : order.getOrderItems()) {
                            // Önce productId ile kontrol et (daha güvenilir)
                            if (orderItem.getProductId() != null && orderItem.getProductId().equals(productId)) {
                                hasPurchased = true;
                                break;
                            }
                            // Eğer productId yoksa, ürün adı ile eşleştirme yap (geriye dönük uyumluluk)
                            if (orderItem.getProductId() == null && 
                                orderItem.getProductName() != null && 
                                orderItem.getProductName().equalsIgnoreCase(product.getName())) {
                                hasPurchased = true;
                                break;
                            }
                        }
                    }
                    if (hasPurchased) break;
                }
            }
            
            if (!hasPurchased) {
                return ResponseEntity.badRequest().body(DataResponseMessage.error("Bu ürüne yorum yapabilmek için önce ürünü satın almanız gerekiyor."));
            }

            // Fotoğrafları yükle
            List<String> imageUrls = new ArrayList<>();
            if (images != null && !images.isEmpty()) {
                for (MultipartFile image : images) {
                    if (!image.isEmpty()) {
                        try {
                            var result = mediaUploadService.uploadAndOptimizeProductImage(image);
                            imageUrls.add(result.getOptimizedUrl());
                        } catch (Exception e) {
                            // Fotoğraf yükleme hatası yorum oluşturmayı engellemez
                            // Loglama yapılabilir
                        }
                    }
                }
            }

            // Yorum oluştur
            ProductReview review = ProductReview.builder()
                    .product(productOpt.get())
                    .user(user)
                    .rating(rating)
                    .comment(comment)
                    .imageUrls(imageUrls)
                    .active(true)
                    .build();

            ProductReview saved = reviewRepository.save(review);
            return ResponseEntity.ok(DataResponseMessage.success("Yorum başarıyla eklendi.", saved));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorum eklenirken hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Yorumu güncelle
     * PUT /api/reviews/{id}
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DataResponseMessage<ProductReview>> updateReview(
            @PathVariable Long id,
            @RequestParam(value = "rating", required = false) Integer rating,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            Authentication authentication
    ) {
        try {
            // Kullanıcı bilgisini al
            if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails)) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

            String email = ((UserDetails) authentication.getPrincipal()).getUsername();
            Optional<AppUser> userOpt = userRepository.findByEmailIgnoreCase(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(DataResponseMessage.error("Kullanıcı bulunamadı."));
            }

            AppUser user = userOpt.get();

            // Yorum kontrolü
            Optional<ProductReview> reviewOpt = reviewRepository.findById(id);
            if (reviewOpt.isEmpty()) {
                return ResponseEntity.status(404).body(DataResponseMessage.error("Yorum bulunamadı."));
            }

            ProductReview review = reviewOpt.get();

            // Kullanıcı kontrolü (sadece kendi yorumunu düzenleyebilir)
            if (!review.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(DataResponseMessage.error("Bu yorumu düzenleme yetkiniz yok."));
            }

            // Rating kontrolü
            if (rating != null && (rating < 1 || rating > 5)) {
                return ResponseEntity.badRequest().body(DataResponseMessage.error("Puan 1-5 arasında olmalıdır."));
            }

            // Güncellemeleri uygula
            if (rating != null) {
                review.setRating(rating);
            }
            if (comment != null) {
                review.setComment(comment);
            }

            // Yeni fotoğraflar varsa ekle
            if (images != null && !images.isEmpty()) {
                List<String> newImageUrls = new ArrayList<>(review.getImageUrls());
                for (MultipartFile image : images) {
                    if (!image.isEmpty()) {
                        try {
                            var result = mediaUploadService.uploadAndOptimizeProductImage(image);
                            newImageUrls.add(result.getOptimizedUrl());
                        } catch (Exception e) {
                            // Fotoğraf yükleme hatası yorum güncellemeyi engellemez
                            // Loglama yapılabilir
                        }
                    }
                }
                review.setImageUrls(newImageUrls);
            }

            ProductReview updated = reviewRepository.save(review);
            return ResponseEntity.ok(DataResponseMessage.success("Yorum başarıyla güncellendi.", updated));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorum güncellenirken hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Yorumu sil (soft delete - sadece kendi yorumunu silebilir)
     * DELETE /api/reviews/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteReview(
            @PathVariable Long id,
            Authentication authentication
    ) {
        try {
            // Kullanıcı bilgisini al
            if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails)) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

            String email = ((UserDetails) authentication.getPrincipal()).getUsername();
            Optional<AppUser> userOpt = userRepository.findByEmailIgnoreCase(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(DataResponseMessage.error("Kullanıcı bulunamadı."));
            }

            AppUser user = userOpt.get();

            // Yorum kontrolü
            Optional<ProductReview> reviewOpt = reviewRepository.findById(id);
            if (reviewOpt.isEmpty()) {
                return ResponseEntity.status(404).body(DataResponseMessage.error("Yorum bulunamadı."));
            }

            ProductReview review = reviewOpt.get();

            // Kullanıcı kontrolü (sadece kendi yorumunu silebilir)
            if (!review.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(DataResponseMessage.error("Bu yorumu silme yetkiniz yok."));
            }

            // Soft delete
            review.setActive(false);
            reviewRepository.save(review);

            return ResponseEntity.ok(new DataResponseMessage<>("Yorum başarıyla silindi.", true, null));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorum silinirken hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Ürüne ait yorumları getir
     * GET /api/reviews/product/{productId}
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<DataResponseMessage<List<ProductReview>>> getProductReviews(
            @PathVariable Long productId
    ) {
        List<ProductReview> reviews = reviewRepository.findByProductIdAndActiveTrue(productId);
        return ResponseEntity.ok(DataResponseMessage.success("Yorumlar başarıyla getirildi.", reviews));
    }

    /**
     * Yorum detayını getir
     * GET /api/reviews/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<ProductReview>> getReviewById(@PathVariable Long id) {
        Optional<ProductReview> review = reviewRepository.findByIdWithUserAndProduct(id);
        if (review.isPresent() && Boolean.TRUE.equals(review.get().getActive())) {
            return ResponseEntity.ok(DataResponseMessage.success("Yorum başarıyla getirildi.", review.get()));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Kullanıcının kendi yorumlarını getir
     * GET /api/reviews/my-reviews
     */
    @GetMapping("/my-reviews")
    public ResponseEntity<DataResponseMessage<List<ProductReview>>> getMyReviews(
            @AuthenticationPrincipal AppUser currentUser
    ) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

            List<ProductReview> reviews = reviewRepository.findByUserId(currentUser.getId());
            
            return ResponseEntity.ok(DataResponseMessage.success("Yorumlar başarıyla getirildi.", reviews));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorumlar getirilirken hata oluştu: " + e.getMessage()));
        }
    }
}


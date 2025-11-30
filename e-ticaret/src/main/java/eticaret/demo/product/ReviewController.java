package eticaret.demo.product;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.cloudinary.MediaUploadService;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.product.dto.ProductReviewPageResponse;
import eticaret.demo.product.dto.ProductReviewResponse;
import eticaret.demo.product.dto.ReviewSortOption;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Kullanıcılar için yorum endpoint'leri
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final AppUserRepository userRepository;
    private final MediaUploadService mediaUploadService;
    private final OrderRepository orderRepository;
    private final ReviewService reviewService;

    /**
     * Authentication'dan AppUser'ı al
     */
    private AppUser getAppUserFromAuthentication(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        
        // Principal AppUser ise direkt kullan
        if (principal instanceof AppUser) {
            AppUser user = (AppUser) principal;
            // Kullanıcı bilgilerini doğrula ve güncel halini al
            return userRepository.findById(user.getId()).orElse(user);
        } 
        // Principal UserDetails ise email'den kullanıcıyı bul
        else if (principal instanceof UserDetails) {
            String email = ((UserDetails) principal).getUsername();
            return userRepository.findByEmailIgnoreCase(email).orElse(null);
        } 
        // Principal String ise (email olabilir)
        else if (principal instanceof String) {
            String email = (String) principal;
            return userRepository.findByEmailIgnoreCase(email).orElse(null);
        }
        
        return null;
    }

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
            AppUser user = getAppUserFromAuthentication(authentication);
            if (user == null) {
                log.warn("createReview: Authentication başarısız - kullanıcı bulunamadı");
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }
            
            // Kullanıcı aktif değilse hata döndür
            if (!user.isActive()) {
                log.warn("createReview: Kullanıcı aktif değil - userId: {}, email: {}", user.getId(), user.getEmail());
                return ResponseEntity.status(403).body(DataResponseMessage.error("Hesabınız aktif değil."));
            }
            
            log.info("createReview: Kullanıcı bilgileri alındı - userId: {}, email: {}, productId: {}", 
                    user.getId(), user.getEmail(), productId);

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
            // Sadece teslim edilmiş siparişlerdeki ürünlere yorum yapılabilir
            Product product = productOpt.get();
            List<Order> userOrders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(user.getEmail());
            
            boolean hasPurchased = false;
            for (Order order : userOrders) {
                // Sadece teslim edilmiş siparişlerdeki ürünlere yorum yapılabilir
                if (order.getStatus() == OrderStatus.TESLIM_EDILDI) {
                    
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
                return ResponseEntity.badRequest().body(DataResponseMessage.error("Bu ürüne yorum yapabilmek için ürünün teslim edilmiş olması gerekiyor."));
            }

            // Asenkron olarak yorum oluştur - hemen response döndür
            reviewService.createReviewAsyncWithUser(productId, user, rating, comment, images);
            
            // Hemen başarı mesajı döndür (yorum arka planda oluşturulacak)
            log.info("Yorum gönderildi - arka planda işleniyor - productId: {}, userId: {}", productId, user.getId());
            return ResponseEntity.ok(DataResponseMessage.success("Yorumunuz gönderildi. Yorumunuz kısa süre içinde yayınlanacaktır.", null));

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
            AppUser user = getAppUserFromAuthentication(authentication);
            if (user == null || !user.isActive()) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

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
            AppUser user = getAppUserFromAuthentication(authentication);
            if (user == null || !user.isActive()) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

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
     * Ürüne ait yorumları sayfalı ve sıralı şekilde getir
     * GET /api/reviews/product/{productId}/page
     */
    @GetMapping("/product/{productId}/page")
    public ResponseEntity<DataResponseMessage<ProductReviewPageResponse>> getProductReviewsPaged(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size,
            @RequestParam(defaultValue = "LATEST") ReviewSortOption sort,
            @RequestParam(defaultValue = "false") boolean withImagesOnly
    ) {
        if (!productRepository.existsById(productId)) {
            return ResponseEntity.status(404).body(DataResponseMessage.error("Ürün bulunamadı."));
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 20);
        Pageable pageable = PageRequest.of(safePage, safeSize, resolveSort(sort));

        Page<ProductReview> reviewPage = withImagesOnly
                ? reviewRepository.findByProductIdAndActiveTrueWithImages(productId, pageable)
                : reviewRepository.findByProductIdAndActiveTrue(productId, pageable);

        List<ProductReviewResponse> responses = reviewPage.getContent()
                .stream()
                .map(ProductReviewResponse::fromEntity)
                .collect(Collectors.toList());

        ProductReviewPageResponse payload = ProductReviewPageResponse.builder()
                .items(responses)
                .page(reviewPage.getNumber())
                .size(reviewPage.getSize())
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .hasNext(reviewPage.hasNext())
                .hasPrevious(reviewPage.hasPrevious())
                .summary(buildSummary(productId))
                .build();

        return ResponseEntity.ok(DataResponseMessage.success("Yorumlar başarıyla getirildi.", payload));
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
     * Kullanıcının belirli bir ürüne ait yorumunu getir
     * GET /api/reviews/product/{productId}/user
     */
    @GetMapping("/product/{productId}/user")
    public ResponseEntity<DataResponseMessage<ProductReview>> getUserReviewForProduct(
            @PathVariable Long productId,
            Authentication authentication
    ) {
        try {
            AppUser user = getAppUserFromAuthentication(authentication);
            if (user == null || !user.isActive()) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }
            Optional<ProductReview> reviewOpt = reviewRepository.findByProductIdAndUserId(productId, user.getId());
            
            if (reviewOpt.isPresent() && Boolean.TRUE.equals(reviewOpt.get().getActive())) {
                return ResponseEntity.ok(DataResponseMessage.success("Yorum bulundu.", reviewOpt.get()));
            } else {
                return ResponseEntity.ok(DataResponseMessage.success("Yorum bulunamadı.", null));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorum kontrol edilirken hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının belirli bir ürüne yorum yapıp yapmadığını kontrol et (boolean döndürür)
     * GET /api/reviews/product/{productId}/has-reviewed
     */
    @GetMapping("/product/{productId}/has-reviewed")
    public ResponseEntity<DataResponseMessage<Boolean>> hasUserReviewedProduct(
            @PathVariable Long productId,
            Authentication authentication
    ) {
        try {
            AppUser user = getAppUserFromAuthentication(authentication);
            if (user == null || !user.isActive()) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }
            
            Optional<ProductReview> reviewOpt = reviewRepository.findByProductIdAndUserIdAndActiveTrue(productId, user.getId());
            boolean hasReviewed = reviewOpt.isPresent();
            
            return ResponseEntity.ok(DataResponseMessage.success("Kontrol tamamlandı.", hasReviewed));
        } catch (Exception e) {
            log.error("Yorum kontrolü hatası - productId: {}", productId, e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorum kontrol edilirken hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Birden fazla ürün için kullanıcının yorum yapıp yapmadığını toplu kontrol et
     * POST /api/reviews/check-multiple
     * Body: List<Long> productIds
     * Response: Map<Long, Boolean> (productId -> hasReviewed)
     */
    @PostMapping("/check-multiple")
    public ResponseEntity<DataResponseMessage<Map<Long, Boolean>>> checkMultipleProductsReviewed(
            @RequestBody List<Long> productIds,
            Authentication authentication
    ) {
        try {
            AppUser user = getAppUserFromAuthentication(authentication);
            if (user == null || !user.isActive()) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

            if (productIds == null || productIds.isEmpty()) {
                return ResponseEntity.ok(DataResponseMessage.success("Kontrol tamamlandı.", new HashMap<>()));
            }

            Map<Long, Boolean> resultMap = new HashMap<>();
            
            // Her ürün için kontrol yap
            for (Long productId : productIds) {
                if (productId != null) {
                    Optional<ProductReview> reviewOpt = reviewRepository.findByProductIdAndUserIdAndActiveTrue(productId, user.getId());
                    resultMap.put(productId, reviewOpt.isPresent());
                }
            }
            
            return ResponseEntity.ok(DataResponseMessage.success("Kontrol tamamlandı.", resultMap));
        } catch (Exception e) {
            log.error("Toplu yorum kontrolü hatası", e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorum kontrol edilirken hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının kendi yorumlarını getir
     * GET /api/reviews/my-reviews
     */
    @GetMapping("/my-reviews")
    public ResponseEntity<DataResponseMessage<List<ProductReview>>> getMyReviews(
            Authentication authentication
    ) {
        try {
            AppUser user = getAppUserFromAuthentication(authentication);
            if (user == null || !user.isActive()) {
                return ResponseEntity.status(401).body(DataResponseMessage.error("Giriş yapmanız gerekiyor."));
            }

            List<ProductReview> reviews = reviewRepository.findByUserId(user.getId());
            
            return ResponseEntity.ok(DataResponseMessage.success("Yorumlar başarıyla getirildi.", reviews));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yorumlar getirilirken hata oluştu: " + e.getMessage()));
        }
    }

    private Sort resolveSort(ReviewSortOption sortOption) {
        return switch (sortOption) {
            case OLDEST -> Sort.by(Sort.Direction.ASC, "createdAt");
            case HIGHEST_RATED -> Sort.by(Sort.Direction.DESC, "rating")
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
            case LOWEST_RATED -> Sort.by(Sort.Direction.ASC, "rating")
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
            case MOST_HELPFUL -> Sort.by(Sort.Direction.DESC, "helpfulCount")
                    .and(Sort.by(Sort.Direction.DESC, "likeCount"))
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    private ProductReviewPageResponse.ReviewSummary buildSummary(Long productId) {
        Long totalReviewCount = reviewRepository.countByProductIdAndActiveTrue(productId);
        Double averageRating = reviewRepository.calculateAverageRatingByProductId(productId);
        Long imageReviewCount = reviewRepository.countActiveWithImages(productId);
        List<Object[]> buckets = reviewRepository.countByRatingBuckets(productId);

        Map<Integer, Long> breakdownMap = new HashMap<>();
        if (buckets != null) {
            for (Object[] row : buckets) {
                if (row != null && row.length == 2 && row[0] != null && row[1] != null) {
                    Integer rating = ((Number) row[0]).intValue();
                    Long count = ((Number) row[1]).longValue();
                    breakdownMap.put(rating, count);
                }
            }
        }

        ProductReviewPageResponse.RatingBreakdown breakdown = ProductReviewPageResponse.RatingBreakdown.builder()
                .fiveStars(breakdownMap.getOrDefault(5, 0L))
                .fourStars(breakdownMap.getOrDefault(4, 0L))
                .threeStars(breakdownMap.getOrDefault(3, 0L))
                .twoStars(breakdownMap.getOrDefault(2, 0L))
                .oneStar(breakdownMap.getOrDefault(1, 0L))
                .build();

        return ProductReviewPageResponse.ReviewSummary.builder()
                .totalReviewCount(totalReviewCount != null ? totalReviewCount : 0L)
                .averageRating(roundToSingleDecimal(averageRating))
                .imageReviewCount(imageReviewCount != null ? imageReviewCount : 0L)
                .breakdown(breakdown)
                .build();
    }

    private double roundToSingleDecimal(Double value) {
        if (value == null) {
            return 0d;
        }
        return BigDecimal.valueOf(value)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }
}


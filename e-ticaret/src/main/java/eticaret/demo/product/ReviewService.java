package eticaret.demo.product;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.cloudinary.MediaUploadService;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Yorum işlemleri için servis
 * Asenkron yorum oluşturma desteği
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final MediaUploadService mediaUploadService;
    private final AppUserRepository appUserRepository;


    /**
     * Asenkron olarak yorum oluştur (AppUser ile)
     */
    @Async("taskExecutor")
    @Transactional
    public void createReviewAsyncWithUser(
            Long productId,
            AppUser user,
            Integer rating,
            String comment,
            List<MultipartFile> images
    ) {
        try {
            log.info("Asenkron yorum oluşturma başladı - productId: {}, userId: {}, email: {}", 
                    productId, user.getId(), user.getEmail());

            // Ürün kontrolü
            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                log.error("Asenkron yorum oluşturma hatası - Ürün bulunamadı: productId: {}", productId);
                return;
            }

            Product product = productOpt.get();

            // Kullanıcının bu ürüne daha önce yorum yapıp yapmadığını kontrol et
            Optional<ProductReview> existingReview = reviewRepository.findByProductIdAndUserId(productId, user.getId());
            if (existingReview.isPresent() && Boolean.TRUE.equals(existingReview.get().getActive())) {
                log.warn("Asenkron yorum oluşturma - Kullanıcı zaten yorum yapmış: productId: {}, userId: {}", 
                        productId, user.getId());
                return;
            }

            // Kullanıcının bu ürünü satın alıp almadığını kontrol et
            List<Order> userOrders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(user.getEmail());
            boolean hasPurchased = false;
            for (Order order : userOrders) {
                if (order.getStatus() == OrderStatus.TESLIM_EDILDI) {
                    if (order.getOrderItems() != null) {
                        for (var orderItem : order.getOrderItems()) {
                            if (orderItem.getProductId() != null && orderItem.getProductId().equals(productId)) {
                                hasPurchased = true;
                                break;
                            }
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
                log.warn("Asenkron yorum oluşturma - Kullanıcı ürünü satın almamış: productId: {}, userId: {}", 
                        productId, user.getId());
                return;
            }

            // Fotoğrafları yükle
            List<String> imageUrls = new ArrayList<>();
            if (images != null && !images.isEmpty()) {
                for (MultipartFile image : images) {
                    if (!image.isEmpty()) {
                        try {
                            var result = mediaUploadService.uploadAndOptimizeProductImage(image);
                            imageUrls.add(result.getOptimizedUrl());
                            log.debug("Fotoğraf yüklendi: {}", result.getOptimizedUrl());
                        } catch (Exception e) {
                            log.warn("Fotoğraf yükleme hatası: {}", e.getMessage());
                        }
                    }
                }
            }

            // Yorum oluştur
            ProductReview review = ProductReview.builder()
                    .product(product)
                    .user(user)
                    .rating(rating)
                    .comment(comment)
                    .imageUrls(imageUrls)
                    .active(true)
                    .build();

            ProductReview saved = reviewRepository.save(review);
            log.info("Asenkron yorum oluşturma tamamlandı - reviewId: {}, productId: {}, userId: {}", 
                    saved.getId(), productId, user.getId());

        } catch (Exception e) {
            log.error("Asenkron yorum oluşturma hatası - productId: {}, userId: {}", 
                    productId, user != null ? user.getId() : null, e);
        }
    }
}


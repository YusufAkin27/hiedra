package eticaret.demo.recommendation;

import eticaret.demo.order.OrderItemRepository;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.product.ProductViewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Gelişmiş ürün öneri servisi
 * Çoklu algoritma desteği, caching, performans optimizasyonu
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductViewRepository productViewRepository;
    private final ProductReviewRepository productReviewRepository;

    private static final int MAX_RECOMMENDATIONS = 10;
    private static final int MIN_PURCHASE_COUNT = 2; // En az 2 kez birlikte alınmış olmalı
    private static final int MIN_RATING = 4; // Minimum rating (4+ yıldız)
    private static final int TREND_DAYS = 30; // Trend ürünler için son 30 gün

    /**
     * "Bu ürünü alanlar şunları da aldı" önerisi
     * Collaborative Filtering - Birlikte alınan ürünleri bulur
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "recommendations", key = "'frequently-bought-' + #productId")
    public List<Product> getFrequentlyBoughtTogether(Long productId) {
        try {
            // Bu ürünle birlikte alınan ürünleri bul
            List<Object[]> results = orderItemRepository.findFrequentlyBoughtTogether(productId);
            
            List<Product> recommendations = new ArrayList<>();
            
            for (Object[] result : results) {
                Long recommendedProductId = ((Number) result[0]).longValue();
                Long purchaseCount = ((Number) result[1]).longValue();
                
                // En az MIN_PURCHASE_COUNT kez birlikte alınmış olmalı
                if (purchaseCount >= MIN_PURCHASE_COUNT) {
                    Optional<Product> productOpt = productRepository.findById(recommendedProductId);
                    if (productOpt.isPresent()) {
                        Product product = productOpt.get();
                        // Stoğu biten ürünleri önerme
                        if (product.getQuantity() != null && product.getQuantity() > 0) {
                            recommendations.add(product);
                        }
                    }
                }
                
                // Maksimum öneri sayısına ulaşıldıysa dur
                if (recommendations.size() >= MAX_RECOMMENDATIONS) {
                    break;
                }
            }
            
            log.info("Ürün {} için {} adet 'birlikte alınan' önerisi bulundu", productId, recommendations.size());
            return recommendations;
        } catch (Exception e) {
            log.error("Birlikte alınan ürünler bulunurken hata: ", e);
            return Collections.emptyList();
        }
    }

    /**
     * Kullanıcının gezinme geçmişine göre öneriler
     * Content-Based Filtering - Benzer ürünleri önerir
     */
    @Transactional(readOnly = true)
    public List<Product> getRecommendationsBasedOnBrowsingHistory(Long userId, String ipAddress) {
        try {
            List<Long> viewedProductIds = new ArrayList<>();
            
            // Kullanıcı giriş yapmışsa user ID ile, yoksa IP ile
            if (userId != null) {
                viewedProductIds = productViewRepository.findViewedProductIdsByUserId(userId);
            } else if (ipAddress != null && !ipAddress.isEmpty()) {
                viewedProductIds = productViewRepository.findViewedProductIdsByIpAddress(ipAddress);
            }
            
            if (viewedProductIds.isEmpty()) {
                log.info("Görüntüleme geçmişi bulunamadı (userId: {}, ipAddress: {})", userId, ipAddress);
                return Collections.emptyList();
            }
            
            // Son 10 görüntülenen ürünü al
            List<Long> recentViewedIds = viewedProductIds.stream()
                    .limit(10)
                    .collect(Collectors.toList());
            
            // Bu ürünleri görüntüleyen kullanıcıların görüntülediği diğer ürünleri bul
            Map<Long, Integer> productScores = new HashMap<>();
            
            for (Long viewedProductId : recentViewedIds) {
                List<Object[]> similarProducts = productViewRepository.findSimilarProductsByUserViews(viewedProductId);
                
                for (Object[] result : similarProducts) {
                    Long similarProductId = ((Number) result[0]).longValue();
                    Integer userCount = ((Number) result[1]).intValue();
                    
                    // Zaten görüntülenen ürünleri önerme
                    if (!recentViewedIds.contains(similarProductId)) {
                        productScores.put(similarProductId, 
                                productScores.getOrDefault(similarProductId, 0) + userCount);
                    }
                }
            }
            
            // Skora göre sırala ve ürünleri getir
            List<Product> recommendations = productScores.entrySet().stream()
                    .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                    .limit(MAX_RECOMMENDATIONS)
                    .map(entry -> productRepository.findById(entry.getKey()))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .filter(product -> product.getQuantity() != null && product.getQuantity() > 0) // Stoğu biten ürünleri önerme
                    .collect(Collectors.toList());
            
            log.info("Kullanıcı {} için {} adet 'gezinme geçmişine göre' önerisi bulundu", 
                    userId != null ? userId : ipAddress, recommendations.size());
            return recommendations;
        } catch (Exception e) {
            log.error("Gezinme geçmişine göre öneriler bulunurken hata: ", e);
            return Collections.emptyList();
        }
    }

    /**
     * Kategori bazlı öneriler (fallback)
     * Aynı kategorideki diğer ürünleri önerir
     * Rating ve popülerlik bazlı sıralama
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "recommendations", key = "'category-' + #productId + '-' + #limit")
    public List<Product> getRecommendationsByCategory(Long productId, int limit) {
        try {
            Optional<Product> productOpt = productRepository.findByIdAndActiveTrue(productId);
            if (productOpt.isEmpty() || productOpt.get().getCategory() == null) {
                return Collections.emptyList();
            }
            
            Long categoryId = productOpt.get().getCategory().getId();
            
            // Aynı kategorideki aktif ürünleri getir
            List<Product> categoryProducts = productRepository.findByCategoryIdAndActiveTrue(categoryId);
            
            // Rating ve görüntüleme sayısına göre sırala
            List<Product> recommendations = categoryProducts.stream()
                    .filter(p -> !p.getId().equals(productId)) // Aynı ürünü önerme
                    .filter(p -> Boolean.TRUE.equals(p.getActive())) // Sadece aktif ürünler
                    .filter(p -> p.getQuantity() != null && p.getQuantity() > 0) // Stoğu biten ürünleri önerme
                    .sorted((p1, p2) -> {
                        // Önce rating'e göre, sonra görüntüleme sayısına göre
                        Double rating1 = productReviewRepository.calculateAverageRatingByProductId(p1.getId());
                        Double rating2 = productReviewRepository.calculateAverageRatingByProductId(p2.getId());
                        Long views1 = productViewRepository.countByProductId(p1.getId());
                        Long views2 = productViewRepository.countByProductId(p2.getId());
                        
                        int ratingCompare = Double.compare(
                                rating2 != null ? rating2 : 0.0,
                                rating1 != null ? rating1 : 0.0
                        );
                        if (ratingCompare != 0) return ratingCompare;
                        
                        return Long.compare(
                                views2 != null ? views2 : 0L,
                                views1 != null ? views1 : 0L
                        );
                    })
                    .limit(limit)
                    .collect(Collectors.toList());
            
            log.info("Ürün {} için kategori bazlı {} adet öneri bulundu", productId, recommendations.size());
            return recommendations;
        } catch (Exception e) {
            log.error("Kategori bazlı öneriler bulunurken hata: ", e);
            return Collections.emptyList();
        }
    }
    
    /**
     * Rating bazlı öneriler
     * Yüksek puanlı benzer ürünleri önerir
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "recommendations", key = "'rating-' + #productId + '-' + #limit")
    public List<Product> getRecommendationsByRating(Long productId, int limit) {
        try {
            Optional<Product> productOpt = productRepository.findByIdAndActiveTrue(productId);
            if (productOpt.isEmpty()) {
                return Collections.emptyList();
            }
            
            Product product = productOpt.get();
            Double productRating = productReviewRepository.calculateAverageRatingByProductId(productId);
            
            if (productRating == null || productRating < MIN_RATING) {
                return Collections.emptyList();
            }
            
            // Aynı kategorideki yüksek puanlı ürünleri getir
            Long categoryId = product.getCategory() != null ? product.getCategory().getId() : null;
            
            List<Product> allProducts = productRepository.findByActiveTrue();
            
            List<Product> recommendations = allProducts.stream()
                    .filter(p -> !p.getId().equals(productId))
                    .filter(p -> Boolean.TRUE.equals(p.getActive()))
                    .filter(p -> p.getQuantity() != null && p.getQuantity() > 0)
                    .filter(p -> {
                        // Aynı kategori veya benzer rating
                        boolean sameCategory = categoryId != null && 
                                p.getCategory() != null && 
                                p.getCategory().getId().equals(categoryId);
                        Double pRating = productReviewRepository.calculateAverageRatingByProductId(p.getId());
                        boolean similarRating = pRating != null && 
                                pRating >= MIN_RATING && 
                                Math.abs(pRating - productRating) <= 1.0;
                        return sameCategory || similarRating;
                    })
                    .sorted((p1, p2) -> {
                        Double r1 = productReviewRepository.calculateAverageRatingByProductId(p1.getId());
                        Double r2 = productReviewRepository.calculateAverageRatingByProductId(p2.getId());
                        return Double.compare(
                                r2 != null ? r2 : 0.0,
                                r1 != null ? r1 : 0.0
                        );
                    })
                    .limit(limit)
                    .collect(Collectors.toList());
            
            log.info("Ürün {} için rating bazlı {} adet öneri bulundu", productId, recommendations.size());
            return recommendations;
        } catch (Exception e) {
            log.error("Rating bazlı öneriler bulunurken hata: ", e);
            return Collections.emptyList();
        }
    }
    
    /**
     * Trend ürünler (son 30 günde popüler olan)
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "recommendations", key = "'trend-' + #limit")
    public List<Product> getTrendingProducts(int limit) {
        try {
            LocalDateTime since = LocalDateTime.now().minusDays(TREND_DAYS);
            
            // Son 30 günde en çok görüntülenen ürünler
            List<Object[]> mostViewed = productViewRepository.findMostViewedProducts();
            
            List<Product> trending = mostViewed.stream()
                    .map(result -> {
                        Long productId = ((Number) result[0]).longValue();
                        return productRepository.findByIdAndActiveTrue(productId);
                    })
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .filter(p -> Boolean.TRUE.equals(p.getActive()))
                    .filter(p -> p.getQuantity() != null && p.getQuantity() > 0)
                    .filter(p -> {
                        // Son 30 günde görüntülenmiş olmalı
                        Long recentViews = productViewRepository.countByProductIdAndDateRange(
                                p.getId(), since, LocalDateTime.now());
                        return recentViews != null && recentViews > 0;
                    })
                    .limit(limit)
                    .collect(Collectors.toList());
            
            log.info("{} adet trend ürün bulundu", trending.size());
            return trending;
        } catch (Exception e) {
            log.error("Trend ürünler bulunurken hata: ", e);
            return Collections.emptyList();
        }
    }
    
    /**
     * Benzer ürünler (özellik bazlı - renk, materyal, kullanım alanı)
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "recommendations", key = "'similar-' + #productId + '-' + #limit")
    public List<Product> getSimilarProducts(Long productId, int limit) {
        try {
            Optional<Product> productOpt = productRepository.findByIdAndActiveTrue(productId);
            if (productOpt.isEmpty()) {
                return Collections.emptyList();
            }
            
            Product product = productOpt.get();
            
            // Benzer özelliklere sahip ürünleri bul
            List<Product> similar = productRepository.filterProducts(
                    product.getColor(),
                    product.getMaterial(),
                    product.getUsageArea(),
                    product.getMountingType()
            );
            
            List<Product> recommendations = similar.stream()
                    .filter(p -> !p.getId().equals(productId))
                    .filter(p -> Boolean.TRUE.equals(p.getActive()))
                    .filter(p -> p.getQuantity() != null && p.getQuantity() > 0)
                    .sorted((p1, p2) -> {
                        // Fiyat benzerliğine göre sırala
                        BigDecimal price1 = p1.getPrice() != null ? p1.getPrice() : BigDecimal.ZERO;
                        BigDecimal price2 = p2.getPrice() != null ? p2.getPrice() : BigDecimal.ZERO;
                        BigDecimal productPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
                        
                        BigDecimal diff1 = price1.subtract(productPrice).abs();
                        BigDecimal diff2 = price2.subtract(productPrice).abs();
                        
                        return diff1.compareTo(diff2);
                    })
                    .limit(limit)
                    .collect(Collectors.toList());
            
            log.info("Ürün {} için {} adet benzer ürün bulundu", productId, recommendations.size());
            return recommendations;
        } catch (Exception e) {
            log.error("Benzer ürünler bulunurken hata: ", e);
            return Collections.emptyList();
        }
    }

    /**
     * Karma öneri sistemi (gelişmiş)
     * Farklı yöntemlerden gelen önerileri ağırlıklı olarak birleştirir
     */
    @Transactional(readOnly = true)
    public List<Product> getMixedRecommendations(Long productId, Long userId, String ipAddress) {
        Map<Product, Double> productScores = new HashMap<>();
        
        // 1. Birlikte alınan ürünler (ağırlık: 3.0)
        List<Product> frequentlyBought = getFrequentlyBoughtTogether(productId);
        for (Product p : frequentlyBought) {
            productScores.put(p, productScores.getOrDefault(p, 0.0) + 3.0);
        }
        
        // 2. Rating bazlı (ağırlık: 2.5)
        List<Product> ratingBased = getRecommendationsByRating(productId, MAX_RECOMMENDATIONS);
        for (Product p : ratingBased) {
            productScores.put(p, productScores.getOrDefault(p, 0.0) + 2.5);
        }
        
        // 3. Gezinme geçmişine göre (ağırlık: 2.0)
        List<Product> browsingBased = getRecommendationsBasedOnBrowsingHistory(userId, ipAddress);
        for (Product p : browsingBased) {
            productScores.put(p, productScores.getOrDefault(p, 0.0) + 2.0);
        }
        
        // 4. Benzer ürünler (ağırlık: 1.5)
        List<Product> similar = getSimilarProducts(productId, MAX_RECOMMENDATIONS);
        for (Product p : similar) {
            productScores.put(p, productScores.getOrDefault(p, 0.0) + 1.5);
        }
        
        // 5. Eğer yeterli öneri yoksa kategori bazlı ekle (ağırlık: 1.0)
        if (productScores.size() < MAX_RECOMMENDATIONS) {
            int remaining = MAX_RECOMMENDATIONS - productScores.size();
            List<Product> categoryBased = getRecommendationsByCategory(productId, remaining);
            for (Product p : categoryBased) {
                productScores.put(p, productScores.getOrDefault(p, 0.0) + 1.0);
            }
        }
        
        // Skora göre sırala ve en iyi önerileri döndür
        return productScores.entrySet().stream()
                .sorted(Map.Entry.<Product, Double>comparingByValue().reversed())
                .limit(MAX_RECOMMENDATIONS)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
}


package eticaret.demo.recommendation;

import eticaret.demo.auth.AppUser;
import eticaret.demo.product.Product;
import eticaret.demo.common.response.DataResponseMessage;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * "Bu ürünü alanlar şunları da aldı" önerisi
     * GET /api/recommendations/frequently-bought-together/{productId}
     */
    @GetMapping("/frequently-bought-together/{productId}")
    public ResponseEntity<DataResponseMessage<List<Product>>> getFrequentlyBoughtTogether(
            @PathVariable Long productId,
            HttpServletRequest request) {
        try {
            List<Product> recommendations = recommendationService.getFrequentlyBoughtTogether(productId);
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Öneriler başarıyla getirildi", recommendations));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Öneriler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının gezinme geçmişine göre öneriler
     * GET /api/recommendations/browsing-history
     */
    @GetMapping("/browsing-history")
    public ResponseEntity<DataResponseMessage<List<Product>>> getRecommendationsBasedOnBrowsingHistory(
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "ipAddress", required = false) String ipAddress,
            HttpServletRequest request) {
        try {
            // Eğer userId verilmemişse, authentication'dan al
            if (userId == null) {
                userId = getCurrentUserId();
            }
            
            // Eğer ipAddress verilmemişse, request'ten al
            if (ipAddress == null || ipAddress.isEmpty()) {
                ipAddress = getClientIpAddress(request);
            }
            
            List<Product> recommendations = recommendationService
                    .getRecommendationsBasedOnBrowsingHistory(userId, ipAddress);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Öneriler başarıyla getirildi", recommendations));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Öneriler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kategori bazlı öneriler
     * GET /api/recommendations/category/{productId}
     */
    @GetMapping("/category/{productId}")
    public ResponseEntity<DataResponseMessage<List<Product>>> getRecommendationsByCategory(
            @PathVariable Long productId,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            HttpServletRequest request) {
        try {
            List<Product> recommendations = recommendationService
                    .getRecommendationsByCategory(productId, limit);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Öneriler başarıyla getirildi", recommendations));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Öneriler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Rating bazlı öneriler
     * GET /api/recommendations/rating/{productId}
     */
    @GetMapping("/rating/{productId}")
    public ResponseEntity<DataResponseMessage<List<Product>>> getRecommendationsByRating(
            @PathVariable Long productId,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            HttpServletRequest request) {
        try {
            List<Product> recommendations = recommendationService
                    .getRecommendationsByRating(productId, limit);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Rating bazlı öneriler başarıyla getirildi", recommendations));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Öneriler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Trend ürünler
     * GET /api/recommendations/trending
     */
    @GetMapping("/trending")
    public ResponseEntity<DataResponseMessage<List<Product>>> getTrendingProducts(
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            HttpServletRequest request) {
        try {
            List<Product> recommendations = recommendationService.getTrendingProducts(limit);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Trend ürünler başarıyla getirildi", recommendations));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Trend ürünler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Benzer ürünler (özellik bazlı)
     * GET /api/recommendations/similar/{productId}
     */
    @GetMapping("/similar/{productId}")
    public ResponseEntity<DataResponseMessage<List<Product>>> getSimilarProducts(
            @PathVariable Long productId,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            HttpServletRequest request) {
        try {
            List<Product> recommendations = recommendationService.getSimilarProducts(productId, limit);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Benzer ürünler başarıyla getirildi", recommendations));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Benzer ürünler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Karma öneri sistemi (tüm yöntemleri birleştirir)
     * GET /api/recommendations/mixed/{productId}
     */
    @GetMapping("/mixed/{productId}")
    public ResponseEntity<DataResponseMessage<List<Product>>> getMixedRecommendations(
            @PathVariable Long productId,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "ipAddress", required = false) String ipAddress,
            HttpServletRequest request) {
        try {
            // Eğer userId verilmemişse, authentication'dan al
            if (userId == null) {
                userId = getCurrentUserId();
            }
            
            // Eğer ipAddress verilmemişse, request'ten al
            if (ipAddress == null || ipAddress.isEmpty()) {
                ipAddress = getClientIpAddress(request);
            }
            
            List<Product> recommendations = recommendationService
                    .getMixedRecommendations(productId, userId, ipAddress);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Öneriler başarıyla getirildi", recommendations));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Öneriler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Mevcut kullanıcı ID'sini al
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUser) {
            AppUser user = (AppUser) authentication.getPrincipal();
            return user.getId();
        }
        return null;
    }

    /**
     * Client IP adresini al
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        String xClientIp = request.getHeader("X-Client-IP");
        if (xClientIp != null && !xClientIp.isEmpty() && !"unknown".equalsIgnoreCase(xClientIp)) {
            return xClientIp;
        }
        
        return request.getRemoteAddr();
    }
}


package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.product.ProductView;
import eticaret.demo.product.ProductViewRepository;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.response.DataResponseMessage;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Admin ürün görüntüleme istatistikleri endpoint'leri
 * Tüm işlemler admin yetkisi gerektirir
 */
@RestController
@RequestMapping("/api/admin/product-views")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductViewController {

    private final ProductViewRepository productViewRepository;
    private final ProductRepository productRepository;

    /**
     * Tüm görüntülemeleri listele (admin)
     * GET /api/admin/product-views
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<ProductView>>> getAllViews(
            @RequestParam(value = "productId", required = false) Long productId,
            @RequestParam(value = "limit", defaultValue = "100") int limit
    ) {
        List<ProductView> views;
        if (productId != null) {
            views = productViewRepository.findByProductId(productId)
                    .stream()
                    .limit(limit)
                    .collect(Collectors.toList());
        } else {
            LocalDateTime since = LocalDateTime.now().minusDays(30); // Son 30 gün
            views = productViewRepository.findRecentViews(since)
                    .stream()
                    .limit(limit)
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(DataResponseMessage.success("Görüntülemeler başarıyla getirildi", views));
    }

    /**
     * Ürün görüntüleme istatistikleri (admin)
     * GET /api/admin/product-views/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getViewStats(
            @RequestParam(value = "productId", required = false) Long productId
    ) {
        Map<String, Object> stats = new HashMap<>();
        
        if (productId != null) {
            // Belirli bir ürün için istatistikler
            Long totalViews = productViewRepository.countByProductId(productId);
            Long viewsLast24Hours = productViewRepository.countByProductIdAndDateRange(
                productId, 
                LocalDateTime.now().minusHours(24), 
                LocalDateTime.now()
            );
            Long viewsLast7Days = productViewRepository.countByProductIdAndDateRange(
                productId, 
                LocalDateTime.now().minusDays(7), 
                LocalDateTime.now()
            );
            Long viewsLast30Days = productViewRepository.countByProductIdAndDateRange(
                productId, 
                LocalDateTime.now().minusDays(30), 
                LocalDateTime.now()
            );
            
            stats.put("productId", productId);
            stats.put("totalViews", totalViews);
            stats.put("viewsLast24Hours", viewsLast24Hours);
            stats.put("viewsLast7Days", viewsLast7Days);
            stats.put("viewsLast30Days", viewsLast30Days);
        } else {
            // Tüm ürünler için genel istatistikler
            List<Object[]> mostViewed = productViewRepository.findMostViewedProducts();
            
            // En çok görüntülenen 10 ürün
            List<Map<String, Object>> topProducts = mostViewed.stream()
                    .limit(10)
                    .map(row -> {
                        Map<String, Object> productStats = new HashMap<>();
                        productStats.put("productId", row[0]);
                        productStats.put("viewCount", row[1]);
                        // Ürün bilgilerini al
                        productRepository.findById((Long) row[0]).ifPresent(product -> {
                            productStats.put("productName", product.getName());
                        });
                        return productStats;
                    })
                    .collect(Collectors.toList());
            
            stats.put("topViewedProducts", topProducts);
            stats.put("totalUniqueProducts", mostViewed.size());
        }
        
        return ResponseEntity.ok(DataResponseMessage.success("İstatistikler başarıyla getirildi", stats));
    }

    /**
     * Belirli bir ürünün görüntüleme geçmişi (admin)
     * GET /api/admin/product-views/product/{productId}
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<DataResponseMessage<List<ProductView>>> getProductViews(
            @PathVariable Long productId,
            @RequestParam(value = "limit", defaultValue = "50") int limit
    ) {
        List<ProductView> views = productViewRepository.findByProductId(productId)
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
        return ResponseEntity.ok(DataResponseMessage.success("Görüntülemeler başarıyla getirildi", views));
    }
}


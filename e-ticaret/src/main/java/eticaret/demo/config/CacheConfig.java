package eticaret.demo.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Cache Configuration - In-memory cache
 * Performans için önemli verileri cache'ler
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * In-memory cache manager
     * Product listesi, category listesi gibi sık kullanılan verileri cache'ler
     */
    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        // Cache isimleri
        cacheManager.setCacheNames(java.util.Arrays.asList(
                "products",           // Ürün listesi
                "categories",          // Kategori listesi
                "productDetails",      // Ürün detayları
                "productReviews",      // Ürün yorumları
                "imageUrls",           // Görsel URL'leri
                "recommendations"      // Ürün önerileri
        ));
        cacheManager.setAllowNullValues(false);
        return cacheManager;
    }
}


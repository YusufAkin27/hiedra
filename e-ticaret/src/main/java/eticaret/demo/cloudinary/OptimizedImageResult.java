package eticaret.demo.cloudinary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optimize edilmiş görsel yükleme sonucu
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptimizedImageResult {
    /**
     * Optimize edilmiş görsel URL'i (WebP formatında, CDN'den)
     * Bu URL kullanıcılara gösterilir
     */
    private String optimizedUrl;
    
    /**
     * Orijinal görsel URL'i (arşiv klasöründe)
     * Yedekleme ve geri dönüş için saklanır
     */
    private String originalUrl;
    
    /**
     * Public ID (Cloudinary'de görseli yönetmek için)
     */
    private String publicId;
    
    /**
     * Optimize edilmiş görsel boyutu (bytes)
     */
    private Long optimizedSize;
    
    /**
     * Orijinal görsel boyutu (bytes)
     */
    private Long originalSize;
    
    /**
     * Optimizasyon oranı (yüzde)
     */
    private Double compressionRatio;
    
    /**
     * Farklı boyutlarda versiyonlar (responsive images için)
     */
    private ImageVariants variants;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageVariants {
        private String thumbnail;      // 400x400
        private String small;          // 800x800
        private String medium;         // 1200x1200
        private String large;          // 1920x1920
        private String xlarge;         // 2560x2560
    }
}


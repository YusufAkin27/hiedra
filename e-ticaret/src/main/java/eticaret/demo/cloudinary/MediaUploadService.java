package eticaret.demo.cloudinary;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import javax.imageio.ImageIO;
import java.awt.Image;
import java.awt.image.BufferedImage;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings({"rawtypes", "unchecked"})
public class MediaUploadService {

    private final Cloudinary cloudinary;

    private static final long MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB - Üst sınır
    private static final long MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
    private static final long CLOUDINARY_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10 MB - Cloudinary free plan limit
    
    // URL cache (publicId -> OptimizedImageResult)
    private final Map<String, OptimizedImageResult> urlCache = new ConcurrentHashMap<>();
    
    // URL transformation cache (fullUrl -> transformedUrl) - görüntüleme için
    private final Map<String, String> transformedUrlCache = new ConcurrentHashMap<>();

    /**
     * Medya dosyasını otomatik olarak algılayıp yükler (resim veya video)
     */
    public String uploadAndOptimizeMedia(MultipartFile file) throws IOException {
        String contentType = file.getContentType();

        if (contentType == null) {
            throw new RuntimeException("Dosya formatı belirlenemedi");
        }

        contentType = contentType.toLowerCase();

        if (contentType.startsWith("image/")) {
            return uploadAndOptimizeImage(file);
        } else if (contentType.startsWith("video/")) {
            return uploadAndOptimizeVideo(file);
        } else {
            String filename = file.getOriginalFilename();
            if (filename != null) {
                filename = filename.toLowerCase();

                // Video uzantıları
                if (filename.endsWith(".mp4") || filename.endsWith(".mov") ||
                        filename.endsWith(".avi") || filename.endsWith(".mkv") ||
                        filename.endsWith(".webm") || filename.endsWith(".3gp")) {
                    return uploadAndOptimizeVideo(file);
                }
                // Resim uzantıları
                else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg") ||
                        filename.endsWith(".png") || filename.endsWith(".gif") ||
                        filename.endsWith(".heic") || filename.endsWith(".heif") ||
                        filename.endsWith(".webp") || filename.endsWith(".bmp")) {
                    return uploadAndOptimizeImage(file);
                }
            }
            throw new RuntimeException("Sadece resim ve video dosyaları yüklenebilir");
        }
    }

    /**
     * Perde ürün görsellerini optimize edilmiş şekilde yükler
     * WebP formatına dönüştürür, CDN ve caching kullanır
     * 
     * @deprecated Yeni optimize edilmiş yükleme için uploadAndOptimizeProductImage kullanın
     */
    @Deprecated
    public String uploadAndOptimizeImage(MultipartFile photo) throws IOException {
        OptimizedImageResult result = uploadAndOptimizeProductImage(photo);
        return result.getOptimizedUrl();
    }
    
    /**
     * CDN URL'i oluşturur (caching ve optimizasyon ile)
     * WebP formatına dönüştürür, kaliteyi koruyarak sıkıştırır
     * Cache kullanır - aynı parametreler için tekrar istek atmaz
     * 
     * @param publicId Cloudinary public ID veya full URL
     * @param width Genişlik (opsiyonel)
     * @param height Yükseklik (opsiyonel)
     * @return Optimize edilmiş CDN URL'i (WebP, cached)
     */
    public String generateCdnUrl(String publicId, Integer width, Integer height) {
        // Cache key oluştur
        String cacheKey = publicId + "_" + (width != null ? width : "auto") + "_" + (height != null ? height : "auto");
        
        // Cache'den kontrol et
        String cachedUrl = transformedUrlCache.get(cacheKey);
        if (cachedUrl != null) {
            log.debug("CDN URL cache'den döndü: {}", cacheKey);
            return cachedUrl;
        }
        
        // Public ID'yi URL'den çıkar (eğer full URL ise)
        String actualPublicId = extractPublicIdFromUrl(publicId);
        
        // Transformation oluştur - kaliteyi koruyarak WebP'ye dönüştür
        Transformation transformation = new Transformation()
                .quality("auto:good") // Daha yüksek kalite (auto:best çok agresif)
                .fetchFormat("webp") // WebP formatına dönüştür
                .flags("progressive") // Progressive JPEG/WebP (yavaş bağlantılar için)
                .dpr("auto"); // Device Pixel Ratio - retina ekranlar için
        
        if (width != null) {
            transformation.width(width);
        }
        if (height != null) {
            transformation.height(height);
        }
        if (width != null || height != null) {
            transformation.crop("limit"); // Aspect ratio koru
        }
        
        String url = cloudinary.url()
                .transformation(transformation)
                .secure(true) // HTTPS kullan
                .generate(actualPublicId);
        
        // Cache'e ekle
        transformedUrlCache.put(cacheKey, url);
        log.debug("CDN URL oluşturuldu ve cache'e eklendi: {}", cacheKey);
        
        return url;
    }
    
    /**
     * Full Cloudinary URL'den public ID'yi çıkarır
     * 
     * @param url Cloudinary URL'i
     * @return Public ID
     */
    private String extractPublicIdFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return url;
        }
        
        // Eğer zaten public ID ise (folder/name formatında), olduğu gibi döndür
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return url;
        }
        
        try {
            // Cloudinary URL formatı: https://res.cloudinary.com/{cloud_name}/image/upload/{transformation}/{public_id}.{format}
            // Public ID'yi çıkarmak için URL'i parse et
            String[] parts = url.split("/upload/");
            if (parts.length > 1) {
                String afterUpload = parts[1];
                // Transformation'ları ve format'ı temizle
                // Son noktadan sonraki kısmı (format) kaldır
                int lastDot = afterUpload.lastIndexOf('.');
                if (lastDot > 0) {
                    afterUpload = afterUpload.substring(0, lastDot);
                }
                // İlk '/' öncesi transformation'ları kaldır (eğer varsa)
                // Basit yaklaşım: son '/' sonrasını al
                int lastSlash = afterUpload.lastIndexOf('/');
                if (lastSlash >= 0) {
                    afterUpload = afterUpload.substring(lastSlash + 1);
                }
                return afterUpload;
            }
        } catch (Exception e) {
            log.warn("Public ID çıkarılamadı, URL olduğu gibi kullanılıyor: {}", url);
        }
        
        // Fallback: URL'i olduğu gibi döndür
        return url;
    }
    
    /**
     * Görsel URL'ini optimize edilmiş hale getirir (görüntüleme için)
     * WebP formatına dönüştürür, kaliteyi koruyarak sıkıştırır
     * Cache kullanır - sürekli istek atmaz
     * 
     * @param imageUrl Orijinal görsel URL'i (Cloudinary URL'i veya public ID)
     * @param width Genişlik (opsiyonel, null ise orijinal boyut)
     * @param height Yükseklik (opsiyonel, null ise orijinal boyut)
     * @return Optimize edilmiş görsel URL'i (WebP, cached)
     */
    public String getOptimizedImageUrl(String imageUrl, Integer width, Integer height) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return imageUrl;
        }
        
        // Cache key oluştur
        String cacheKey = "img_" + imageUrl + "_" + (width != null ? width : "auto") + "_" + (height != null ? height : "auto");
        
        // Cache'den kontrol et
        String cachedUrl = transformedUrlCache.get(cacheKey);
        if (cachedUrl != null) {
            log.debug("Optimize edilmiş görsel URL cache'den döndü: {}", cacheKey);
            return cachedUrl;
        }
        
        // Eğer zaten Cloudinary URL'i ise ve transformation içermiyorsa, transformation ekle
        if (imageUrl.contains("res.cloudinary.com")) {
            // Public ID'yi çıkar
            String publicId = extractPublicIdFromUrl(imageUrl);
            
            // Optimize edilmiş URL oluştur
            String optimizedUrl = generateCdnUrl(publicId, width, height);
            
            // Cache'e ekle
            transformedUrlCache.put(cacheKey, optimizedUrl);
            log.debug("Görsel URL optimize edildi ve cache'e eklendi: {}", cacheKey);
            
            return optimizedUrl;
        }
        
        // Cloudinary URL'i değilse, olduğu gibi döndür
        return imageUrl;
    }
    

    public OptimizedImageResult.ImageVariants getResponsiveImageUrls(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return OptimizedImageResult.ImageVariants.builder().build();
        }
        
        return OptimizedImageResult.ImageVariants.builder()
                .thumbnail(getOptimizedImageUrl(imageUrl, 400, 400))
                .small(getOptimizedImageUrl(imageUrl, 800, 800))
                .medium(getOptimizedImageUrl(imageUrl, 1200, 1200))
                .large(getOptimizedImageUrl(imageUrl, 1920, 1920))
                .xlarge(getOptimizedImageUrl(imageUrl, 2560, 2560))
                .build();
    }
    
    /**
     * Görseli CDN'den siler (cache temizleme için)
     * 
     * @param publicId Cloudinary public ID
     */
    public void invalidateCdnCache(String publicId) {
        try {
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "invalidate", true
            ));
            if (result != null && "ok".equals(result.get("result"))) {
            log.info("CDN cache temizlendi: {}", publicId);
            }
        } catch (Exception e) {
            log.error("CDN cache temizlenirken hata: {}", e.getMessage());
        }
    }

    /**
     * Görseli optimize edilmiş şekilde yükler (byte array ile)
     * - Orijinal dosyayı arşiv klasörüne kaydeder
     * - WebP formatına dönüştürür (kaliteyi koruyarak)
     * - CDN ve caching kullanır
     * - Farklı boyutlarda responsive versiyonlar oluşturur
     * 
     * @param imageBytes Görsel byte array'i
     * @param originalFilename Orijinal dosya adı
     * @param originalSize Orijinal dosya boyutu
     * @return Optimize edilmiş görsel sonucu
     */
    public OptimizedImageResult uploadAndOptimizeProductImage(byte[] imageBytes, String originalFilename, long originalSize) throws IOException {
        if (originalSize > MAX_IMAGE_SIZE) {
            throw new RuntimeException("Resim boyutu çok büyük! Maksimum: 25 MB");
        }

        boolean isLargeFile = originalSize > CLOUDINARY_UPLOAD_LIMIT;
        
        // 10MB üzeri dosyalar için cache kontrolü
        String cacheKey = originalFilename + "_" + originalSize;
        if (isLargeFile) {
            OptimizedImageResult cachedResult = urlCache.get(cacheKey);
            if (cachedResult != null) {
                log.info("Büyük dosya cache'den bulundu: {} ({} MB)", originalFilename, originalSize / (1024.0 * 1024.0));
                return cachedResult;
            }
        }
        
        log.info("Görsel optimizasyonu başlatılıyor: {} ({} MB) - Büyük dosya: {}", 
                originalFilename, originalSize / (1024.0 * 1024.0), isLargeFile);

        String originalUrl = null;

        // 1. Orijinal dosyayı arşiv klasörüne kaydet (sadece 10 MB'dan küçükse)
        // Büyük dosyalar için Cloudinary limiti nedeniyle önce optimize edilmiş versiyonu yükleyeceğiz
        if (!isLargeFile) {
            try {
                Map<String, Object> archiveParams = ObjectUtils.asMap(
                        "folder", "perde_urunleri/archive/original",
                        "resource_type", "image",
                        "use_filename", true,
                        "unique_filename", true,
                        "overwrite", false,
                        "invalidate", true,
                        "quality", "auto:good",
                        "format", "auto"
                );

                Map archiveResult = cloudinary.uploader().upload(imageBytes, archiveParams);
                originalUrl = (String) archiveResult.get("secure_url");
                
                log.info("Orijinal görsel arşivlendi: {}", originalUrl);
            } catch (Exception e) {
                log.warn("Orijinal görsel arşivlenirken hata (devam ediliyor): {}", e.getMessage());
            }
        } else {
            log.info("Dosya 10 MB'dan büyük, orijinal arşivleme atlandı (Cloudinary limiti). Optimize edilmiş versiyon yüklenecek.");
        }

        // 2. Optimize edilmiş WebP versiyonunu oluştur (farklı boyutlarda)
        // Kaliteyi koruyarak sıkıştırma, WebP formatına dönüştürme
        List<Transformation> eagerTransformations = new ArrayList<>();
        
        // Thumbnail (400x400) - Liste görünümleri için
        eagerTransformations.add(new Transformation()
                .width(400)
                .height(400)
                .crop("limit")
                .quality("auto:good") // Daha yüksek kalite
                .fetchFormat("webp") // WebP formatına dönüştür
                .flags("progressive") // Progressive loading
                .dpr("auto")); // Retina ekranlar için
        
        // Small (800x800) - Mobil için
        eagerTransformations.add(new Transformation()
                .width(800)
                .height(800)
                .crop("limit")
                .quality("auto:good")
                .fetchFormat("webp")
                .flags("progressive")
                .dpr("auto"));
        
        // Medium (1200x1200) - Tablet için
        eagerTransformations.add(new Transformation()
                .width(1200)
                .height(1200)
                .crop("limit")
                .quality("auto:good")
                .fetchFormat("webp")
                .flags("progressive")
                .dpr("auto"));
        
        // Large (1920x1920) - Desktop için
        eagerTransformations.add(new Transformation()
                .width(1920)
                .height(1920)
                .crop("limit")
                .quality("auto:good")
                .fetchFormat("webp")
                .flags("progressive")
                .dpr("auto"));
        
        // XLarge (2560x2560) - Retina/4K ekranlar için
        eagerTransformations.add(new Transformation()
                .width(2560)
                .height(2560)
                .crop("limit")
                .quality("auto:good")
                .fetchFormat("webp")
                .flags("progressive")
                .dpr("auto"));

        // 2. Optimize edilmiş ana görsel (WebP, yüksek kalite)
        // Büyük dosyalar için önce küçük bir versiyon yükleyip, sonra eager transformations ile büyük versiyonlar oluşturuyoruz
        Map<String, Object> optimizedParams = ObjectUtils.asMap(
                "folder", "perde_urunleri/optimized",
                "resource_type", "image",
                "use_filename", true,
                "unique_filename", true,
                "overwrite", false,
                "invalidate", true,
                "eager", eagerTransformations,
                "eager_async", false
        );

        // Büyük dosyalar için (10 MB+) önce küçük bir versiyon yükle, sonra eager transformations ile büyük versiyonlar oluştur
        if (isLargeFile) {
            // Büyük dosyalar için önce optimize edilmiş versiyon yükle (yüksek kalite, WebP)
            optimizedParams.put("transformation", new Transformation()
                    .width(1920)
                    .height(1920)
                    .crop("limit")
                    .quality("auto:good") // Daha yüksek kalite (auto:best çok agresif)
                    .fetchFormat("webp") // WebP formatına dönüştür
                    .flags("progressive") // Progressive loading
                    .dpr("auto")); // Retina ekranlar için
            
            log.info("Büyük dosya için optimize edilmiş versiyon yükleniyor (1920x1920, WebP, auto:good)...");
        } else {
            // Küçük dosyalar için normal optimizasyon (yüksek kalite, WebP)
            optimizedParams.put("quality", "auto:good");
            optimizedParams.put("fetch_format", "webp");
            optimizedParams.put("transformation", new Transformation()
                    .width(1920)
                    .height(1920)
                    .crop("limit")
                    .quality("auto:good")
                    .fetchFormat("webp")
                    .flags("progressive")
                    .dpr("auto"));
        }

        // Büyük dosyalar için önce Java tarafında resize et (yüksek kalite - %75 sıkıştırma hedefi)
        byte[] processedImageBytes = imageBytes;
        if (isLargeFile) {
            try {
                // Hedef: %75 sıkıştırma (20 MB -> 5 MB)
                // Kaliteyi yüksek tutarak (0.90) boyutu düşürmek için resize yapıyoruz
                log.info("Büyük dosya tespit edildi, Java tarafında ön işleme yapılıyor (1920x1920, kalite: 0.90 - yüksek kalite, %75 sıkıştırma hedefi)...");
                processedImageBytes = resizeImageBeforeUpload(imageBytes, 1920, 1920, 0.90f);
                log.info("Ön işleme tamamlandı. Orijinal: {} MB, İşlenmiş: {} MB", 
                        originalSize / (1024.0 * 1024.0),
                        processedImageBytes.length / (1024.0 * 1024.0));
            } catch (Exception e) {
                log.warn("Java tarafında resize başarısız, orijinal dosya ile devam ediliyor: {}", e.getMessage());
                processedImageBytes = imageBytes;
            }
        }

        Map optimizedResult = null;
        int retryCount = 0;
        int maxRetries = 3;
        Exception lastException = null;
        
        while (retryCount <= maxRetries) {
            try {
                optimizedResult = cloudinary.uploader().upload(processedImageBytes, optimizedParams);
                break; // Başarılı, döngüden çık
            } catch (Exception e) {
                lastException = e;
                if (isLargeFile && e.getMessage() != null && e.getMessage().contains("File size too large")) {
                    retryCount++;
                    if (retryCount > maxRetries) {
                        throw new RuntimeException("Dosya çok büyük! 10 MB limitini aşan dosyalar için daha küçük bir görsel yükleyin. (Orijinal: " + 
                                String.format("%.2f", originalSize / (1024.0 * 1024.0)) + " MB)", e);
                    }
                    
                    // Her denemede daha agresif optimizasyon - Java tarafında resize (kaliteyi mümkün olduğunca koru)
                    // %75 sıkıştırma hedefi için kaliteyi yüksek tutuyoruz
                    int[] widths = {1600, 1200, 1000};
                    float[] qualities = {0.88f, 0.85f, 0.82f}; // Kaliteyi yüksek tut (%75 sıkıştırma için)
                    
                    int width = retryCount <= widths.length ? widths[retryCount - 1] : 1000;
                    float quality = retryCount <= qualities.length ? qualities[retryCount - 1] : 0.82f;
                    
                    log.warn("Deneme {} başarısız, Java tarafında resize yapılıyor ({}x{}, kalite: {} - yüksek kalite, %75 sıkıştırma hedefi)...", 
                            retryCount, width, width, quality);
                    
                    try {
                        processedImageBytes = resizeImageBeforeUpload(imageBytes, width, width, quality);
                        log.info("Resize tamamlandı. Yeni boyut: {} MB", 
                                processedImageBytes.length / (1024.0 * 1024.0));
                    } catch (Exception resizeEx) {
                        log.error("Resize hatası: {}", resizeEx.getMessage());
                        throw new RuntimeException("Görsel işlenemedi: " + resizeEx.getMessage(), resizeEx);
                    }
                    
                    optimizedParams.put("transformation", new Transformation()
                            .width(width)
                            .height(width)
                            .crop("limit")
                            .quality("auto:good") // Daha yüksek kalite
                            .fetchFormat("webp") // WebP formatına dönüştür
                            .flags("progressive")
                            .dpr("auto"));
                    
                    // Eager transformation'ları da küçült (2. denemeden sonra, ama kaliteyi koru)
                    if (retryCount > 1) {
                        List<Transformation> smallerEagerTransformations = new ArrayList<>();
                        int[] eagerWidths = {400, 600, 800, 1000, 1200};
                        for (int i = 0; i < 5 && i < eagerWidths.length; i++) {
                            smallerEagerTransformations.add(new Transformation()
                                    .width(eagerWidths[i])
                                    .height(eagerWidths[i])
                                    .crop("limit")
                                    .quality("auto:good") // Daha yüksek kalite
                                    .fetchFormat("webp") // WebP formatına dönüştür
                                    .flags("progressive")
                                    .dpr("auto"));
                        }
                        optimizedParams.put("eager", smallerEagerTransformations);
                    }
                } else {
                    throw e;
                }
            }
        }
        
        if (optimizedResult == null) {
            throw new RuntimeException("Görsel yüklenemedi", lastException);
        }
        String optimizedUrl = (String) optimizedResult.get("secure_url");
        String optimizedPublicId = (String) optimizedResult.get("public_id");
        
        // Eğer orijinal URL yoksa (büyük dosya durumunda), optimize edilmiş URL'i kullan
        if (originalUrl == null) {
            originalUrl = optimizedUrl;
            log.info("Büyük dosya için optimize edilmiş URL orijinal olarak kullanılıyor: {}", originalUrl);
        }
        
        // Eager transformation sonuçlarını al
        List<Map<String, Object>> eagerResults = (List<Map<String, Object>>) optimizedResult.get("eager");
        
        OptimizedImageResult.ImageVariants.ImageVariantsBuilder variantsBuilder = OptimizedImageResult.ImageVariants.builder();
        
        if (eagerResults != null && eagerResults.size() >= 5) {
            // Eager transformation'lar sırayla döner: 400x400, 800x800, 1200x1200, 1920x1920, 2560x2560
            // İndekslere göre atama yapıyoruz
            for (int i = 0; i < eagerResults.size() && i < 5; i++) {
                Map<String, Object> eagerResult = eagerResults.get(i);
                String url = (String) eagerResult.get("secure_url");
                
                if (url != null) {
                    switch (i) {
                        case 0: // 400x400 - thumb
                            variantsBuilder.thumbnail(url);
                            break;
                        case 1: // 800x800 - small
                            variantsBuilder.small(url);
                            break;
                        case 2: // 1200x1200 - medium
                            variantsBuilder.medium(url);
                            break;
                        case 3: // 1920x1920 - large
                            variantsBuilder.large(url);
                            break;
                        case 4: // 2560x2560 - xlarge
                            variantsBuilder.xlarge(url);
                            break;
                    }
                }
            }
        }

        OptimizedImageResult.ImageVariants variants = variantsBuilder.build();
        
        // Optimize edilmiş görsel boyutunu hesapla (eager'dan large'ı al - 3. indeks)
        Long optimizedSize = null;
        if (eagerResults != null && eagerResults.size() > 3) {
            // Large (1920x1920) - 3. indeks
            Map<String, Object> largeResult = eagerResults.get(3);
            Object bytes = largeResult.get("bytes");
            if (bytes != null) {
                optimizedSize = ((Number) bytes).longValue();
            }
        }
        
        // Eğer eager'dan bulamazsak, ana görselin boyutunu kullan
        if (optimizedSize == null) {
            Object bytes = optimizedResult.get("bytes");
            if (bytes != null) {
                optimizedSize = ((Number) bytes).longValue();
            } else {
                // Fallback: Orijinal boyutun %30'u (WebP optimizasyonu için tahmin)
                optimizedSize = (long) (originalSize * 0.3);
                log.warn("Optimize edilmiş boyut hesaplanamadı, tahmin kullanılıyor: {} MB", optimizedSize / (1024.0 * 1024.0));
            }
        }

        // Sıkıştırma oranını hesapla
        double compressionRatio = optimizedSize != null && originalSize > 0 
                ? ((double) (originalSize - optimizedSize) / originalSize) * 100.0
                : 0.0;

        OptimizedImageResult result = OptimizedImageResult.builder()
                .optimizedUrl(optimizedUrl)
                .originalUrl(originalUrl)
                .publicId(optimizedPublicId)
                .optimizedSize(optimizedSize)
                .originalSize(originalSize)
                .compressionRatio(compressionRatio)
                .variants(variants)
                .build();
        
        // Cache'e ekle (hem publicId hem de cacheKey ile)
        if (optimizedPublicId != null) {
            urlCache.put(optimizedPublicId, result);
            log.debug("Görsel cache'e eklendi (publicId): {}", optimizedPublicId);
        }
        // 10MB üzeri dosyalar için özel cache key ile de kaydet
        if (isLargeFile) {
            urlCache.put(cacheKey, result);
            log.debug("Büyük dosya cache'e eklendi (cacheKey): {}", cacheKey);
        }

        log.info("Görsel optimizasyonu tamamlandı. Orijinal: {} MB, Optimize: {} MB, Sıkıştırma: {:.2f}%",
                originalSize / (1024.0 * 1024.0),
                optimizedSize != null ? optimizedSize / (1024.0 * 1024.0) : 0,
                String.format("%.2f", compressionRatio));

        return result;
    }

    /**
     * Görseli optimize edilmiş şekilde yükler (MultipartFile ile - uyumluluk için)
     * - Orijinal dosyayı arşiv klasörüne kaydeder
     * - WebP formatına dönüştürür (kaliteyi koruyarak)
     * - CDN ve caching kullanır
     * - Farklı boyutlarda responsive versiyonlar oluşturur
     * 
     * @param photo Yüklenecek görsel
     * @return Optimize edilmiş görsel sonucu
     */
    public OptimizedImageResult uploadAndOptimizeProductImage(MultipartFile photo) throws IOException {
        // MultipartFile'ı byte array'e çevir (geçici dosya silinmeden önce)
        byte[] imageBytes = photo.getBytes();
        String originalFilename = photo.getOriginalFilename() != null ? photo.getOriginalFilename() : "unknown";
        long originalSize = photo.getSize();
        
        return uploadAndOptimizeProductImage(imageBytes, originalFilename, originalSize);
    }

    /**
     * Görseli kalite kaybı olmadan yükler (orijinal boyut ve kalite korunur)
     * Admin panel ürün fotoğrafları için kullanılır
     * Optimize edilmiş: Eager transformation ile hızlı yükleme
     * Senkron versiyon - hızlı geri dönüş için
     * 
     * @deprecated Yeni optimize edilmiş yükleme için uploadAndOptimizeProductImage kullanın
     */
    @Deprecated
    public String uploadImageWithoutQualityLoss(MultipartFile photo) throws IOException {
        OptimizedImageResult result = uploadAndOptimizeProductImage(photo);
        return result.getOptimizedUrl();
    }

    /**
     * Görseli asenkron olarak optimize eder ve yükler (arka planda)
     * Admin panel ürün fotoğrafları için kullanılır
     * Hızlı geri dönüş sağlar, yükleme arka planda devam eder
     * 
     * NOT: MultipartFile'ı byte array'e çevirir (geçici dosya silinmeden önce)
     * 
     * @param photo Yüklenecek görsel
     * @return Optimize edilmiş görsel URL'i
     */
    @Async("mediaTaskExecutor")
    public CompletableFuture<String> uploadImageWithoutQualityLossAsync(MultipartFile photo) {
        try {
            // Geçici dosya silinmeden önce byte array'e çevir
            byte[] imageBytes = photo.getBytes();
            String originalFilename = photo.getOriginalFilename() != null ? photo.getOriginalFilename() : "unknown";
            long originalSize = photo.getSize();
            
            log.info("Asenkron fotoğraf optimizasyonu başladı: {}", originalFilename);
            OptimizedImageResult result = uploadAndOptimizeProductImage(imageBytes, originalFilename, originalSize);
            log.info("Asenkron fotoğraf optimizasyonu tamamlandı: {} (Sıkıştırma: {})", 
                    result.getOptimizedUrl(), String.format("%.2f", result.getCompressionRatio()) + "%");
            return CompletableFuture.completedFuture(result.getOptimizedUrl());
        } catch (Exception e) {
            log.error("Asenkron fotoğraf optimizasyonu hatası: ", e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Görseli asenkron olarak optimize eder ve yükler (detaylı sonuç ile)
     * 
     * NOT: MultipartFile'ı byte array'e çevirir (geçici dosya silinmeden önce)
     * 
     * @param photo Yüklenecek görsel
     * @return Optimize edilmiş görsel sonucu
     */
    @Async("mediaTaskExecutor")
    public CompletableFuture<OptimizedImageResult> uploadAndOptimizeProductImageAsync(MultipartFile photo) {
        try {
            // Geçici dosya silinmeden önce byte array'e çevir
            byte[] imageBytes = photo.getBytes();
            String originalFilename = photo.getOriginalFilename() != null ? photo.getOriginalFilename() : "unknown";
            long originalSize = photo.getSize();
            
            log.info("Asenkron fotoğraf optimizasyonu başladı: {}", originalFilename);
            OptimizedImageResult result = uploadAndOptimizeProductImage(imageBytes, originalFilename, originalSize);
            log.info("Asenkron fotoğraf optimizasyonu tamamlandı: {} (Sıkıştırma: {})", 
                    result.getOptimizedUrl(), String.format("%.2f", result.getCompressionRatio()) + "%");
            return CompletableFuture.completedFuture(result);
        } catch (Exception e) {
            log.error("Asenkron fotoğraf optimizasyonu hatası: ", e);
            return CompletableFuture.failedFuture(e);
        }
    }
    
    /**
     * Cache'den görsel sonucunu getir
     * 
     * @param publicId Cloudinary public ID
     * @return Cache'deki görsel sonucu (yoksa null)
     */
    public OptimizedImageResult getCachedResult(String publicId) {
        return urlCache.get(publicId);
    }
    
    /**
     * Cache'i temizle
     * 
     * @param publicId Cloudinary public ID (null ise tüm cache temizlenir)
     */
    public void clearCache(String publicId) {
        if (publicId != null) {
            urlCache.remove(publicId);
            // Transformed URL cache'ini de temizle
            transformedUrlCache.entrySet().removeIf(entry -> entry.getKey().contains(publicId));
            log.debug("Cache temizlendi: {}", publicId);
        } else {
            urlCache.clear();
            transformedUrlCache.clear();
            log.debug("Tüm cache temizlendi");
        }
    }
    
    /**
     * Cache istatistiklerini döndürür
     * 
     * @return Cache istatistikleri
     */
    public String getCacheStats() {
        return String.format("URL Cache: %d, Transformed URL Cache: %d", 
                urlCache.size(), transformedUrlCache.size());
    }

    /**
     * Perde tanıtım videolarını yükler
     * Full HD kalite korunur
     */
    public String uploadAndOptimizeVideo(MultipartFile video) throws IOException {
        if (video.getSize() > MAX_VIDEO_SIZE) {
            throw new RuntimeException("Video boyutu çok büyük! Maksimum: 200 MB");
        }

        Map<String, Object> uploadResult = cloudinary.uploader().upload(video.getBytes(), ObjectUtils.asMap(
                "folder", "perde_videolari",
                "resource_type", "video",
                "format", "mp4",                   // Evrensel format
                "quality", "auto:best",            // En iyi kalite
                "transformation", new Transformation()
                        .width(1920)               // Full HD
                        .height(1080)
                        .crop("limit")
                        .quality("auto:best")
                        .videoCodec("h264")        // Uyumlu codec
                        .flags("progressive")      // Progressive video
        ));

        return (String) uploadResult.get("secure_url");
    }

    /**
     * Thumbnail (küçük önizleme) oluşturur
     * Ürün listelerinde kullanmak için
     */
    public String uploadThumbnail(MultipartFile photo) throws IOException {
        if (photo.getSize() > MAX_IMAGE_SIZE) {
            throw new RuntimeException("Resim boyutu çok büyük! Maksimum: 100 MB");
        }

        Map<String, Object> uploadResult = cloudinary.uploader().upload(photo.getBytes(), ObjectUtils.asMap(
                "folder", "perde_thumbnails",
                "quality", "auto:good", // Daha yüksek kalite
                "fetch_format", "webp", // WebP formatına dönüştür
                "transformation", new Transformation()
                        .width(400)
                        .height(400)
                        .crop("fill")
                        .gravity("auto")
                        .quality("auto:good")
                        .fetchFormat("webp")
                        .flags("progressive")
                        .dpr("auto")
        ));

        return (String) uploadResult.get("secure_url");
    }

    /**
     * Video thumbnail oluşturur
     */
    public String generateVideoThumbnail(String videoPublicId) throws IOException {
        // Video'nun belirli bir frame'ini thumbnail olarak al
        String thumbnailUrl = cloudinary.url()
                .transformation(new Transformation()
                        .width(800)
                        .height(450)
                        .crop("fill")
                        .startOffset("1.0"))  // 1. saniyeden thumbnail al
                .format("jpg")
                .generate(videoPublicId);

        return thumbnailUrl;
    }
    
    /**
     * Görseli Cloudinary'ye göndermeden önce Java tarafında resize eder
     * Büyük dosyalar için kullanılır
     * 
     * @param imageBytes Orijinal görsel byte array'i
     * @param maxWidth Maksimum genişlik
     * @param maxHeight Maksimum yükseklik
     * @param quality JPEG kalitesi (0.0-1.0)
     * @return Resize edilmiş görsel byte array'i
     */
    private byte[] resizeImageBeforeUpload(byte[] imageBytes, int maxWidth, int maxHeight, float quality) throws IOException {
        try {
            // Byte array'i BufferedImage'e çevir
            BufferedImage originalImage = ImageIO.read(new java.io.ByteArrayInputStream(imageBytes));
            if (originalImage == null) {
                throw new IOException("Görsel okunamadı");
            }
            
            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();
            
            // Boyutları hesapla (aspect ratio korunarak)
            int newWidth = originalWidth;
            int newHeight = originalHeight;
            
            if (originalWidth > maxWidth || originalHeight > maxHeight) {
                double widthRatio = (double) maxWidth / originalWidth;
                double heightRatio = (double) maxHeight / originalHeight;
                double ratio = Math.min(widthRatio, heightRatio);
                
                newWidth = (int) (originalWidth * ratio);
                newHeight = (int) (originalHeight * ratio);
            }
            
            // Resize işlemi
            Image scaledImage = originalImage.getScaledInstance(newWidth, newHeight, Image.SCALE_SMOOTH);
            BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
            
            java.awt.Graphics2D g2d = resizedImage.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING, java.awt.RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.drawImage(scaledImage, 0, 0, null);
            g2d.dispose();
            
            // JPEG olarak sıkıştır (yüksek kalite - %75 sıkıştırma hedefi)
            // Cloudinary WebP'ye dönüştüreceği için burada JPEG kullanıyoruz
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            javax.imageio.ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg").next();
            javax.imageio.ImageWriteParam param = writer.getDefaultWriteParam();
            
            if (param.canWriteCompressed()) {
                param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
                // Kaliteyi yüksek tut (%75 sıkıştırma için 0.88-0.90 arası ideal)
                // Cloudinary WebP'ye dönüştürürken ek sıkıştırma yapacak
                float actualQuality = Math.max(quality, 0.88f); // Minimum 0.88 kalite
                param.setCompressionQuality(actualQuality);
            }
            
            try (javax.imageio.stream.ImageOutputStream ios = javax.imageio.ImageIO.createImageOutputStream(baos)) {
                writer.setOutput(ios);
                writer.write(null, new javax.imageio.IIOImage(resizedImage, null, null), param);
            } finally {
                writer.dispose();
            }
            
            byte[] resizedBytes = baos.toByteArray();
            double compressionRatio = ((double) (imageBytes.length - resizedBytes.length) / imageBytes.length) * 100.0;
            log.info("Resize tamamlandı: {}x{} -> {}x{}, Format: JPEG, Boyut: {} MB -> {} MB, Sıkıştırma: {:.2f}%", 
                    originalWidth, originalHeight, newWidth, newHeight,
                    imageBytes.length / (1024.0 * 1024.0),
                    resizedBytes.length / (1024.0 * 1024.0),
                    compressionRatio);
            
            return resizedBytes;
        } catch (Exception e) {
            log.error("Resize hatası: {}", e.getMessage(), e);
            throw new IOException("Görsel resize edilemedi: " + e.getMessage(), e);
        }
    }
}
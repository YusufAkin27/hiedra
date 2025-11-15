package eticaret.demo.product;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.auth.UserRole;
import eticaret.demo.visitor.VisitorType;
import eticaret.demo.visitor.VisitorTrackingService;
import eticaret.demo.cloudinary.MediaUploadService;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;
    private final ProductViewRepository productViewRepository;
    private final ProductReviewRepository productReviewRepository;
    private final AppUserRepository userRepository;
    private final VisitorTrackingService visitorTrackingService;
    private final AuditLogService auditLogService;
    private final MediaUploadService mediaUploadService;

    /**
     * Tüm ürünleri listele (herkes erişebilir)
     * Sayfalama, sıralama ve filtreleme desteği
     * Cache kullanır - aynı istek için tekrar veritabanı sorgusu yapmaz
     */
    @GetMapping
    @Cacheable(value = "products", key = "#page + '-' + #size + '-' + #sortBy + '-' + #categoryId")
    public ResponseEntity<DataResponseMessage<Page<Product>>> getAllProducts(
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size,
            @RequestParam(required = false, defaultValue = "sortOrder") String sortBy,
            @RequestParam(required = false, defaultValue = "ASC") String sortDir,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) Boolean isNew,
            @RequestParam(required = false) Boolean onSale,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            HttpServletRequest request,
            Authentication authentication
    ) {
        try {
            // Ziyaretçi takibi
            AppUser appUser = resolveAppUser(authentication);
            visitorTrackingService.trackVisitor(
                    request,
                    "/products",
                    null,
                    resolveVisitorType(appUser),
                    appUser != null ? appUser.getId() : null,
                    appUser != null ? appUser.getEmail() : null
            );
            
            // Sıralama
            Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            Page<Product> productsPage;
            
            // Kategoriye göre filtreleme
            if (categoryId != null) {
                productsPage = productRepository.findByCategoryIdAndActiveTrue(categoryId, pageable);
            }
            // Öne çıkarılmış ürünler
            else if (featured != null && featured) {
                List<Product> featuredProducts = productRepository.findByFeaturedTrueAndActiveTrueOrderBySortOrderAsc();
                productsPage = createPageFromList(featuredProducts, pageable);
            }
            // Yeni ürünler
            else if (isNew != null && isNew) {
                List<Product> newProducts = productRepository.findByIsNewTrueAndActiveTrueOrderByCreatedAtDesc(pageable);
                productsPage = createPageFromList(newProducts, pageable);
            }
            // İndirimli ürünler
            else if (onSale != null && onSale) {
                List<Product> saleProducts = productRepository.findByOnSaleTrueAndActiveTrueOrderBySortOrderAsc();
                productsPage = createPageFromList(saleProducts, pageable);
            }
            // Stokta olan ürünler
            else if (inStock != null && inStock) {
                productsPage = productRepository.findInStockProducts(pageable);
            }
            // Fiyat aralığına göre filtreleme
            else if (minPrice != null || maxPrice != null) {
                BigDecimal min = minPrice != null ? minPrice : BigDecimal.ZERO;
                BigDecimal max = maxPrice != null ? maxPrice : BigDecimal.valueOf(999999);
                productsPage = productRepository.findByPriceBetween(min, max, pageable);
            }
            // Tüm aktif ürünler
            else {
                productsPage = productRepository.findByActiveTrue(pageable);
            }
            
            // Stoğu biten ürünleri filtrele ve istatistikleri ekle
            List<Product> filteredProducts = productsPage.getContent().stream()
                    .filter(product -> product.getQuantity() != null && product.getQuantity() > 0)
                    .map(product -> {
                        Product optimized = optimizeProductImages(product);
                        enrichProductWithStatistics(optimized);
                        return optimized;
                    })
                    .toList();
            
            // Sayfalama bilgileri ile yeni sayfa oluştur
            Page<Product> finalPage = new org.springframework.data.domain.PageImpl<>(
                    filteredProducts, 
                    pageable, 
                    productsPage.getTotalElements()
            );
            
            auditLogService.logSimple("GET_ALL_PRODUCTS", "Product", null, 
                    "Ürünler listelendi (Sayfa: " + page + ", Toplam: " + finalPage.getTotalElements() + ")", request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Ürünler başarıyla getirildi", finalPage));
        } catch (Exception e) {
            auditLogService.logError("GET_ALL_PRODUCTS", "Product", null,
                    "Ürünler listelenirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Ürünler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * List'ten Page oluştur (yardımcı metod)
     */
    private Page<Product> createPageFromList(List<Product> list, Pageable pageable) {
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), list.size());
        List<Product> pageContent = list.subList(start, end);
        return new org.springframework.data.domain.PageImpl<>(pageContent, pageable, list.size());
    }
    
    /**
     * Ürün ara (keyword ile)
     */
    @GetMapping("/search")
    @Cacheable(value = "products", key = "'search-' + #keyword + '-' + #page")
    public ResponseEntity<DataResponseMessage<Page<Product>>> searchProducts(
            @RequestParam String keyword,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size,
            HttpServletRequest request
    ) {
        try {
            if (keyword == null || keyword.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Arama kelimesi boş olamaz"));
            }
            
            Pageable pageable = PageRequest.of(page, size);
            Page<Product> productsPage = productRepository.searchByKeyword(keyword.trim(), pageable);
            
            // Görselleri optimize et ve istatistikleri ekle
            List<Product> optimizedProducts = productsPage.getContent().stream()
                    .map(product -> {
                        Product optimized = optimizeProductImages(product);
                        enrichProductWithStatistics(optimized);
                        return optimized;
                    })
                    .toList();
            
            Page<Product> finalPage = new org.springframework.data.domain.PageImpl<>(
                    optimizedProducts,
                    pageable,
                    productsPage.getTotalElements()
            );
            
            auditLogService.logSimple("SEARCH_PRODUCTS", "Product", null,
                    "Ürün araması yapıldı: '" + keyword + "' (Sonuç: " + finalPage.getTotalElements() + ")", request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Arama sonuçları getirildi", finalPage));
        } catch (Exception e) {
            auditLogService.logError("SEARCH_PRODUCTS", "Product", null,
                    "Ürün araması sırasında hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Arama yapılamadı: " + e.getMessage()));
        }
    }
    
    /**
     * Ürünleri filtrele (renk, materyal, kullanım alanı, takma şekli)
     */
    @GetMapping("/filter")
    public ResponseEntity<DataResponseMessage<List<Product>>> filterProducts(
            @RequestParam(required = false) String color,
            @RequestParam(required = false) String material,
            @RequestParam(required = false) String usageArea,
            @RequestParam(required = false) String mountingType,
            HttpServletRequest request
    ) {
        try {
            List<Product> products = productRepository.filterProducts(color, material, usageArea, mountingType);
            
            // Görselleri optimize et ve istatistikleri ekle
            List<Product> optimizedProducts = products.stream()
                    .filter(product -> product.getQuantity() != null && product.getQuantity() > 0)
                    .map(product -> {
                        Product optimized = optimizeProductImages(product);
                        enrichProductWithStatistics(optimized);
                        return optimized;
                    })
                    .toList();
            
            auditLogService.logSimple("FILTER_PRODUCTS", "Product", null,
                    "Ürünler filtrelendi (Sonuç: " + optimizedProducts.size() + ")", request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Filtrelenmiş ürünler getirildi", optimizedProducts));
        } catch (Exception e) {
            auditLogService.logError("FILTER_PRODUCTS", "Product", null,
                    "Ürün filtreleme sırasında hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Filtreleme yapılamadı: " + e.getMessage()));
        }
    }
    
    /**
     * Öne çıkarılmış ürünleri getir
     */
    @GetMapping("/featured")
    @Cacheable(value = "products", key = "'featured'")
    public ResponseEntity<DataResponseMessage<List<Product>>> getFeaturedProducts(
            HttpServletRequest request
    ) {
        try {
            List<Product> products = productRepository.findByFeaturedTrueAndActiveTrueOrderBySortOrderAsc();
            
            List<Product> optimizedProducts = products.stream()
                    .filter(product -> product.getQuantity() != null && product.getQuantity() > 0)
                    .map(product -> {
                        Product optimized = optimizeProductImages(product);
                        enrichProductWithStatistics(optimized);
                        return optimized;
                    })
                    .toList();
            
            return ResponseEntity.ok(DataResponseMessage.success("Öne çıkarılmış ürünler getirildi", optimizedProducts));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Öne çıkarılmış ürünler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Yeni ürünleri getir
     */
    @GetMapping("/new")
    @Cacheable(value = "products", key = "'new'")
    public ResponseEntity<DataResponseMessage<List<Product>>> getNewProducts(
            @RequestParam(required = false, defaultValue = "10") int limit,
            HttpServletRequest request
    ) {
        try {
            Pageable pageable = PageRequest.of(0, limit);
            List<Product> products = productRepository.findByIsNewTrueAndActiveTrueOrderByCreatedAtDesc(pageable);
            
            List<Product> optimizedProducts = products.stream()
                    .filter(product -> product.getQuantity() != null && product.getQuantity() > 0)
                    .map(product -> {
                        Product optimized = optimizeProductImages(product);
                        enrichProductWithStatistics(optimized);
                        return optimized;
                    })
                    .toList();
            
            return ResponseEntity.ok(DataResponseMessage.success("Yeni ürünler getirildi", optimizedProducts));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Yeni ürünler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * İndirimli ürünleri getir
     */
    @GetMapping("/sale")
    @Cacheable(value = "products", key = "'sale'")
    public ResponseEntity<DataResponseMessage<List<Product>>> getSaleProducts(
            HttpServletRequest request
    ) {
        try {
            List<Product> products = productRepository.findByOnSaleTrueAndActiveTrueOrderBySortOrderAsc();
            
            List<Product> optimizedProducts = products.stream()
                    .filter(product -> product.getQuantity() != null && product.getQuantity() > 0)
                    .map(product -> {
                        Product optimized = optimizeProductImages(product);
                        enrichProductWithStatistics(optimized);
                        return optimized;
                    })
                    .toList();
            
            return ResponseEntity.ok(DataResponseMessage.success("İndirimli ürünler getirildi", optimizedProducts));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("İndirimli ürünler getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * Kategoriye göre ürünleri getir
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<DataResponseMessage<Page<Product>>> getProductsByCategory(
            @PathVariable Long categoryId,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size,
            HttpServletRequest request
    ) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Product> productsPage = productRepository.findByCategoryIdAndActiveTrue(categoryId, pageable);
            
            List<Product> optimizedProducts = productsPage.getContent().stream()
                    .filter(product -> product.getQuantity() != null && product.getQuantity() > 0)
                    .map(product -> {
                        Product optimized = optimizeProductImages(product);
                        enrichProductWithStatistics(optimized);
                        return optimized;
                    })
                    .toList();
            
            Page<Product> finalPage = new org.springframework.data.domain.PageImpl<>(
                    optimizedProducts,
                    pageable,
                    productsPage.getTotalElements()
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Kategori ürünleri getirildi", finalPage));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kategori ürünleri getirilemedi: " + e.getMessage()));
        }
    }
    
    /**
     * SKU'ya göre ürün bul
     */
    @GetMapping("/sku/{sku}")
    public ResponseEntity<DataResponseMessage<Product>> getProductBySku(
            @PathVariable String sku,
            HttpServletRequest request
    ) {
        try {
            Optional<Product> productOpt = productRepository.findBySku(sku);
            
            if (productOpt.isEmpty() || !productOpt.get().getActive()) {
                return ResponseEntity.notFound().build();
            }
            
            Product product = optimizeProductImages(productOpt.get());
            enrichProductWithStatistics(product);
            
            return ResponseEntity.ok(DataResponseMessage.success("Ürün bulundu", product));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Ürün bulunamadı: " + e.getMessage()));
        }
    }
    
    /**
     * Ürün detayı getir (herkes erişebilir)
     * Görüntüleme kaydı tutulur
     * Cache kullanır - aynı ürün için tekrar veritabanı sorgusu yapmaz
     */
    @GetMapping("/{id}")
    @Cacheable(value = "productDetails", key = "#id")
    public ResponseEntity<DataResponseMessage<Product>> getProductById(
            @PathVariable Long id,
            HttpServletRequest request,
            Authentication authentication
    ) {
        // Sadece aktif ürünleri getir
        Optional<Product> product = productRepository.findByIdAndActiveTrue(id);
        if (product.isPresent()) {
            Product productEntity = product.get();
            
            // Ziyaretçi takibi
            AppUser appUser = resolveAppUser(authentication);
            visitorTrackingService.trackVisitor(
                    request,
                    "/products/" + id,
                    null,
                    resolveVisitorType(appUser),
                    appUser != null ? appUser.getId() : null,
                    appUser != null ? appUser.getEmail() : null
            );
            
            // Görüntüleme kaydı oluştur
            try {
                String ipAddress = getClientIpAddress(request);
                String userAgent = request.getHeader("User-Agent");
                
                AppUser user = appUser != null ? userRepository.findByEmailIgnoreCase(appUser.getEmail()).orElse(null) : null;
                
                // Aynı IP'den son 1 saatte aynı ürüne yapılan görüntülemeleri kontrol et (spam önleme)
                LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
                Long recentViews = productViewRepository.countByProductIdAndIpAddressSince(
                    id, ipAddress, oneHourAgo
                );
                
                // Son 1 saatte aynı IP'den 5'ten fazla görüntüleme yoksa kaydet
                if (recentViews == null || recentViews < 5) {
                    ProductView view = ProductView.builder()
                            .product(productEntity)
                            .user(user)
                            .ipAddress(ipAddress)
                            .userAgent(userAgent != null ? (userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent) : null)
                            .viewedAt(LocalDateTime.now())
                            .build();
                    productViewRepository.save(view);
                }
            } catch (Exception e) {
                // Görüntüleme kaydı hatası ürün getirme işlemini engellemez
                // Loglama yapılabilir
            }
            
            // Görsel URL'lerini optimize et ve istatistikleri ekle
            Product optimizedProduct = optimizeProductImages(productEntity);
            enrichProductWithStatistics(optimizedProduct);
            
            auditLogService.logSimple("GET_PRODUCT", "Product", id, 
                    "Ürün detayı görüntülendi: " + productEntity.getName(), request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Ürün başarıyla getirildi", optimizedProduct));
        } else {
            auditLogService.logError("GET_PRODUCT", "Product", id,
                    "Ürün bulunamadı", "Ürün bulunamadı", request);
            return ResponseEntity.notFound().build();
        }
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

    /**
     * Fiyat hesapla (width, height, pleatType, price ile)
     */
    @PostMapping("/{id}/calculate-price")
    public ResponseEntity<DataResponseMessage<PriceCalculationResponse>> calculatePrice(
            @PathVariable Long id,
            @RequestBody PriceCalculationRequest request,
            HttpServletRequest httpRequest) {
        // Sadece aktif ürünler için fiyat hesaplama
        Optional<Product> productOpt = productRepository.findByIdAndActiveTrue(id);
        
        if (productOpt.isEmpty()) {
            auditLogService.logError("CALCULATE_PRICE", "Product", id,
                    "Ürün bulunamadı veya aktif değil", "Ürün bulunamadı veya aktif değil", httpRequest);
            return ResponseEntity.notFound().build();
        }

        Product product = productOpt.get();
        
        // Request'ten gelen değerleri veya ürünün varsayılan değerlerini kullan
        Double width = request.getWidth() != null ? request.getWidth() : product.getWidth();
        Double height = request.getHeight() != null ? request.getHeight() : product.getHeight();
        String pleatType = request.getPleatType() != null ? request.getPleatType() : product.getPleatType();
        BigDecimal price = request.getPrice() != null ? request.getPrice() : product.getPrice();

        if (width == null || pleatType == null || price == null) {
            auditLogService.logError("CALCULATE_PRICE", "Product", id,
                    "Fiyat hesaplama için gerekli parametreler eksik", "width, pleatType veya price eksik", httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Fiyat hesaplamak için width, pleatType ve price gerekli"));
        }

        // Geçici bir Product nesnesi oluştur ve fiyat hesapla
        Product tempProduct = new Product();
        tempProduct.setWidth(width);
        tempProduct.setHeight(height);
        tempProduct.setPleatType(pleatType);
        tempProduct.setPrice(price);

        BigDecimal calculatedPrice = tempProduct.fiyatHesapla();

        PriceCalculationResponse response = new PriceCalculationResponse();
        response.setProductId(id);
        response.setProductName(product.getName());
        response.setWidth(width);
        response.setHeight(height);
        response.setPleatType(pleatType);
        response.setPricePerMeter(price);
        response.setCalculatedPrice(calculatedPrice);

        auditLogService.logSuccess("CALCULATE_PRICE", "Product", id,
                "Fiyat hesaplandı: " + calculatedPrice + " ₺ (Genişlik: " + width + "cm, Pile: " + pleatType + ")",
                request, response, httpRequest);

        return ResponseEntity.ok(DataResponseMessage.success("Fiyat başarıyla hesaplandı", response));
    }

    /**
     * Fiyat hesaplama için request DTO
     */
    @lombok.Data
    static class PriceCalculationRequest {
        private Double width;
        private Double height;
        private String pleatType;
        private BigDecimal price;
    }

    /**
     * Fiyat hesaplama sonucu DTO
     */
    @lombok.Data
    static class PriceCalculationResponse {
        private Long productId;
        private String productName;
        private Double width;
        private Double height;
        private String pleatType;
        private BigDecimal pricePerMeter;
        private BigDecimal calculatedPrice;
    }

    private AppUser resolveAppUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AppUser appUser) {
            return appUser;
        }

        if (principal instanceof org.springframework.security.core.userdetails.UserDetails userDetails) {
            return userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElse(null);
        }

        if (principal instanceof String email) {
            return userRepository.findByEmailIgnoreCase(email).orElse(null);
        }

        return null;
    }

    private VisitorType resolveVisitorType(AppUser appUser) {
        if (appUser == null) {
            return VisitorType.MISAFIR;
        }

        if (appUser.getRole() == UserRole.ADMIN) {
            return VisitorType.YONETICI;
        }
        return VisitorType.KULLANICI;
    }
    
    /**
     * Ürün görsel URL'lerini optimize eder (WebP, cache kullanır)
     * Cache mekanizması sayesinde aynı görsel için tekrar istek atmaz
     * 
     * @param product Ürün entity'si
     * @return Görsel URL'leri optimize edilmiş ürün
     */
    private Product optimizeProductImages(Product product) {
        if (product == null) {
            return product;
        }
        
        try {
            // Kapak görselini optimize et (liste görünümleri için 800x800)
            if (product.getCoverImageUrl() != null && !product.getCoverImageUrl().isEmpty()) {
                String optimizedCoverUrl = mediaUploadService.getOptimizedImageUrl(
                        product.getCoverImageUrl(), 800, 800);
                product.setCoverImageUrl(optimizedCoverUrl);
            }
            
            // Detay görselini optimize et (detay sayfası için 1920x1920)
            if (product.getDetailImageUrl() != null && !product.getDetailImageUrl().isEmpty()) {
                String optimizedDetailUrl = mediaUploadService.getOptimizedImageUrl(
                        product.getDetailImageUrl(), 1920, 1920);
                product.setDetailImageUrl(optimizedDetailUrl);
            }
        } catch (Exception e) {
            // Optimizasyon hatası ürün döndürmeyi engellemez
            // Loglama yapılabilir ama exception fırlatılmaz
        }
        
        return product;
    }
    
    /**
     * Ürün istatistiklerini ekle (yorum sayısı, ortalama puan, görüntüleme sayısı)
     * 
     * @param product Ürün entity'si
     */
    private void enrichProductWithStatistics(Product product) {
        if (product == null || product.getId() == null) {
            return;
        }
        
        try {
            // Yorum istatistikleri
            Long reviewCount = productReviewRepository.countByProductIdAndActiveTrue(product.getId());
            Double averageRating = productReviewRepository.calculateAverageRatingByProductId(product.getId());
            
            product.setReviewCount(reviewCount != null ? reviewCount : 0L);
            product.setAverageRating(averageRating != null ? averageRating : 0.0);
            
            // Görüntüleme istatistikleri
            Long viewCount = productViewRepository.countByProductId(product.getId());
            product.setViewCount(viewCount != null ? viewCount : 0L);
        } catch (Exception e) {
            // İstatistik hesaplama hatası ürün döndürmeyi engellemez
            // Varsayılan değerler
            product.setReviewCount(0L);
            product.setAverageRating(0.0);
            product.setViewCount(0L);
        }
    }
}


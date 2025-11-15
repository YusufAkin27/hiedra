package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import eticaret.demo.cloudinary.MediaUploadService;
import eticaret.demo.product.Category;
import eticaret.demo.product.CategoryRepository;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.product.ProductViewRepository;
import eticaret.demo.response.DataResponseMessage;
import eticaret.demo.audit.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Admin ürün yönetimi endpoint'leri
 * Tüm işlemler admin yetkisi gerektirir
 */
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final MediaUploadService mediaUploadService;
    private final ProductReviewRepository reviewRepository;
    private final ProductViewRepository productViewRepository;
    private final AuditLogService auditLogService;

    /**
     * Yeni ürün oluştur
     * POST /api/admin/products
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DataResponseMessage<Product>> createProduct(
            @RequestParam("name") String name,
            @RequestParam("price") BigDecimal price,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "width", required = false) Double width,
            @RequestParam(value = "height", required = false) Double height,
            @RequestParam(value = "pleatType", required = false) String pleatType,
            @RequestParam(value = "quantity", required = false) Integer quantity,
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "coverImage", required = false) MultipartFile coverImage,
            @RequestParam(value = "detailImage", required = false) MultipartFile detailImage,
            @RequestParam(value = "mountingType", required = false) String mountingType,
            @RequestParam(value = "material", required = false) String material,
            @RequestParam(value = "lightTransmittance", required = false) String lightTransmittance,
            @RequestParam(value = "pieceCount", required = false) Integer pieceCount,
            @RequestParam(value = "color", required = false) String color,
            @RequestParam(value = "usageArea", required = false) String usageArea,
            @RequestParam(value = "active", required = false) Boolean active,
            HttpServletRequest request
    ) {
        try {
            // Dosya boyutu kontrolü (100MB = 104857600 bytes)
            long maxFileSize = 100 * 1024 * 1024;
            
            if (coverImage != null && !coverImage.isEmpty()) {
                if (coverImage.getSize() > maxFileSize) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Ana fotoğraf çok büyük. Maksimum boyut: 100MB. Seçilen dosya: " + 
                                    (coverImage.getSize() / (1024.0 * 1024.0)) + " MB"));
                }
                if (!coverImage.getContentType().startsWith("image/")) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Ana fotoğraf geçerli bir resim dosyası değil."));
                }
            }
            
            if (detailImage != null && !detailImage.isEmpty()) {
                if (detailImage.getSize() > maxFileSize) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Detay fotoğrafı çok büyük. Maksimum boyut: 100MB. Seçilen dosya: " + 
                                    (detailImage.getSize() / (1024.0 * 1024.0)) + " MB"));
                }
                if (!detailImage.getContentType().startsWith("image/")) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Detay fotoğrafı geçerli bir resim dosyası değil."));
                }
            }
            
            // Ürün oluştur
            Product product = new Product();
            product.setName(name);
            product.setPrice(price);
            product.setDescription(description);
            product.setWidth(width);
            product.setHeight(height);
            product.setPleatType(pleatType);
            product.setQuantity(quantity);
            product.setMountingType(mountingType);
            product.setMaterial(material);
            product.setLightTransmittance(lightTransmittance);
            product.setPieceCount(pieceCount);
            product.setColor(color);
            product.setUsageArea(usageArea);
            // Active durumu (default: true)
            product.setActive(active != null ? active : true);

            // Kategori ekle
            if (categoryId != null) {
                Optional<Category> categoryOpt = categoryRepository.findById(categoryId);
                categoryOpt.ifPresent(product::setCategory);
            }

            // Önce ürünü kaydet (hızlı geri dönüş için)
            Product saved = productRepository.save(product);
            final Long productId = saved.getId();

            // Kapak resmi yükle (asenkron - arka planda, optimize edilmiş)
            if (coverImage != null && !coverImage.isEmpty()) {
                try {
                    mediaUploadService.uploadAndOptimizeProductImageAsync(coverImage)
                            .thenAccept(result -> {
                                try {
                                    // Yeni transaction içinde güncelle (optimize edilmiş URL kullan)
                                    updateProductImageUrl(productId, result.getOptimizedUrl(), true);
                                    log.info("Ana fotoğraf optimize edilerek yüklendi: {} (Orijinal: {} MB, Optimize: {} MB, Sıkıştırma: {:.2f}%)", 
                            result.getOptimizedUrl(),
                            result.getOriginalSize() != null ? result.getOriginalSize() / (1024.0 * 1024.0) : 0,
                            result.getOptimizedSize() != null ? result.getOptimizedSize() / (1024.0 * 1024.0) : 0,
                            result.getCompressionRatio());
                                } catch (Exception e) {
                                    log.error("Ana fotoğraf URL'si güncellenirken hata: ", e);
                                }
                            })
                            .exceptionally(ex -> {
                                log.error("Ana fotoğraf optimizasyonu hatası: ", ex);
                                return null;
                            });
                } catch (Exception e) {
                    log.error("Ana fotoğraf yükleme başlatılırken hata: ", e);
                    // Hata olsa bile devam et, ürün kaydedildi
                }
            }

            // Detay resmi yükle (asenkron - arka planda, optimize edilmiş)
            if (detailImage != null && !detailImage.isEmpty()) {
                try {
                    mediaUploadService.uploadAndOptimizeProductImageAsync(detailImage)
                            .thenAccept(result -> {
                                try {
                                    // Yeni transaction içinde güncelle (optimize edilmiş URL kullan)
                                    updateProductImageUrl(productId, result.getOptimizedUrl(), false);
                                    log.info("Detay fotoğrafı optimize edilerek yüklendi: {} (Orijinal: {} MB, Optimize: {} MB, Sıkıştırma: {:.2f}%)", 
                            result.getOptimizedUrl(),
                            result.getOriginalSize() != null ? result.getOriginalSize() / (1024.0 * 1024.0) : 0,
                            result.getOptimizedSize() != null ? result.getOptimizedSize() / (1024.0 * 1024.0) : 0,
                            result.getCompressionRatio());
                                } catch (Exception e) {
                                    log.error("Detay fotoğrafı URL'si güncellenirken hata: ", e);
                                }
                            })
                            .exceptionally(ex -> {
                                log.error("Detay fotoğrafı optimizasyonu hatası: ", ex);
                                return null;
                            });
                } catch (Exception e) {
                    log.error("Detay fotoğrafı yükleme başlatılırken hata: ", e);
                    // Hata olsa bile devam et, ürün kaydedildi
                }
            }
                
                // Audit log
                auditLogService.logSuccess("CREATE_PRODUCT", "Product", saved.getId(),
                        "Yeni ürün oluşturuldu: " + saved.getName(), 
                        "Product: " + saved.getName(), saved, request);
                
                return ResponseEntity.ok(DataResponseMessage.success("Ürün başarıyla oluşturuldu.", saved));

            } catch (Exception e) {
                e.printStackTrace();
                auditLogService.logError("CREATE_PRODUCT", "Product", null,
                        "Ürün oluşturulurken hata: " + e.getMessage(), e.getMessage(), request);
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Ürün oluşturulurken hata oluştu: " + e.getMessage()));
            }
        }

        /**
         * Tüm ürünleri listele (admin)
         * GET /api/admin/products
         */
        @GetMapping
        @Transactional(readOnly = true)
        public ResponseEntity<DataResponseMessage<List<Product>>> getAllProducts(
                org.springframework.security.core.Authentication authentication) {
            log.info("getAllProducts çağrıldı. Authentication: {}", authentication != null ? authentication.getName() : "null");
            if (authentication != null) {
                log.info("Authentication authorities: {}", authentication.getAuthorities());
            }
            
            try {
                List<Product> products = productRepository.findAllWithCategory();
                
                // Her ürün için yorum sayısı, ortalama puanı ve görüntüleme sayısını ekle
                for (Product product : products) {
                    try {
                        Long reviewCount = reviewRepository.countByProductIdAndActiveTrue(product.getId());
                        Double averageRating = reviewRepository.calculateAverageRatingByProductId(product.getId());
                        Long viewCount = productViewRepository.countByProductId(product.getId());
                        
                        product.setReviewCount(reviewCount != null ? reviewCount : 0L);
                        product.setAverageRating(averageRating != null ? averageRating : 0.0);
                        product.setViewCount(viewCount != null ? viewCount : 0L);
                    } catch (Exception e) {
                        log.warn("Ürün {} için istatistik hesaplanırken hata: {}", product.getId(), e.getMessage());
                        product.setReviewCount(0L);
                        product.setAverageRating(0.0);
                        product.setViewCount(0L);
                    }
                }
                
                return ResponseEntity.ok(DataResponseMessage.success("Ürünler başarıyla getirildi", products));
            } catch (Exception e) {
                log.error("Ürünler getirilirken hata: ", e);
                return ResponseEntity.status(500)
                        .body(DataResponseMessage.error("Ürünler getirilirken hata oluştu: " + e.getMessage()));
            }
        }

    /**
     * Ürün detayı getir (admin)
     * GET /api/admin/products/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Product>> getProductById(@PathVariable Long id) {
        Optional<Product> product = productRepository.findById(id);
        if (product.isPresent()) {
            return ResponseEntity.ok(DataResponseMessage.success("Ürün başarıyla getirildi", product.get()));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Ürün güncelle (admin)
     * PUT /api/admin/products/{id}
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DataResponseMessage<Product>> updateProduct(
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "width", required = false) Double width,
            @RequestParam(value = "height", required = false) Double height,
            @RequestParam(value = "pleatType", required = false) String pleatType,
            @RequestParam(value = "quantity", required = false) Integer quantity,
            @RequestParam(value = "price", required = false) BigDecimal price,
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "coverImage", required = false) MultipartFile coverImage,
            @RequestParam(value = "detailImage", required = false) MultipartFile detailImage,
            @RequestParam(value = "mountingType", required = false) String mountingType,
            @RequestParam(value = "material", required = false) String material,
            @RequestParam(value = "lightTransmittance", required = false) String lightTransmittance,
            @RequestParam(value = "pieceCount", required = false) Integer pieceCount,
            @RequestParam(value = "color", required = false) String color,
            @RequestParam(value = "usageArea", required = false) String usageArea,
            @RequestParam(value = "active", required = false) Boolean active,
            HttpServletRequest request
    ) {
        try {
            Optional<Product> productOpt = productRepository.findById(id);
            if (productOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Dosya boyutu kontrolü (100MB = 104857600 bytes)
            long maxFileSize = 100 * 1024 * 1024;

            if (coverImage != null && !coverImage.isEmpty()) {
                if (coverImage.getSize() > maxFileSize) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Ana fotoğraf çok büyük. Maksimum boyut: 100MB. Seçilen dosya: " +
                                    (coverImage.getSize() / (1024.0 * 1024.0)) + " MB"));
                }
                if (!coverImage.getContentType().startsWith("image/")) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Ana fotoğraf geçerli bir resim dosyası değil."));
                }
            }

            if (detailImage != null && !detailImage.isEmpty()) {
                if (detailImage.getSize() > maxFileSize) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Detay fotoğrafı çok büyük. Maksimum boyut: 100MB. Seçilen dosya: " +
                                    (detailImage.getSize() / (1024.0 * 1024.0)) + " MB"));
                }
                if (!detailImage.getContentType().startsWith("image/")) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Detay fotoğrafı geçerli bir resim dosyası değil."));
                }
            }

            Product product = productOpt.get();

            if (name != null) product.setName(name);
            if (description != null) product.setDescription(description);
            if (width != null) product.setWidth(width);
            if (height != null) product.setHeight(height);
            if (pleatType != null) product.setPleatType(pleatType);
            if (quantity != null) product.setQuantity(quantity);
            if (price != null) product.setPrice(price);
            if (mountingType != null) product.setMountingType(mountingType);
            if (material != null) product.setMaterial(material);
            if (lightTransmittance != null) product.setLightTransmittance(lightTransmittance);
            if (pieceCount != null) product.setPieceCount(pieceCount);
            if (color != null) product.setColor(color);
            if (usageArea != null) product.setUsageArea(usageArea);
            // Active durumu güncelle
            if (active != null) product.setActive(active);

            // Kategori güncelle
            if (categoryId != null) {
                Optional<Category> categoryOpt = categoryRepository.findById(categoryId);
                categoryOpt.ifPresent(product::setCategory);
            } else if (categoryId == null && product.getCategory() != null) {
                // categoryId null gönderilirse kategoriyi kaldır
                product.setCategory(null);
            }

            // Önce ürünü güncelle
            Product updatedProduct = productRepository.save(product);
            final Long productId = updatedProduct.getId();

            // Kapak fotoğrafı güncelle (asenkron - arka planda, optimize edilmiş)
            if (coverImage != null && !coverImage.isEmpty()) {
                try {
                    mediaUploadService.uploadAndOptimizeProductImageAsync(coverImage)
                            .thenAccept(result -> {
                                try {
                                    // Yeni transaction içinde güncelle (optimize edilmiş URL kullan)
                                    updateProductImageUrl(productId, result.getOptimizedUrl(), true);
                                    log.info("Ana fotoğraf optimize edilerek güncellendi: {} (Orijinal: {} MB, Optimize: {} MB, Sıkıştırma: {:.2f}%)", 
                            result.getOptimizedUrl(),
                            result.getOriginalSize() != null ? result.getOriginalSize() / (1024.0 * 1024.0) : 0,
                            result.getOptimizedSize() != null ? result.getOptimizedSize() / (1024.0 * 1024.0) : 0,
                            result.getCompressionRatio());
                                } catch (Exception e) {
                                    log.error("Ana fotoğraf URL'si güncellenirken hata: ", e);
                                }
                            })
                            .exceptionally(ex -> {
                                log.error("Ana fotoğraf optimizasyonu hatası: ", ex);
                                return null;
                            });
                } catch (Exception e) {
                    log.error("Ana fotoğraf yükleme başlatılırken hata: ", e);
                    // Hata olsa bile devam et
                }
            }

            // Detay fotoğrafı güncelle (asenkron - arka planda, optimize edilmiş)
            if (detailImage != null && !detailImage.isEmpty()) {
                try {
                    mediaUploadService.uploadAndOptimizeProductImageAsync(detailImage)
                            .thenAccept(result -> {
                                try {
                                    // Yeni transaction içinde güncelle (optimize edilmiş URL kullan)
                                    updateProductImageUrl(productId, result.getOptimizedUrl(), false);
                                    log.info("Detay fotoğrafı optimize edilerek güncellendi: {} (Orijinal: {} MB, Optimize: {} MB, Sıkıştırma: {:.2f}%)", 
                            result.getOptimizedUrl(),
                            result.getOriginalSize() != null ? result.getOriginalSize() / (1024.0 * 1024.0) : 0,
                            result.getOptimizedSize() != null ? result.getOptimizedSize() / (1024.0 * 1024.0) : 0,
                            result.getCompressionRatio());
                                } catch (Exception e) {
                                    log.error("Detay fotoğrafı URL'si güncellenirken hata: ", e);
                                }
                            })
                            .exceptionally(ex -> {
                                log.error("Detay fotoğrafı optimizasyonu hatası: ", ex);
                                return null;
                            });
                } catch (Exception e) {
                    log.error("Detay fotoğrafı yükleme başlatılırken hata: ", e);
                    // Hata olsa bile devam et
                }
            }

            return ResponseEntity.ok(DataResponseMessage.success("Ürün başarıyla güncellendi", updatedProduct));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Ürün güncellenirken hata: " + e.getMessage()));
        }
    }

    /**
     * Ürün fotoğraf URL'sini güncelle (asenkron callback için)
     * Yeni transaction içinde çalışır - EntityManager hatasını önler
     * REQUIRES_NEW: Her zaman yeni bir transaction başlatır, asenkron thread'lerde çalışır
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateProductImageUrl(Long productId, String imageUrl, boolean isCoverImage) {
        try {
            // Yeni transaction içinde ürünü bul ve güncelle
            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isPresent()) {
                Product product = productOpt.get();
                if (isCoverImage) {
                    product.setCoverImageUrl(imageUrl);
                } else {
                    product.setDetailImageUrl(imageUrl);
                }
                productRepository.saveAndFlush(product); // Flush ile hemen commit et
                log.info("Ürün {} fotoğraf URL'si güncellendi: {}", isCoverImage ? "kapak" : "detay", imageUrl);
            } else {
                log.warn("Ürün bulunamadı, fotoğraf URL'si güncellenemedi: productId={}", productId);
            }
        } catch (Exception e) {
            log.error("Ürün fotoğraf URL'si güncellenirken hata: productId={}, isCoverImage={}", productId, isCoverImage, e);
            // Hata durumunda exception fırlatma, sadece logla
            // Asenkron thread'lerde exception fırlatmak sorun yaratabilir
        }
    }

    /**
     * Ürün sil (admin)
     * DELETE /api/admin/products/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteProduct(@PathVariable Long id) {
        if (productRepository.existsById(id)) {
            productRepository.deleteById(id);
            return ResponseEntity.ok(new DataResponseMessage<>("Ürün başarıyla silindi", true, null));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Ürün stok güncelle (admin)
     * PATCH /api/admin/products/{id}/stock
     */
    @PatchMapping("/{id}/stock")
    public ResponseEntity<DataResponseMessage<Product>> updateStock(
            @PathVariable Long id,
            @RequestParam("quantity") Integer quantity) {
        Optional<Product> productOpt = productRepository.findById(id);
        if (productOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Product product = productOpt.get();
        product.setQuantity(quantity);
        Product updatedProduct = productRepository.save(product);

        return ResponseEntity.ok(DataResponseMessage.success("Stok başarıyla güncellendi", updatedProduct));
    }

    /**
     * Ürün fiyat güncelle (admin)
     * PATCH /api/admin/products/{id}/price
     */
    @PatchMapping("/{id}/price")
    public ResponseEntity<DataResponseMessage<Product>> updatePrice(
            @PathVariable Long id,
            @RequestParam("price") BigDecimal price) {
        Optional<Product> productOpt = productRepository.findById(id);
        if (productOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Product product = productOpt.get();
        product.setPrice(price);
        Product updatedProduct = productRepository.save(product);

        return ResponseEntity.ok(DataResponseMessage.success("Fiyat başarıyla güncellendi", updatedProduct));
    }
}


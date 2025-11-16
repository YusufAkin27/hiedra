package eticaret.demo.coupon;

import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kupon işlemleri için public endpoint'ler
 * Kullanıcılar aktif kuponları görüntüleyebilir
 */
@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
@Slf4j
public class CouponController {

    private final CouponService couponService;
    private final AuditLogService auditLogService;
    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;

    /**
     * Tüm aktif kuponları getir (genel + kullanıcıya özel)
     * GET /api/coupons
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<Coupon>>> getAllActiveCoupons(
            @RequestParam(value = "cartTotal", required = false) BigDecimal cartTotal,
            HttpServletRequest request) {
        try {
            // JWT token'dan kullanıcı bilgilerini al (varsa)
            Long userId = null;
            String userEmail = null;
            
            try {
                String authHeader = request.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    try {
                        String email = jwtService.extractEmail(token);
                        Long extractedUserId = jwtService.extractUserId(token);
                        if (email != null) {
                            AppUser user = appUserRepository.findByEmailIgnoreCase(email).orElse(null);
                            if (user != null && extractedUserId != null && extractedUserId.equals(user.getId())) {
                                userId = user.getId();
                                userEmail = user.getEmail();
                            }
                        }
                    } catch (Exception tokenException) {
                        // Token geçersizse devam et
                        log.debug("Token geçersiz, genel kuponlar gösterilecek: {}", tokenException.getMessage());
                    }
                }
            } catch (Exception e) {
                // Token yoksa veya geçersizse devam et (genel kuponlar gösterilir)
                log.debug("Kullanıcı bilgisi alınamadı, genel kuponlar gösterilecek: {}", e.getMessage());
            }
            
            // Tüm geçerli kuponları getir (genel + özel)
            List<Coupon> coupons = couponService.getAllValidCouponsForUser(userId, userEmail);
            
            // Eğer sepet tutarı belirtilmişse, minimum tutar kontrolü yap
            if (cartTotal != null && cartTotal.compareTo(BigDecimal.ZERO) > 0) {
                coupons = coupons.stream()
                    .filter(coupon -> coupon.getMinimumPurchaseAmount() == null || 
                            cartTotal.compareTo(coupon.getMinimumPurchaseAmount()) >= 0)
                    .toList();
            }
            
            String logDescription = "Aktif kuponlar listelendi (Toplam: " + coupons.size() + 
                    ", Kullanıcı: " + (userId != null ? userId : "Misafir") + ")";
            // Description'ı 500 karakter ile sınırla (güvenlik için)
            if (logDescription.length() > 500) {
                logDescription = logDescription.substring(0, 497) + "...";
            }
            auditLogService.logSimple("GET_ACTIVE_COUPONS", "Coupon", null, logDescription, request);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Aktif kuponlar başarıyla getirildi", coupons));
        } catch (Exception e) {
            log.error("Aktif kuponlar getirilirken hata: {}", e.getMessage(), e);
            auditLogService.logError("GET_ACTIVE_COUPONS", "Coupon", null,
                    "Aktif kuponlar getirilemedi: " + e.getMessage(), e.getMessage(), request);
            throw new eticaret.demo.exception.BusinessException("Kuponlar getirilemedi: " + e.getMessage());
        }
    }

    /**
     * Kupon koduna göre kupon detayını getir
     * GET /api/coupons/{code}
     */
    @GetMapping("/{code}")
    public ResponseEntity<DataResponseMessage<Coupon>> getCouponByCode(
            @PathVariable String code,
            HttpServletRequest request) {
        try {
            Coupon coupon = couponService.getValidCouponByCodeOrThrow(code.toUpperCase());
            
            auditLogService.logSimple("GET_COUPON_BY_CODE", "Coupon", coupon.getId(),
                    "Kupon detayı getirildi: " + code, request);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Kupon başarıyla getirildi", coupon));
        } catch (eticaret.demo.exception.CouponException e) {
            throw e;
        } catch (Exception e) {
            log.error("Kupon getirilirken hata: {}", e.getMessage(), e);
            auditLogService.logError("GET_COUPON_BY_CODE", "Coupon", null,
                    "Kupon getirilemedi: " + e.getMessage(), e.getMessage(), request);
            throw new eticaret.demo.exception.BusinessException("Kupon getirilemedi: " + e.getMessage());
        }
    }

    /**
     * Kupon kodunun geçerliliğini kontrol et
     * POST /api/coupons/validate
     */
    @PostMapping("/validate")
    public ResponseEntity<DataResponseMessage<CouponValidationResponse>> validateCoupon(
            @RequestBody CouponValidationRequest requestBody,
            HttpServletRequest request) {
        try {
            String code = requestBody.getCode().toUpperCase();
            BigDecimal cartTotal = requestBody.getCartTotal();
            
            Coupon coupon = couponService.getValidCouponByCodeOrThrow(code);
            
            // Kupon geçerliliğini kontrol et (detaylı)
            boolean isValid = coupon.isValid();
            BigDecimal discountAmount = BigDecimal.ZERO;
            String errorMessage = null;
            
            if (isValid && cartTotal != null) {
                // Minimum tutar kontrolü
                if (coupon.getMinimumPurchaseAmount() != null && 
                    cartTotal.compareTo(coupon.getMinimumPurchaseAmount()) < 0) {
                    isValid = false;
                    errorMessage = String.format("Bu kupon için minimum alışveriş tutarı: %.2f ₺", 
                            coupon.getMinimumPurchaseAmount());
                } else {
                    discountAmount = coupon.calculateDiscount(cartTotal);
                }
            }
            
            CouponValidationResponse response = CouponValidationResponse.builder()
                    .code(code)
                    .valid(isValid)
                    .discountAmount(discountAmount)
                    .errorMessage(errorMessage)
                    .coupon(coupon)
                    .build();
            
            auditLogService.logSimple("VALIDATE_COUPON", "Coupon", coupon.getId(),
                    "Kupon doğrulandı: " + code + " (Geçerli: " + isValid + ")", request);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    isValid ? "Kupon geçerli" : "Kupon geçersiz", response));
        } catch (eticaret.demo.exception.CouponException e) {
            throw e;
        } catch (Exception e) {
            log.error("Kupon doğrulanırken hata: {}", e.getMessage(), e);
            auditLogService.logError("VALIDATE_COUPON", "Coupon", null,
                    "Kupon doğrulanamadı: " + e.getMessage(), e.getMessage(), request);
            throw new eticaret.demo.exception.BusinessException("Kupon doğrulanamadı: " + e.getMessage());
        }
    }

    /**
     * Kupon doğrulama request modeli
     */
    @lombok.Data
    public static class CouponValidationRequest {
        private String code;
        private BigDecimal cartTotal;
    }

    /**
     * Kupon doğrulama response modeli
     */
    @lombok.Data
    @lombok.Builder
    public static class CouponValidationResponse {
        private String code;
        private boolean valid;
        private BigDecimal discountAmount;
        private String errorMessage;
        private Coupon coupon;
    }
}


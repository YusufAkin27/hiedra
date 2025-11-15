package eticaret.demo.coupon;

import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.response.DataResponseMessage;
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

    /**
     * Tüm aktif kuponları getir
     * GET /api/coupons
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<Coupon>>> getAllActiveCoupons(
            @RequestParam(value = "cartTotal", required = false) BigDecimal cartTotal,
            HttpServletRequest request) {
        try {
            List<Coupon> coupons;
            
            // Eğer sepet tutarı belirtilmişse, kullanıcının kullanabileceği kuponları filtrele
            if (cartTotal != null && cartTotal.compareTo(BigDecimal.ZERO) > 0) {
                coupons = couponService.getAvailableCouponsForUser(cartTotal);
            } else {
                coupons = couponService.getValidCoupons();
            }
            
            auditLogService.logSimple("GET_ACTIVE_COUPONS", "Coupon", null,
                    "Aktif kuponlar listelendi (Toplam: " + coupons.size() + ")", request);
            
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


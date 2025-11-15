package eticaret.demo.admin;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.coupon.Coupon;
import eticaret.demo.coupon.CouponRepository;
import eticaret.demo.coupon.CouponService;
import eticaret.demo.coupon.CouponType;
import eticaret.demo.coupon.CouponUsage;
import eticaret.demo.coupon.CouponUsageRepository;
import eticaret.demo.response.DataResponseMessage;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/coupons")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCouponController {

    private final CouponRepository couponRepository;
    private final CouponService couponService;
    private final AuditLogService auditLogService;
    private final CouponUsageRepository couponUsageRepository;

    /**
     * Yeni kupon oluştur
     * POST /api/admin/coupons
     */
    @PostMapping
    public ResponseEntity<DataResponseMessage<Coupon>> createCoupon(
            @RequestBody CreateCouponRequest request,
            HttpServletRequest httpRequest) {
        try {
            // Kupon kodu kontrolü
            if (couponRepository.findByCodeIgnoreCase(request.getCode()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu kupon kodu zaten kullanılıyor"));
            }

            Coupon coupon = Coupon.builder()
                    .code(request.getCode().toUpperCase())
                    .name(request.getName())
                    .description(request.getDescription())
                    .type(request.getType())
                    .discountValue(request.getDiscountValue())
                    .maxUsageCount(request.getMaxUsageCount())
                    .validFrom(request.getValidFrom())
                    .validUntil(request.getValidUntil())
                    .minimumPurchaseAmount(request.getMinimumPurchaseAmount())
                    .active(request.getActive() != null ? request.getActive() : true)
                    .build();

            Coupon saved = couponRepository.save(coupon);

            auditLogService.logSuccess("CREATE_COUPON", "Coupon", saved.getId(),
                    "Yeni kupon oluşturuldu: " + saved.getCode(),
                    request, saved, httpRequest);

            return ResponseEntity.ok(DataResponseMessage.success("Kupon başarıyla oluşturuldu", saved));
        } catch (Exception e) {
            auditLogService.logError("CREATE_COUPON", "Coupon", null,
                    "Kupon oluşturulurken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kupon oluşturulamadı: " + e.getMessage()));
        }
    }

    /**
     * Tüm kuponları listele
     * GET /api/admin/coupons
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<Coupon>>> getAllCoupons(HttpServletRequest request) {
        try {
            List<Coupon> coupons = couponRepository.findAll();
            auditLogService.logSimple("GET_ALL_COUPONS", "Coupon", null,
                    "Tüm kuponlar listelendi", request);
            return ResponseEntity.ok(DataResponseMessage.success("Kuponlar başarıyla getirildi", coupons));
        } catch (Exception e) {
            auditLogService.logError("GET_ALL_COUPONS", "Coupon", null,
                    "Kuponlar getirilirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kuponlar getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kupon detayı getir
     * GET /api/admin/coupons/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Coupon>> getCouponById(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            Optional<Coupon> coupon = couponRepository.findById(id);
            if (coupon.isPresent()) {
                auditLogService.logSimple("GET_COUPON", "Coupon", id,
                        "Kupon detayı görüntülendi", request);
                return ResponseEntity.ok(DataResponseMessage.success("Kupon başarıyla getirildi", coupon.get()));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            auditLogService.logError("GET_COUPON", "Coupon", id,
                    "Kupon getirilirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kupon getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kupon güncelle
     * PUT /api/admin/coupons/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Coupon>> updateCoupon(
            @PathVariable Long id,
            @RequestBody UpdateCouponRequest request,
            HttpServletRequest httpRequest) {
        try {
            Optional<Coupon> couponOpt = couponRepository.findById(id);
            if (couponOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Coupon coupon = couponOpt.get();

            // Kupon kodu değiştiriliyorsa kontrol et
            if (request.getCode() != null && !request.getCode().equalsIgnoreCase(coupon.getCode())) {
                if (couponRepository.findByCodeIgnoreCase(request.getCode()).isPresent()) {
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Bu kupon kodu zaten kullanılıyor"));
                }
                coupon.setCode(request.getCode().toUpperCase());
            }

            if (request.getName() != null) coupon.setName(request.getName());
            if (request.getDescription() != null) coupon.setDescription(request.getDescription());
            if (request.getType() != null) coupon.setType(request.getType());
            if (request.getDiscountValue() != null) coupon.setDiscountValue(request.getDiscountValue());
            if (request.getMaxUsageCount() != null) coupon.setMaxUsageCount(request.getMaxUsageCount());
            if (request.getValidFrom() != null) coupon.setValidFrom(request.getValidFrom());
            if (request.getValidUntil() != null) coupon.setValidUntil(request.getValidUntil());
            if (request.getMinimumPurchaseAmount() != null) coupon.setMinimumPurchaseAmount(request.getMinimumPurchaseAmount());
            if (request.getActive() != null) coupon.setActive(request.getActive());

            Coupon updated = couponRepository.save(coupon);

            auditLogService.logSuccess("UPDATE_COUPON", "Coupon", updated.getId(),
                    "Kupon güncellendi: " + updated.getCode(),
                    request, updated, httpRequest);

            return ResponseEntity.ok(DataResponseMessage.success("Kupon başarıyla güncellendi", updated));
        } catch (Exception e) {
            auditLogService.logError("UPDATE_COUPON", "Coupon", id,
                    "Kupon güncellenirken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kupon güncellenemedi: " + e.getMessage()));
        }
    }

    /**
     * Kupon sil
     * DELETE /api/admin/coupons/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteCoupon(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            Optional<Coupon> couponOpt = couponRepository.findById(id);
            if (couponOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Coupon coupon = couponOpt.get();
            couponRepository.deleteById(id);

            auditLogService.logSimple("DELETE_COUPON", "Coupon", id,
                    "Kupon silindi: " + coupon.getCode(), request);

            return ResponseEntity.ok(DataResponseMessage.success("Kupon başarıyla silindi", null));
        } catch (Exception e) {
            auditLogService.logError("DELETE_COUPON", "Coupon", id,
                    "Kupon silinirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kupon silinemedi: " + e.getMessage()));
        }
    }

    /**
     * Geçerli kuponları getir
     * GET /api/admin/coupons/valid
     */
    @GetMapping("/valid")
    public ResponseEntity<DataResponseMessage<List<Coupon>>> getValidCoupons(HttpServletRequest request) {
        try {
            List<Coupon> coupons = couponService.getValidCoupons();
            auditLogService.logSimple("GET_VALID_COUPONS", "Coupon", null,
                    "Geçerli kuponlar listelendi", request);
            return ResponseEntity.ok(DataResponseMessage.success("Geçerli kuponlar başarıyla getirildi", coupons));
        } catch (Exception e) {
            auditLogService.logError("GET_VALID_COUPONS", "Coupon", null,
                    "Geçerli kuponlar getirilirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Geçerli kuponlar getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kupon kullanımlarını getir
     * GET /api/admin/coupons/{id}/usages
     */
    @GetMapping("/{id}/usages")
    public ResponseEntity<DataResponseMessage<List<CouponUsageSummary>>> getCouponUsages(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            Optional<Coupon> couponOpt = couponRepository.findById(id);
            if (couponOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<CouponUsage> usages = couponUsageRepository.findByCoupon_IdOrderByCreatedAtDesc(id);
            List<CouponUsageSummary> summaries = usages.stream()
                    .map(usage -> {
                        CouponUsageSummary summary = new CouponUsageSummary();
                        summary.setId(usage.getId());
                        summary.setUserEmail(usage.getUser() != null ? usage.getUser().getEmail() : usage.getUserEmail());
                        summary.setUserName(usage.getUser() != null ? usage.getUser().getFullName() : "Guest");
                        summary.setDiscountAmount(usage.getDiscountAmount());
                        summary.setOrderTotalBeforeDiscount(usage.getOrderTotalBeforeDiscount());
                        summary.setOrderTotalAfterDiscount(usage.getOrderTotalAfterDiscount());
                        summary.setStatus(usage.getStatus().name());
                        summary.setCreatedAt(usage.getCreatedAt());
                        summary.setUsedAt(usage.getUsedAt());
                        summary.setOrderId(usage.getOrder() != null ? usage.getOrder().getId() : null);
                        summary.setOrderNumber(usage.getOrder() != null ? usage.getOrder().getOrderNumber() : null);
                        return summary;
                    })
                    .toList();

            return ResponseEntity.ok(DataResponseMessage.success("Kupon kullanımları başarıyla getirildi", summaries));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kupon kullanımları getirilemedi: " + e.getMessage()));
        }
    }

    @Data
    public static class CreateCouponRequest {
        private String code;
        private String name;
        private String description;
        private CouponType type;
        private BigDecimal discountValue;
        private Integer maxUsageCount;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime validFrom;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime validUntil;
        private BigDecimal minimumPurchaseAmount;
        private Boolean active;
    }

    @Data
    public static class UpdateCouponRequest {
        private String code;
        private String name;
        private String description;
        private CouponType type;
        private BigDecimal discountValue;
        private Integer maxUsageCount;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime validFrom;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime validUntil;
        private BigDecimal minimumPurchaseAmount;
        private Boolean active;
    }

    @Data
    public static class CouponUsageSummary {
        private Long id;
        private String userEmail;
        private String userName;
        private BigDecimal discountAmount;
        private BigDecimal orderTotalBeforeDiscount;
        private BigDecimal orderTotalAfterDiscount;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime usedAt;
        private Long orderId;
        private String orderNumber;
    }
}


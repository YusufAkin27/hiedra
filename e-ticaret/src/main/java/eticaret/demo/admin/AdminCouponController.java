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
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/coupons")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@lombok.extern.slf4j.Slf4j
public class AdminCouponController {

    private final CouponRepository couponRepository;
    private final CouponService couponService;
    private final AuditLogService auditLogService;
    private final CouponUsageRepository couponUsageRepository;
    private final MailService mailService;
    private final AppUserRepository userRepository;

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

            // Kupon oluşturulduğunda aktif kullanıcılara toplu mail gönder
            if (saved.getActive() != null && saved.getActive()) {
                try {
                    sendCouponNotificationToUsers(saved);
                } catch (Exception e) {
                    log.error("Kupon bildirimi gönderilirken hata: {}", e.getMessage(), e);
                    // Mail gönderim hatası kupon oluşturmayı engellemez
                }
            }

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

    /**
     * Kupon oluşturulduğunda aktif kullanıcılara bildirim gönder
     */
    private void sendCouponNotificationToUsers(Coupon coupon) {
        try {
            // Aktif ve email doğrulanmış kullanıcıları al
            List<AppUser> recipients = userRepository.findByRole(UserRole.USER).stream()
                    .filter(user -> user.isActive() && user.isEmailVerified())
                    .collect(Collectors.toList());

            if (recipients.isEmpty()) {
                log.info("Kupon bildirimi için alıcı bulunamadı");
                return;
            }

            // Email template oluştur
            String subject = "🎉 Yeni Kupon: " + coupon.getName();
            String htmlBody = createCouponEmailTemplate(coupon);

            int successCount = 0;
            int failCount = 0;

            // Her kullanıcıya mail gönder
            for (AppUser user : recipients) {
                try {
                    EmailMessage emailMessage = EmailMessage.builder()
                            .toEmail(user.getEmail())
                            .subject(subject)
                            .body(htmlBody)
                            .isHtml(true)
                            .build();

                    mailService.queueEmail(emailMessage);
                    successCount++;
                } catch (Exception e) {
                    failCount++;
                    log.error("Kupon bildirimi gönderilemedi - Email: {}, Error: {}", 
                            user.getEmail(), e.getMessage());
                }
            }

            log.info("Kupon bildirimi gönderildi - Başarılı: {}, Başarısız: {}, Toplam: {}", 
                    successCount, failCount, recipients.size());

        } catch (Exception e) {
            log.error("Kupon bildirimi gönderilirken genel hata: {}", e.getMessage(), e);
        }
    }

    /**
     * Kupon bildirimi için güzel bir HTML email template oluştur
     */
    private String createCouponEmailTemplate(Coupon coupon) {
        String currentDate = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.forLanguageTag("tr")));
        
        // İndirim bilgisi
        String discountInfo = "";
        if (coupon.getType() == CouponType.YUZDE) {
            discountInfo = "%" + coupon.getDiscountValue().intValue() + " İndirim";
        } else {
            discountInfo = coupon.getDiscountValue() + " ₺ İndirim";
        }

        // Geçerlilik tarihleri
        String validFrom = coupon.getValidFrom()
                .format(DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.forLanguageTag("tr")));
        String validUntil = coupon.getValidUntil()
                .format(DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.forLanguageTag("tr")));

        // Minimum alışveriş tutarı
        String minPurchase = coupon.getMinimumPurchaseAmount() != null 
                ? "Minimum alışveriş tutarı: " + coupon.getMinimumPurchaseAmount() + " ₺<br>"
                : "";

        // Kupon açıklaması
        String description = coupon.getDescription() != null && !coupon.getDescription().isEmpty()
                ? "<p style=\"color: #666; font-size: 15px; line-height: 1.6;\">" + escapeHtml(coupon.getDescription()) + "</p>"
                : "";

        return "<!DOCTYPE html>\n" +
                "<html lang=\"tr\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>Yeni Kupon: " + escapeHtml(coupon.getName()) + "</title>\n" +
                "    <style>\n" +
                "        * {\n" +
                "            margin: 0;\n" +
                "            padding: 0;\n" +
                "            box-sizing: border-box;\n" +
                "        }\n" +
                "        body {\n" +
                "            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n" +
                "            line-height: 1.6;\n" +
                "            color: #333333;\n" +
                "            background-color: #f5f5f5;\n" +
                "        }\n" +
                "        .email-container {\n" +
                "            max-width: 600px;\n" +
                "            margin: 0 auto;\n" +
                "            background-color: #ffffff;\n" +
                "        }\n" +
                "        .email-header {\n" +
                "            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n" +
                "            color: #ffffff;\n" +
                "            padding: 40px 30px;\n" +
                "            text-align: center;\n" +
                "        }\n" +
                "        .email-header h1 {\n" +
                "            font-size: 28px;\n" +
                "            font-weight: 700;\n" +
                "            margin-bottom: 10px;\n" +
                "            letter-spacing: -0.5px;\n" +
                "        }\n" +
                "        .email-body {\n" +
                "            padding: 40px 30px;\n" +
                "        }\n" +
                "        .coupon-code-box {\n" +
                "            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);\n" +
                "            color: white;\n" +
                "            padding: 30px;\n" +
                "            border-radius: 12px;\n" +
                "            text-align: center;\n" +
                "            margin: 30px 0;\n" +
                "            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);\n" +
                "        }\n" +
                "        .coupon-code {\n" +
                "            font-size: 36px;\n" +
                "            font-weight: 700;\n" +
                "            letter-spacing: 3px;\n" +
                "            margin: 15px 0;\n" +
                "            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);\n" +
                "        }\n" +
                "        .discount-badge {\n" +
                "            display: inline-block;\n" +
                "            background: rgba(255, 255, 255, 0.3);\n" +
                "            padding: 8px 20px;\n" +
                "            border-radius: 20px;\n" +
                "            font-size: 18px;\n" +
                "            font-weight: 600;\n" +
                "            margin-top: 10px;\n" +
                "        }\n" +
                "        .coupon-details {\n" +
                "            background: #f8f9fa;\n" +
                "            padding: 20px;\n" +
                "            border-radius: 8px;\n" +
                "            margin: 20px 0;\n" +
                "        }\n" +
                "        .detail-item {\n" +
                "            margin: 10px 0;\n" +
                "            font-size: 14px;\n" +
                "            color: #555;\n" +
                "        }\n" +
                "        .detail-label {\n" +
                "            font-weight: 600;\n" +
                "            color: #333;\n" +
                "        }\n" +
                "        .email-footer {\n" +
                "            background-color: #f8f9fa;\n" +
                "            padding: 30px;\n" +
                "            text-align: center;\n" +
                "            border-top: 1px solid #e9ecef;\n" +
                "        }\n" +
                "        .email-footer .logo {\n" +
                "            font-size: 20px;\n" +
                "            font-weight: 700;\n" +
                "            color: #667eea;\n" +
                "            margin-bottom: 10px;\n" +
                "        }\n" +
                "        .email-footer .info {\n" +
                "            font-size: 12px;\n" +
                "            color: #6c757d;\n" +
                "            margin-top: 15px;\n" +
                "        }\n" +
                "        @media only screen and (max-width: 600px) {\n" +
                "            .email-header {\n" +
                "                padding: 30px 20px;\n" +
                "            }\n" +
                "            .email-header h1 {\n" +
                "                font-size: 24px;\n" +
                "            }\n" +
                "            .email-body {\n" +
                "                padding: 30px 20px;\n" +
                "            }\n" +
                "            .coupon-code {\n" +
                "                font-size: 28px;\n" +
                "            }\n" +
                "        }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"email-container\">\n" +
                "        <div class=\"email-header\">\n" +
                "            <h1>🎉 Yeni Kupon!</h1>\n" +
                "            <p style=\"font-size: 16px; opacity: 0.9;\">" + escapeHtml(coupon.getName()) + "</p>\n" +
                "        </div>\n" +
                "        <div class=\"email-body\">\n" +
                "            <div class=\"coupon-code-box\">\n" +
                "                <div style=\"font-size: 14px; opacity: 0.9;\">Kupon Kodu</div>\n" +
                "                <div class=\"coupon-code\">" + escapeHtml(coupon.getCode()) + "</div>\n" +
                "                <div class=\"discount-badge\">" + discountInfo + "</div>\n" +
                "            </div>\n" +
                description +
                "            <div class=\"coupon-details\">\n" +
                "                <div class=\"detail-item\">\n" +
                "                    <span class=\"detail-label\">İndirim:</span> " + discountInfo + "\n" +
                "                </div>\n" +
                minPurchase +
                "                <div class=\"detail-item\">\n" +
                "                    <span class=\"detail-label\">Geçerlilik:</span> " + validFrom + " - " + validUntil + "\n" +
                "                </div>\n" +
                "                <div class=\"detail-item\">\n" +
                "                    <span class=\"detail-label\">Kullanım Hakkı:</span> " + coupon.getMaxUsageCount() + " kez\n" +
                "                </div>\n" +
                "            </div>\n" +
                "            <p style=\"text-align: center; margin-top: 30px;\">\n" +
                "                <a href=\"#\" style=\"display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;\">Hemen Kullan</a>\n" +
                "            </p>\n" +
                "        </div>\n" +
                "        <div class=\"email-footer\">\n" +
                "            <div class=\"logo\">HIEDRA COLLECTION</div>\n" +
                "            <div class=\"info\">\n" +
                "                Bu e-posta HIEDRA COLLECTION tarafından gönderilmiştir.<br>\n" +
                "                Sorularınız için bizimle iletişime geçebilirsiniz.\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }

    /**
     * HTML escape yap
     */
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                  .replace("<", "&lt;")
                  .replace(">", "&gt;")
                  .replace("\"", "&quot;")
                  .replace("'", "&#39;");
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


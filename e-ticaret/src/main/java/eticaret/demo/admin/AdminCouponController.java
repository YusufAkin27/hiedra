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
import eticaret.demo.common.config.AppUrlConfig;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.cloudinary.MediaUploadService;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final MediaUploadService mediaUploadService;
    private final AppUrlConfig appUrlConfig;

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
                    .coverImageUrl(request.getCoverImageUrl())
                    .isPersonal(request.getIsPersonal() != null ? request.getIsPersonal() : false)
                    .targetUserIds(request.getTargetUserIds())
                    .targetUserEmails(request.getTargetUserEmails())
                    .build();

            Coupon saved = couponRepository.save(coupon);

            auditLogService.logSuccess("CREATE_COUPON", "Coupon", saved.getId(),
                    "Yeni kupon oluşturuldu: " + saved.getCode(),
                    request, saved, httpRequest);

            // Kupon oluşturulduğunda mail gönder
            if (saved.getActive() != null && saved.getActive()) {
                try {
                    if (saved.getIsPersonal() != null && saved.getIsPersonal()) {
                        // Özel kupon - sadece hedef kullanıcılara mail gönder
                        sendPersonalCouponNotification(saved);
                    } else {
                        // Genel kupon - tüm aktif kullanıcılara mail gönder
                        sendCouponNotificationToUsers(saved);
                    }
                } catch (Exception e) {
                    log.error("Kupon bildirimi gönderilirken hata: {}", e.getMessage(), e);
                    // Mail gönderim hatası kupon oluşturmayı engellemez
                }
            }

            return ResponseEntity.ok(DataResponseMessage.success("Kupon başarıyla oluşturuldu", saved));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String errorMessage = "Veritabanı hatası: " + e.getMessage();
            if (e.getMessage() != null && e.getMessage().contains("column") && e.getMessage().contains("does not exist")) {
                errorMessage = "Veritabanı kolonları eksik. Lütfen migration script'ini çalıştırın: migration_add_coupon_fields.sql";
            }
            log.error("Kupon oluşturulurken veritabanı hatası: {}", e.getMessage(), e);
            auditLogService.logError("CREATE_COUPON", "Coupon", null,
                    "Kupon oluşturulurken veritabanı hatası: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error(errorMessage));
        } catch (jakarta.validation.ConstraintViolationException e) {
            String errorMessage = "Validasyon hatası: " + e.getMessage();
            log.error("Kupon oluşturulurken validasyon hatası: {}", e.getMessage(), e);
            auditLogService.logError("CREATE_COUPON", "Coupon", null,
                    "Kupon oluşturulurken validasyon hatası: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error(errorMessage));
        } catch (Exception e) {
            String errorMessage = "Kupon oluşturulamadı: " + e.getMessage();
            log.error("Kupon oluşturulurken beklenmeyen hata: {}", e.getMessage(), e);
            auditLogService.logError("CREATE_COUPON", "Coupon", null,
                    "Kupon oluşturulurken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error(errorMessage));
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
            if (request.getCoverImageUrl() != null) coupon.setCoverImageUrl(request.getCoverImageUrl());
            if (request.getIsPersonal() != null) coupon.setIsPersonal(request.getIsPersonal());
            if (request.getTargetUserIds() != null) coupon.setTargetUserIds(request.getTargetUserIds());
            if (request.getTargetUserEmails() != null) coupon.setTargetUserEmails(request.getTargetUserEmails());

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
            String htmlBody = mailService.buildCouponEmail(buildCouponEmailPayload(coupon));

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
     * Özel kupon oluşturulduğunda hedef kullanıcılara bildirim gönder
     */
    private void sendPersonalCouponNotification(Coupon coupon) {
        try {
            java.util.List<AppUser> recipients = new java.util.ArrayList<>();
            
            // Email listesinden kullanıcıları bul
            if (coupon.getTargetUserEmails() != null && !coupon.getTargetUserEmails().trim().isEmpty()) {
                java.util.List<String> emails = parseEmailList(coupon.getTargetUserEmails());
                for (String email : emails) {
                    userRepository.findByEmailIgnoreCase(email.trim())
                        .filter(user -> user.isActive() && user.isEmailVerified())
                        .ifPresent(recipients::add);
                }
            }
            
            // User ID listesinden kullanıcıları bul
            if (coupon.getTargetUserIds() != null && !coupon.getTargetUserIds().trim().isEmpty()) {
                java.util.List<Long> userIds = parseUserIdList(coupon.getTargetUserIds());
                for (Long userId : userIds) {
                    userRepository.findById(userId)
                        .filter(user -> user.isActive() && user.isEmailVerified())
                        .ifPresent(user -> {
                            // Zaten email listesinde yoksa ekle
                            if (recipients.stream().noneMatch(r -> r.getId().equals(user.getId()))) {
                                recipients.add(user);
                            }
                        });
                }
            }
            
            if (recipients.isEmpty()) {
                log.info("Özel kupon bildirimi için alıcı bulunamadı - Kupon: {}", coupon.getCode());
                return;
            }
            
            // Email template oluştur
            String subject = "🎁 Size Özel Kupon: " + coupon.getName();
            String htmlBody = mailService.buildCouponEmail(buildCouponEmailPayload(coupon));
            
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
                    log.info("Özel kupon bildirimi gönderildi - Email: {}, Kupon: {}", 
                            user.getEmail(), coupon.getCode());
                } catch (Exception e) {
                    failCount++;
                    log.error("Özel kupon bildirimi gönderilemedi - Email: {}, Error: {}", 
                            user.getEmail(), e.getMessage());
                }
            }
            
            log.info("Özel kupon bildirimi tamamlandı - Başarılı: {}, Başarısız: {}, Toplam: {}", 
                    successCount, failCount, recipients.size());
            
        } catch (Exception e) {
            log.error("Özel kupon bildirimi gönderilirken genel hata: {}", e.getMessage(), e);
        }
    }

    private MailService.CouponEmailPayload buildCouponEmailPayload(Coupon coupon) {
        return new MailService.CouponEmailPayload(
                coupon.getName(),
                coupon.getCode(),
                coupon.getDescription(),
                buildCouponDiscountText(coupon),
                coupon.getValidFrom() != null ? coupon.getValidFrom().toLocalDate() : null,
                coupon.getValidUntil() != null ? coupon.getValidUntil().toLocalDate() : null,
                coupon.getMinimumPurchaseAmount(),
                appUrlConfig.getFrontendUrl(),
                coupon.getCoverImageUrl()
        );
    }

    private String buildCouponDiscountText(Coupon coupon) {
        if (coupon.getType() == CouponType.YUZDE) {
            return "%" + coupon.getDiscountValue().stripTrailingZeros().toPlainString() + " indirim";
        }
        BigDecimal value = coupon.getDiscountValue() != null
                ? coupon.getDiscountValue().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        return value.toPlainString() + " ₺ indirim";
    }
    
    /**
     * Email listesini parse et (JSON array veya comma-separated)
     */
    private java.util.List<String> parseEmailList(String emailList) {
        java.util.List<String> emails = new java.util.ArrayList<>();
        if (emailList == null || emailList.trim().isEmpty()) {
            return emails;
        }
        
        try {
            // JSON array olarak parse etmeyi dene
            if (emailList.trim().startsWith("[")) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.List<String> jsonList = mapper.readValue(emailList, 
                    mapper.getTypeFactory().constructCollectionType(java.util.List.class, String.class));
                emails.addAll(jsonList);
            } else {
                // Comma-separated olarak parse et
                String[] parts = emailList.split(",");
                for (String part : parts) {
                    String email = part.trim();
                    if (!email.isEmpty()) {
                        emails.add(email.toLowerCase());
                    }
                }
            }
        } catch (Exception e) {
            // Parse hatası - comma-separated olarak dene
            String[] parts = emailList.split(",");
            for (String part : parts) {
                String email = part.trim();
                if (!email.isEmpty()) {
                    emails.add(email.toLowerCase());
                }
            }
        }
        
        return emails;
    }
    
    /**
     * User ID listesini parse et (JSON array veya comma-separated)
     */
    private java.util.List<Long> parseUserIdList(String userIdList) {
        java.util.List<Long> userIds = new java.util.ArrayList<>();
        if (userIdList == null || userIdList.trim().isEmpty()) {
            return userIds;
        }
        
        try {
            // JSON array olarak parse etmeyi dene
            if (userIdList.trim().startsWith("[")) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.List<Object> jsonList = mapper.readValue(userIdList, 
                    mapper.getTypeFactory().constructCollectionType(java.util.List.class, Object.class));
                for (Object item : jsonList) {
                    if (item instanceof Number) {
                        userIds.add(((Number) item).longValue());
                    } else if (item instanceof String) {
                        try {
                            userIds.add(Long.parseLong((String) item));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            } else {
                // Comma-separated olarak parse et
                String[] parts = userIdList.split(",");
                for (String part : parts) {
                    try {
                        Long userId = Long.parseLong(part.trim());
                        userIds.add(userId);
                    } catch (NumberFormatException ignored) {}
                }
            }
        } catch (Exception e) {
            // Parse hatası - comma-separated olarak dene
            String[] parts = userIdList.split(",");
            for (String part : parts) {
                try {
                    Long userId = Long.parseLong(part.trim());
                    userIds.add(userId);
                } catch (NumberFormatException ignored) {}
            }
        }
        
        return userIds;
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
                ? "<p style=\"color: #000000; font-size: 15px; line-height: 1.7;\">" + escapeHtml(coupon.getDescription()) + "</p>"
                : "";

        return "<!DOCTYPE html>\n" +
                "<html lang=\"tr\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>Yeni Kupon: " + escapeHtml(coupon.getName()) + "</title>\n" +
                "    <style>\n" +
                "        :root {\n" +
                "            color-scheme: light dark;\n" +
                "        }\n" +
                "        body {\n" +
                "            margin: 0;\n" +
                "            padding: 0;\n" +
                "            font-family: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n" +
                "            background-color: #f6f7fb;\n" +
                "            color: #000000;\n" +
                "            line-height: 1.6;\n" +
                "        }\n" +
                "        .wrapper {\n" +
                "            max-width: 600px;\n" +
                "            margin: 0 auto;\n" +
                "            padding: 32px 16px;\n" +
                "        }\n" +
                "        .card {\n" +
                "            background: #ffffff;\n" +
                "            border-radius: 32px;\n" +
                "            padding: 48px 40px;\n" +
                "            position: relative;\n" +
                "            overflow: hidden;\n" +
                "            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);\n" +
                "            border: 2px solid #000000;\n" +
                "        }\n" +
                "        h1 {\n" +
                "            font-size: 28px;\n" +
                "            margin: 0 0 12px 0;\n" +
                "            letter-spacing: -0.5px;\n" +
                "            color: #000000;\n" +
                "            font-weight: 700;\n" +
                "        }\n" +
                "        p {\n" +
                "            margin: 0 0 16px 0;\n" +
                "            color: #000000;\n" +
                "            font-size: 15px;\n" +
                "            line-height: 1.7;\n" +
                "        }\n" +
                "        .coupon-code-box {\n" +
                "            background: #f8f9fa;\n" +
                "            border: 2px solid #000000;\n" +
                "            padding: 30px;\n" +
                "            border-radius: 20px;\n" +
                "            text-align: center;\n" +
                "            margin: 30px 0;\n" +
                "        }\n" +
                "        .coupon-code-label {\n" +
                "            font-size: 14px;\n" +
                "            color: #000000;\n" +
                "            opacity: 0.8;\n" +
                "            margin-bottom: 10px;\n" +
                "        }\n" +
                "        .coupon-code {\n" +
                "            font-size: 36px;\n" +
                "            font-weight: 700;\n" +
                "            letter-spacing: 3px;\n" +
                "            margin: 15px 0;\n" +
                "            color: #000000;\n" +
                "        }\n" +
                "        .discount-badge {\n" +
                "            display: inline-block;\n" +
                "            background: #000000;\n" +
                "            color: #ffffff;\n" +
                "            padding: 8px 20px;\n" +
                "            border-radius: 20px;\n" +
                "            font-size: 18px;\n" +
                "            font-weight: 600;\n" +
                "            margin-top: 10px;\n" +
                "        }\n" +
                "        .coupon-details {\n" +
                "            background: #f8f9fa;\n" +
                "            border: 2px solid #000000;\n" +
                "            padding: 24px 28px;\n" +
                "            border-radius: 24px;\n" +
                "            margin: 24px 0;\n" +
                "        }\n" +
                "        .detail-item {\n" +
                "            margin: 12px 0;\n" +
                "            font-size: 15px;\n" +
                "            color: #000000;\n" +
                "        }\n" +
                "        .detail-label {\n" +
                "            font-weight: 600;\n" +
                "            color: #000000;\n" +
                "        }\n" +
                "        .button {\n" +
                "            display: inline-block;\n" +
                "            background: #000000;\n" +
                "            color: #ffffff !important;\n" +
                "            padding: 14px 28px;\n" +
                "            text-decoration: none;\n" +
                "            border-radius: 999px;\n" +
                "            font-weight: 600;\n" +
                "            font-size: 16px;\n" +
                "            letter-spacing: 0.2px;\n" +
                "        }\n" +
                "        .footer {\n" +
                "            text-align: center;\n" +
                "            margin-top: 32px;\n" +
                "            color: #000000;\n" +
                "            font-size: 13px;\n" +
                "            opacity: 0.8;\n" +
                "        }\n" +
                "        .footer .logo {\n" +
                "            font-size: 20px;\n" +
                "            font-weight: 700;\n" +
                "            color: #000000;\n" +
                "            margin-bottom: 10px;\n" +
                "        }\n" +
                "        .footer .info {\n" +
                "            font-size: 12px;\n" +
                "            color: #000000;\n" +
                "            opacity: 0.8;\n" +
                "            margin-top: 15px;\n" +
                "        }\n" +
                "        @media (max-width: 600px) {\n" +
                "            .card {\n" +
                "                padding: 28px 24px;\n" +
                "                border-radius: 24px;\n" +
                "            }\n" +
                "            h1 {\n" +
                "                font-size: 24px;\n" +
                "            }\n" +
                "            .coupon-code {\n" +
                "                font-size: 28px;\n" +
                "            }\n" +
                "        }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"wrapper\">\n" +
                "        <div class=\"card\">\n" +
                "            <h1>🎉 Yeni Kupon!</h1>\n" +
                "            <p style=\"font-size: 16px; font-weight: 600;\">" + escapeHtml(coupon.getName()) + "</p>\n" +
                "            <div class=\"coupon-code-box\">\n" +
                "                <div class=\"coupon-code-label\">Kupon Kodu</div>\n" +
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
                "                <a href=\"#\" class=\"button\">Hemen Kullan</a>\n" +
                "            </p>\n" +
                "            <div class=\"footer\">\n" +
                "                <div class=\"logo\">HIEDRA COLLECTION</div>\n" +
                "                <div class=\"info\">\n" +
                "                    Bu e-posta HIEDRA COLLECTION tarafından gönderilmiştir.<br>\n" +
                "                    Sorularınız için bizimle iletişime geçebilirsiniz.\n" +
                "                </div>\n" +
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
        private String coverImageUrl;
        private Boolean isPersonal;
        private String targetUserIds; // JSON array veya comma-separated
        private String targetUserEmails; // JSON array veya comma-separated
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
        private String coverImageUrl;
        private Boolean isPersonal;
        private String targetUserIds;
        private String targetUserEmails;
    }

    /**
     * Kupon kapak resmi yükle
     * POST /api/admin/coupons/upload-cover-image
     */
    @PostMapping(value = "/upload-cover-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DataResponseMessage<String>> uploadCoverImage(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        try {
            // Dosya boyutu kontrolü (25MB)
            long maxFileSize = 25 * 1024 * 1024;
            if (file.getSize() > maxFileSize) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Dosya çok büyük. Maksimum boyut: 25MB"));
            }

            // Dosya tipi kontrolü
            if (!file.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Geçerli bir resim dosyası değil"));
            }

            // Cloudinary'ye yükle
            var result = mediaUploadService.uploadAndOptimizeProductImage(file);
            String imageUrl = result.getOptimizedUrl();

            auditLogService.logSuccess("UPLOAD_COUPON_COVER_IMAGE", "Coupon", null,
                    "Kupon kapak resmi yüklendi", null, imageUrl, httpRequest);

            return ResponseEntity.ok(DataResponseMessage.success("Kapak resmi başarıyla yüklendi", imageUrl));
        } catch (Exception e) {
            log.error("Kapak resmi yüklenirken hata: {}", e.getMessage(), e);
            auditLogService.logError("UPLOAD_COUPON_COVER_IMAGE", "Coupon", null,
                    "Kapak resmi yüklenemedi: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kapak resmi yüklenemedi: " + e.getMessage()));
        }
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


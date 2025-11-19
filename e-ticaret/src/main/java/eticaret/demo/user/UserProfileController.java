package eticaret.demo.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.address.Address;
import eticaret.demo.address.AdresRepository;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.AuthVerificationCodeRepository;
import eticaret.demo.auth.AuthVerificationCode;
import eticaret.demo.auth.VerificationChannel;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.mail.EmailTemplateBuilder;
import eticaret.demo.mail.EmailTemplateModel;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import eticaret.demo.coupon.CouponUsage;
import eticaret.demo.coupon.CouponUsageRepository;
import eticaret.demo.coupon.CouponUsageStatus;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.product.ProductReview;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.common.response.DataResponseMessage;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final AppUserRepository userRepository;
    private final AdresRepository addressRepository;
    private final AuditLogService auditLogService;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderRepository orderRepository;
    private final ProductReviewRepository productReviewRepository;
    private final AuthVerificationCodeRepository verificationCodeRepository;
    private final MailService mailService;
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Kullanıcı profil bilgilerini getir
     * GET /api/user/profile
     */
    @GetMapping("/profile")
    public ResponseEntity<DataResponseMessage<UserProfileResponse>> getProfile(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest request) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "USER_PROFILE",
                        "GET_PROFILE",
                        null,
                        "Kullanıcı oturumu bulunamadı",
                        "Kullanıcı oturumu bulunamadı",
                        request
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            AppUser user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

            UserProfileResponse response = UserProfileResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .phone(user.getPhone())
                    .emailVerified(user.isEmailVerified())
                    .active(user.isActive())
                    .lastLoginAt(user.getLastLoginAt())
                    .createdAt(user.getCreatedAt())
                    .build();

            auditLogService.logSuccess(
                    "USER_PROFILE",
                    "GET_PROFILE",
                    user.getId(),
                    "Profil bilgileri getirildi",
                    Map.of("userId", user.getId()),
                    response,
                    request
            );

            return ResponseEntity.ok(DataResponseMessage.success("Profil bilgileri getirildi", response));
        } catch (Exception e) {
            log.error("Profil bilgileri getirilirken hata: ", e);
            auditLogService.logError(
                    "USER_PROFILE",
                    "GET_PROFILE",
                    currentUser != null ? currentUser.getId() : null,
                    "Profil bilgileri getirilirken hata: " + e.getMessage(),
                    "Profil bilgileri getirilirken hata: " + e.getMessage(),
                    request
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Profil bilgileri getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcı profil bilgilerini güncelle
     * PUT /api/user/profile
     */
    @PutMapping("/profile")
    public ResponseEntity<DataResponseMessage<UserProfileResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpRequest) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "USER_PROFILE",
                        "UPDATE_PROFILE",
                        null,
                        "Kullanıcı oturumu bulunamadı",
                        "Kullanıcı oturumu bulunamadı",
                        httpRequest
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            AppUser user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

            // Eski değerleri kaydet (audit log için)
            String oldFullName = user.getFullName();
            String oldPhone = user.getPhone();

            // Güncelle
            if (request.getFullName() != null) {
                user.setFullName(request.getFullName());
            }
            if (request.getPhone() != null) {
                user.setPhone(request.getPhone());
            }

            userRepository.save(user);

            UserProfileResponse response = UserProfileResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .phone(user.getPhone())
                    .emailVerified(user.isEmailVerified())
                    .active(user.isActive())
                    .lastLoginAt(user.getLastLoginAt())
                    .createdAt(user.getCreatedAt())
                    .build();

            auditLogService.logSuccess(
                    "USER_PROFILE",
                    "UPDATE_PROFILE",
                    user.getId(),
                    "Profil güncellendi",
                    Map.of(
                            "oldFullName", oldFullName != null ? oldFullName : "",
                            "oldPhone", oldPhone != null ? oldPhone : "",
                            "newFullName", user.getFullName() != null ? user.getFullName() : "",
                            "newPhone", user.getPhone() != null ? user.getPhone() : ""
                    ),
                    response,
                    httpRequest
            );

            return ResponseEntity.ok(DataResponseMessage.success("Profil güncellendi", response));
        } catch (Exception e) {
            log.error("Profil güncellenirken hata: ", e);
            auditLogService.logError(
                    "USER_PROFILE",
                    "UPDATE_PROFILE",
                    currentUser != null ? currentUser.getId() : null,
                    "Profil güncellenirken hata: " + e.getMessage(),
                    "Profil güncellenirken hata: " + e.getMessage(),
                    httpRequest
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Profil güncellenemedi: " + e.getMessage()));
        }
    }

    /**
     * Email değiştirme için doğrulama kodu gönder
     * POST /api/user/change-email/request
     */
    @PostMapping("/change-email/request")
    public ResponseEntity<DataResponseMessage<String>> requestEmailChange(
            @Valid @RequestBody ChangeEmailRequest request,
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpRequest) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            AppUser user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

            String newEmail = request.getNewEmail().trim().toLowerCase();
            
            // Yeni email mevcut email ile aynı mı kontrol et
            if (user.getEmail().equalsIgnoreCase(newEmail)) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Yeni email adresi mevcut email ile aynı olamaz."));
            }

            // Yeni email başka bir kullanıcı tarafından kullanılıyor mu kontrol et
            if (userRepository.findByEmailIgnoreCase(newEmail).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu email adresi zaten kullanılıyor."));
            }

            // Email format kontrolü
            if (!newEmail.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Geçerli bir email adresi giriniz."));
            }

            // Doğrulama kodu oluştur (100000-999999 arası)
            int code = 100000 + RANDOM.nextInt(900000);
            String verificationCode = String.format("%06d", code);
            
            // Doğrulama kodunu kaydet
            AuthVerificationCode codeEntity = AuthVerificationCode.builder()
                    .user(user)
                    .code(verificationCode)
                    .expiresAt(LocalDateTime.now().plusMinutes(10))
                    .used(false)
                    .attemptCount(0)
                    .ipAddress(httpRequest.getRemoteAddr())
                    .userAgent(httpRequest.getHeader("User-Agent"))
                    .channel(VerificationChannel.EMAIL)
                    .createdAt(LocalDateTime.now())
                    .build();
            
            verificationCodeRepository.save(codeEntity);

            // Email gönder - MEVCUT email adresine gönder (güvenlik için)
            String emailBody = buildEmailChangeVerificationEmailTemplate(user.getEmail(), newEmail, verificationCode);
            EmailMessage emailMessage = EmailMessage.builder()
                    .toEmail(user.getEmail()) // Mevcut email adresine gönder
                    .subject("Email Değişikliği Doğrulama Kodu")
                    .body(emailBody)
                    .isHtml(true)
                    .build();

            mailService.queueEmail(emailMessage);

            // Audit log
            auditLogService.logSuccess(
                    "USER_PROFILE",
                    "REQUEST_EMAIL_CHANGE",
                    user.getId(),
                    "Email değiştirme kodu gönderildi",
                    Map.of("oldEmail", user.getEmail(), "newEmail", newEmail),
                    newEmail,
                    httpRequest
            );

            log.info("Email değiştirme kodu başarıyla gönderildi: {} -> {}", user.getEmail(), newEmail);
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Doğrulama kodu yeni email adresinize gönderildi.", 
                    newEmail
            ));
        } catch (RuntimeException e) {
            log.error("Email değiştirme kodu gönderilirken hata: ", e);
            return ResponseEntity.status(400)
                    .body(DataResponseMessage.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Email değiştirme kodu gönderilirken beklenmeyen hata: ", e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Email değiştirme kodu gönderilemedi: " + e.getMessage()));
        }
    }

    /**
     * Email değiştirme doğrulama kodunu kontrol et ve email'i güncelle
     * POST /api/user/change-email/verify
     */
    @PostMapping("/change-email/verify")
    public ResponseEntity<DataResponseMessage<String>> verifyEmailChange(
            @Valid @RequestBody VerifyEmailChangeRequest request,
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpRequest) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            AppUser user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

            String newEmail = request.getNewEmail().trim().toLowerCase();
            String code = request.getCode().trim();

            // Doğrulama kodunu kontrol et
            AuthVerificationCode verification = verificationCodeRepository
                    .findTopByUserAndCodeAndUsedFalseOrderByCreatedAtDesc(user, code)
                    .orElseThrow(() -> new RuntimeException("Geçersiz doğrulama kodu."));

            // Kod süresi dolmuş mu kontrol et
            if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Doğrulama kodunun süresi dolmuş. Lütfen yeni kod talep edin."));
            }

            // Yeni email kontrolü
            if (userRepository.findByEmailIgnoreCase(newEmail).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu email adresi zaten kullanılıyor."));
            }

            String oldEmail = user.getEmail();

            // Email'i güncelle
            user.setEmail(newEmail);
            user.setEmailVerified(false); // Yeni email doğrulanmamış olarak işaretle
            userRepository.save(user);

            // Doğrulama kodunu kullanıldı olarak işaretle
            verification.setUsed(true);
            verification.setUsedAt(LocalDateTime.now());
            verificationCodeRepository.save(verification);

            auditLogService.logSuccess(
                    "USER_PROFILE",
                    "VERIFY_EMAIL_CHANGE",
                    user.getId(),
                    "Email değiştirildi",
                    Map.of("oldEmail", oldEmail, "newEmail", newEmail),
                    newEmail,
                    httpRequest
            );

            // Kullanıcıyı otomatik çıkış yaptırmak için özel bir flag döndürüyoruz
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Email adresiniz başarıyla değiştirildi. Lütfen yeni email adresiniz ile giriş yapın.",
                    "LOGOUT_REQUIRED"
            ));
        } catch (Exception e) {
            log.error("Email değiştirme doğrulanırken hata: ", e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Email değiştirilemedi: " + e.getMessage()));
        }
    }

    private String buildEmailChangeVerificationEmailTemplate(String currentEmail, String newEmail, String code) {
        LinkedHashMap<String, String> details = new LinkedHashMap<>();
        details.put("Mevcut E-posta", currentEmail);
        details.put("Yeni E-posta", newEmail);
        details.put("Kod Geçerlilik", "10 dakika");

        return EmailTemplateBuilder.build(EmailTemplateModel.builder()
                .title("Email Değişikliği Doğrulama Kodu")
                .preheader("Hesabınız için güvenlik doğrulaması.")
                .greeting("Merhaba,")
                .paragraphs(List.of(
                        "Email adresinizi " + newEmail + " olarak değiştirmek için aşağıdaki doğrulama kodunu kullanın.",
                        "Bu işlemi siz başlatmadıysanız lütfen hesabınızı güvenlik altına almak için bizimle iletişime geçin."
                ))
                .highlight("Doğrulama Kodunuz: " + code)
                .details(details)
                .footerNote("Kod 10 dakika boyunca geçerlidir ve tek kullanımlıktır.")
                .build());
    }

    /**
     * Kullanıcının tüm adreslerini getir
     * GET /api/user/addresses
     */
    @GetMapping("/addresses")
    public ResponseEntity<DataResponseMessage<List<Address>>> getAddresses(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest request) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "GET_ADDRESSES",
                        null,
                        "Kullanıcı oturumu bulunamadı",
                        "Kullanıcı oturumu bulunamadı",
                        request
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            List<Address> addresses = addressRepository.findByUser_IdOrderByIsDefaultDescCreatedAtDesc(currentUser.getId());

            auditLogService.logSuccess(
                    "USER_ADDRESS",
                    "GET_ADDRESSES",
                    currentUser.getId(),
                    "Adresler getirildi",
                    Map.of("addressCount", addresses.size()),
                    addresses,
                    request
            );

            return ResponseEntity.ok(DataResponseMessage.success("Adresler getirildi", addresses));
        } catch (Exception e) {
            log.error("Adresler getirilirken hata: ", e);
            auditLogService.logError(
                    "USER_ADDRESS",
                    "GET_ADDRESSES",
                    currentUser != null ? currentUser.getId() : null,
                    "Adresler getirilirken hata: " + e.getMessage(),
                    "Adresler getirilirken hata: " + e.getMessage(),
                    request
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Adresler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Yeni adres ekle
     * POST /api/user/addresses
     */
    @PostMapping("/addresses")
    @Transactional
    public ResponseEntity<DataResponseMessage<Address>> createAddress(
            @Valid @RequestBody CreateAddressRequest request,
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpRequest) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "CREATE_ADDRESS",
                        null,
                        "Kullanıcı oturumu bulunamadı",
                        "Kullanıcı oturumu bulunamadı",
                        httpRequest
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            AppUser user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

            // Maksimum adres kontrolü (10 adet)
            long addressCount = addressRepository.countByUser_Id(user.getId());
            if (addressCount >= 10) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "CREATE_ADDRESS",
                        user.getId(),
                        "Maksimum adres sayısına ulaşıldı (10 adet)",
                        "Maksimum adres sayısına ulaşıldı (10 adet)",
                        httpRequest
                );
                return ResponseEntity.status(400)
                        .body(DataResponseMessage.error("Maksimum 10 adet adres ekleyebilirsiniz. Lütfen mevcut adreslerinizden birini silin."));
            }

            // İlk adres otomatik olarak varsayılan adres olur
            boolean isFirstAddress = addressCount == 0;
            boolean isDefault = isFirstAddress || (request.getIsDefault() != null && request.getIsDefault());

            // Eğer varsayılan adres olarak işaretlenmişse, diğer adreslerin varsayılan durumunu kaldır
            if (isDefault) {
                addressRepository.clearDefaultAddresses(user.getId());
            }

            Address address = Address.builder()
                    .user(user)
                    .fullName(request.getFullName())
                    .phone(request.getPhone())
                    .addressLine(request.getAddressLine())
                    .addressDetail(request.getAddressDetail())
                    .city(request.getCity())
                    .district(request.getDistrict())
                    .isDefault(isDefault)
                    .build();

            address = addressRepository.save(address);

            auditLogService.logSuccess(
                    "USER_ADDRESS",
                    "CREATE_ADDRESS",
                    user.getId(),
                    "Adres eklendi",
                    Map.of(
                            "addressId", address.getId(),
                            "fullName", address.getFullName(),
                            "city", address.getCity(),
                            "district", address.getDistrict(),
                            "isDefault", address.getIsDefault()
                    ),
                    address,
                    httpRequest
            );

            return ResponseEntity.ok(DataResponseMessage.success("Adres eklendi", address));
        } catch (Exception e) {
            log.error("Adres eklenirken hata: ", e);
            auditLogService.logError(
                    "USER_ADDRESS",
                    "CREATE_ADDRESS",
                    currentUser != null ? currentUser.getId() : null,
                    "Adres eklenirken hata: " + e.getMessage(),
                    "Adres eklenirken hata: " + e.getMessage(),
                    httpRequest
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Adres eklenemedi: " + e.getMessage()));
        }
    }

    /**
     * Adres güncelle
     * PUT /api/user/addresses/{id}
     */
    @PutMapping("/addresses/{id}")
    @Transactional
    public ResponseEntity<DataResponseMessage<Address>> updateAddress(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAddressRequest request,
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpRequest) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "UPDATE_ADDRESS",
                        null,
                        "Kullanıcı oturumu bulunamadı",
                        "Kullanıcı oturumu bulunamadı",
                        httpRequest
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            Address address = addressRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Adres bulunamadı"));

            // User'ı initialize et (lazy loading için)
            if (address.getUser() != null) {
                address.getUser().getId();
            }

            // Adresin kullanıcıya ait olduğunu kontrol et
            if (address.getUser() == null || !address.getUser().getId().equals(currentUser.getId())) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "UPDATE_ADDRESS",
                        currentUser.getId(),
                        "Bu adres kullanıcıya ait değil",
                        "Bu adres kullanıcıya ait değil",
                        httpRequest
                );
                return ResponseEntity.status(403)
                        .body(DataResponseMessage.error("Bu adres size ait değil"));
            }

            // Eğer varsayılan adres olarak işaretlenmişse, diğer adreslerin varsayılan durumunu kaldır
            if (request.getIsDefault() != null && request.getIsDefault() && !address.getIsDefault()) {
                addressRepository.clearDefaultAddresses(currentUser.getId());
            }

            // Validation kontrolü - güncelleme için değerler null değilse kontrol et
            if (request.getFullName() != null && request.getFullName().trim().isEmpty()) {
                return ResponseEntity.status(400)
                        .body(DataResponseMessage.error("Ad soyad boş olamaz"));
            }
            if (request.getPhone() != null && !request.getPhone().matches("^[0-9\\s\\+\\-\\(\\)]{10,20}$")) {
                return ResponseEntity.status(400)
                        .body(DataResponseMessage.error("Geçerli bir telefon numarası giriniz"));
            }

            // Güncelle
            if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
                if (request.getFullName().length() < 2 || request.getFullName().length() > 100) {
                    return ResponseEntity.status(400)
                            .body(DataResponseMessage.error("Ad soyad 2-100 karakter arasında olmalıdır"));
                }
                address.setFullName(request.getFullName().trim());
            }
            if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
                address.setPhone(request.getPhone().trim());
            }
            if (request.getAddressLine() != null && !request.getAddressLine().trim().isEmpty()) {
                if (request.getAddressLine().length() < 5 || request.getAddressLine().length() > 255) {
                    return ResponseEntity.status(400)
                            .body(DataResponseMessage.error("Adres satırı 5-255 karakter arasında olmalıdır"));
                }
                address.setAddressLine(request.getAddressLine().trim());
            }
            if (request.getAddressDetail() != null) {
                if (request.getAddressDetail().length() > 255) {
                    return ResponseEntity.status(400)
                            .body(DataResponseMessage.error("Adres detayı en fazla 255 karakter olabilir"));
                }
                address.setAddressDetail(request.getAddressDetail().trim());
            }
            if (request.getCity() != null && !request.getCity().trim().isEmpty()) {
                if (request.getCity().length() < 2 || request.getCity().length() > 50) {
                    return ResponseEntity.status(400)
                            .body(DataResponseMessage.error("Şehir 2-50 karakter arasında olmalıdır"));
                }
                address.setCity(request.getCity().trim());
            }
            if (request.getDistrict() != null && !request.getDistrict().trim().isEmpty()) {
                if (request.getDistrict().length() < 2 || request.getDistrict().length() > 50) {
                    return ResponseEntity.status(400)
                            .body(DataResponseMessage.error("İlçe 2-50 karakter arasında olmalıdır"));
                }
                address.setDistrict(request.getDistrict().trim());
            }
            if (request.getIsDefault() != null) {
                address.setIsDefault(request.getIsDefault());
            }

            address = addressRepository.save(address);

            auditLogService.logSuccess(
                    "USER_ADDRESS",
                    "UPDATE_ADDRESS",
                    currentUser.getId(),
                    "Adres güncellendi",
                    Map.of("addressId", id),
                    address,
                    httpRequest
            );

            return ResponseEntity.ok(DataResponseMessage.success("Adres güncellendi", address));
        } catch (Exception e) {
            log.error("Adres güncellenirken hata: ", e);
            auditLogService.logError(
                    "USER_ADDRESS",
                    "UPDATE_ADDRESS",
                    currentUser != null ? currentUser.getId() : null,
                    "Adres güncellenirken hata: " + e.getMessage(),
                    "Adres güncellenirken hata: " + e.getMessage(),
                    httpRequest
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Adres güncellenemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının varsayılan adresini getir
     * GET /api/user/addresses/default
     */
    @GetMapping("/addresses/default")
    public ResponseEntity<DataResponseMessage<Address>> getDefaultAddress(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest request) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "GET_DEFAULT_ADDRESS",
                        null,
                        "Kullanıcı oturumu bulunamadı",
                        "Kullanıcı oturumu bulunamadı",
                        request
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            Address defaultAddress = addressRepository.findByUser_IdAndIsDefaultTrue(currentUser.getId())
                    .orElse(null);

            if (defaultAddress == null) {
                // Varsayılan adres yoksa, en son eklenen adresi döndür
                List<Address> addresses = addressRepository.findByUser_IdOrderByIsDefaultDescCreatedAtDesc(currentUser.getId());
                if (addresses.isEmpty()) {
                    return ResponseEntity.ok(DataResponseMessage.success("Varsayılan adres bulunamadı", null));
                }
                defaultAddress = addresses.get(0);
            }

            auditLogService.logSuccess(
                    "USER_ADDRESS",
                    "GET_DEFAULT_ADDRESS",
                    currentUser.getId(),
                    "Varsayılan adres getirildi",
                    Map.of("addressId", defaultAddress.getId()),
                    defaultAddress,
                    request
            );

            return ResponseEntity.ok(DataResponseMessage.success("Varsayılan adres getirildi", defaultAddress));
        } catch (Exception e) {
            log.error("Varsayılan adres getirilirken hata: ", e);
            auditLogService.logError(
                    "USER_ADDRESS",
                    "GET_DEFAULT_ADDRESS",
                    currentUser != null ? currentUser.getId() : null,
                    "Varsayılan adres getirilirken hata: " + e.getMessage(),
                    "Varsayılan adres getirilirken hata: " + e.getMessage(),
                    request
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Varsayılan adres getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Adres sil
     * DELETE /api/user/addresses/{id}
     */
    @DeleteMapping("/addresses/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteAddress(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpRequest) {
        try {
            if (currentUser == null) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "DELETE_ADDRESS",
                        null,
                        "Kullanıcı oturumu bulunamadı",
                        "Kullanıcı oturumu bulunamadı",
                        httpRequest
                );
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            Address address = addressRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Adres bulunamadı"));

            // Adresin kullanıcıya ait olduğunu kontrol et
            if (address.getUser() == null || !address.getUser().getId().equals(currentUser.getId())) {
                auditLogService.logError(
                        "USER_ADDRESS",
                        "DELETE_ADDRESS",
                        currentUser.getId(),
                        "Bu adres kullanıcıya ait değil",
                        "Bu adres kullanıcıya ait değil",
                        httpRequest
                );
                return ResponseEntity.status(403)
                        .body(DataResponseMessage.error("Bu adres size ait değil"));
            }

            addressRepository.delete(address);

            auditLogService.logSuccess(
                    "USER_ADDRESS",
                    "DELETE_ADDRESS",
                    currentUser.getId(),
                    "Adres silindi",
                    Map.of("addressId", id),
                    null,
                    httpRequest
            );

            return ResponseEntity.ok(DataResponseMessage.success("Adres silindi", null));
        } catch (Exception e) {
            log.error("Adres silinirken hata: ", e);
            auditLogService.logError(
                    "USER_ADDRESS",
                    "DELETE_ADDRESS",
                    currentUser != null ? currentUser.getId() : null,
                    "Adres silinirken hata: " + e.getMessage(),
                    "Adres silinirken hata: " + e.getMessage(),
                    httpRequest
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Adres silinemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcı dashboard - özet bilgiler
     * GET /api/user/dashboard
     */
    @GetMapping("/dashboard")
    public ResponseEntity<DataResponseMessage<UserDashboardResponse>> getDashboard(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest request) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            AppUser user = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

            UserDashboardResponse dashboard = new UserDashboardResponse();
            dashboard.setUser(UserProfileResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .phone(user.getPhone())
                    .emailVerified(user.isEmailVerified())
                    .active(user.isActive())
                    .lastLoginAt(user.getLastLoginAt())
                    .createdAt(user.getCreatedAt())
                    .build());

            // İstatistikler
            dashboard.setStatistics(calculateUserStatistics(user.getId()));

            // Son siparişler (5 adet)
            List<Order> recentOrders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(user.getEmail())
                    .stream()
                    .limit(5)
                    .collect(Collectors.toList());
            dashboard.setRecentOrders(recentOrders.stream()
                    .map(this::mapOrderToSummary)
                    .collect(Collectors.toList()));

            // Kullanılan kuponlar (son 10 adet)
            List<CouponUsage> couponUsages = couponUsageRepository.findByUser_IdOrderByCreatedAtDesc(user.getId())
                    .stream()
                    .limit(10)
                    .collect(Collectors.toList());
            dashboard.setCouponUsages(couponUsages.stream()
                    .map(this::mapCouponUsageToSummary)
                    .collect(Collectors.toList()));

            // Son yorumlar (5 adet)
            List<ProductReview> recentReviews = productReviewRepository.findByUserId(user.getId())
                    .stream()
                    .limit(5)
                    .collect(Collectors.toList());
            dashboard.setRecentReviews(recentReviews.stream()
                    .map(this::mapReviewToSummary)
                    .collect(Collectors.toList()));

            auditLogService.logSuccess(
                    "USER_DASHBOARD",
                    "GET_DASHBOARD",
                    user.getId(),
                    "Dashboard bilgileri getirildi",
                    Map.of("userId", user.getId()),
                    dashboard,
                    request
            );

            return ResponseEntity.ok(DataResponseMessage.success("Dashboard bilgileri getirildi", dashboard));
        } catch (Exception e) {
            log.error("Dashboard bilgileri getirilirken hata: ", e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Dashboard bilgileri getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının kullandığı kuponları getir
     * GET /api/user/coupons
     */
    @GetMapping("/coupons")
    public ResponseEntity<DataResponseMessage<List<CouponUsageSummary>>> getCoupons(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest request) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            List<CouponUsage> couponUsages = couponUsageRepository.findByUser_IdOrderByCreatedAtDesc(currentUser.getId());

            List<CouponUsageSummary> summaries = couponUsages.stream()
                    .map(this::mapCouponUsageToSummary)
                    .collect(Collectors.toList());

            auditLogService.logSuccess(
                    "USER_COUPONS",
                    "GET_COUPONS",
                    currentUser.getId(),
                    "Kupon kullanımları getirildi",
                    Map.of("couponCount", summaries.size()),
                    summaries,
                    request
            );

            return ResponseEntity.ok(DataResponseMessage.success("Kupon kullanımları getirildi", summaries));
        } catch (Exception e) {
            log.error("Kupon kullanımları getirilirken hata: ", e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Kupon kullanımları getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının siparişlerini getir (özet)
     * GET /api/user/orders
     */
    @GetMapping("/orders")
    public ResponseEntity<DataResponseMessage<List<OrderSummary>>> getOrders(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest request) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            List<Order> orders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(currentUser.getEmail());

            List<OrderSummary> summaries = orders.stream()
                    .map(this::mapOrderToSummary)
                    .collect(Collectors.toList());

            auditLogService.logSuccess(
                    "USER_ORDERS",
                    "GET_ORDERS",
                    currentUser.getId(),
                    "Siparişler getirildi",
                    Map.of("orderCount", summaries.size()),
                    summaries,
                    request
            );

            return ResponseEntity.ok(DataResponseMessage.success("Siparişler getirildi", summaries));
        } catch (Exception e) {
            log.error("Siparişler getirilirken hata: ", e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Siparişler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının yorumlarını getir
     * GET /api/user/reviews
     */
    @GetMapping("/reviews")
    public ResponseEntity<DataResponseMessage<List<ReviewSummary>>> getReviews(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest request) {
        try {
            if (currentUser == null) {
                return ResponseEntity.status(401)
                        .body(DataResponseMessage.error("Oturum bulunamadı"));
            }

            List<ProductReview> reviews = productReviewRepository.findByUserId(currentUser.getId());

            List<ReviewSummary> summaries = reviews.stream()
                    .map(this::mapReviewToSummary)
                    .collect(Collectors.toList());

            auditLogService.logSuccess(
                    "USER_REVIEWS",
                    "GET_REVIEWS",
                    currentUser.getId(),
                    "Yorumlar getirildi",
                    Map.of("reviewCount", summaries.size()),
                    summaries,
                    request
            );

            return ResponseEntity.ok(DataResponseMessage.success("Yorumlar getirildi", summaries));
        } catch (Exception e) {
            log.error("Yorumlar getirilirken hata: ", e);
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Yorumlar getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcı istatistiklerini hesapla
     */
    private UserStatistics calculateUserStatistics(Long userId) {
        UserStatistics stats = new UserStatistics();

        // Siparişler
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getUser() != null && o.getUser().getId().equals(userId))
                .collect(Collectors.toList());

        stats.setTotalOrders(orders.size());
        stats.setCompletedOrders((int) orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.TAMAMLANDI || 
                           o.getStatus() == OrderStatus.TESLIM_EDILDI)
                .count());
        stats.setCancelledOrders((int) orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.IPTAL_EDILDI)
                .count());
        stats.setTotalSpent(orders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        // Kuponlar
        List<CouponUsage> couponUsages = couponUsageRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        stats.setTotalCouponsUsed((int) couponUsages.stream()
                .filter(cu -> cu.getStatus() == CouponUsageStatus.KULLANILDI)
                .count());
        stats.setTotalDiscountAmount(couponUsages.stream()
                .filter(cu -> cu.getStatus() == CouponUsageStatus.KULLANILDI)
                .map(CouponUsage::getDiscountAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        // Yorumlar
        List<ProductReview> reviews = productReviewRepository.findByUserId(userId);
        stats.setTotalReviews(reviews.size());
        stats.setAverageRating(reviews.stream()
                .filter(r -> r.getRating() != null)
                .mapToInt(ProductReview::getRating)
                .average()
                .orElse(0.0));

        // Adresler
        stats.setTotalAddresses((int) addressRepository.countByUser_Id(userId));

        return stats;
    }

    /**
     * Order'ı OrderSummary'ye map et
     */
    private OrderSummary mapOrderToSummary(Order order) {
        OrderSummary summary = new OrderSummary();
        summary.setId(order.getId());
        summary.setOrderNumber(order.getOrderNumber());
        summary.setStatus(order.getStatus().name());
        summary.setTotalAmount(order.getTotalAmount());
        summary.setItemCount(order.getOrderItems() != null ? order.getOrderItems().size() : 0);
        summary.setCreatedAt(order.getCreatedAt());
        summary.setShippedAt(order.getShippedAt());
        summary.setDeliveredAt(order.getDeliveredAt());
        return summary;
    }

    /**
     * CouponUsage'ı CouponUsageSummary'ye map et
     */
    private CouponUsageSummary mapCouponUsageToSummary(CouponUsage usage) {
        CouponUsageSummary summary = new CouponUsageSummary();
        summary.setId(usage.getId());
        summary.setCouponCode(usage.getCoupon() != null ? usage.getCoupon().getCode() : null);
        summary.setCouponName(usage.getCoupon() != null ? usage.getCoupon().getName() : null);
        summary.setDiscountAmount(usage.getDiscountAmount());
        summary.setStatus(usage.getStatus().name());
        summary.setOrderNumber(usage.getOrder() != null ? usage.getOrder().getOrderNumber() : null);
        summary.setUsedAt(usage.getUsedAt());
        summary.setCreatedAt(usage.getCreatedAt());
        return summary;
    }

    /**
     * ProductReview'ı ReviewSummary'ye map et
     */
    private ReviewSummary mapReviewToSummary(ProductReview review) {
        ReviewSummary summary = new ReviewSummary();
        summary.setId(review.getId());
        summary.setProductId(review.getProduct() != null ? review.getProduct().getId() : null);
        summary.setProductName(review.getProduct() != null ? review.getProduct().getName() : null);
        summary.setProductImageUrl(review.getProduct() != null ? review.getProduct().getCoverImageUrl() : null);
        summary.setRating(review.getRating());
        summary.setComment(review.getComment());
        summary.setActive(Boolean.TRUE.equals(review.getActive()));
        summary.setCreatedAt(review.getCreatedAt());
        return summary;
    }

    // DTOs
    @Data
    public static class UpdateProfileRequest {
        private String fullName;
        private String phone;
    }

    @Data
    public static class ChangeEmailRequest {
        @jakarta.validation.constraints.Email(message = "Geçerli bir email adresi giriniz")
        @jakarta.validation.constraints.NotBlank(message = "Email adresi zorunludur")
        private String newEmail;
    }

    @Data
    public static class VerifyEmailChangeRequest {
        @jakarta.validation.constraints.Email(message = "Geçerli bir email adresi giriniz")
        @jakarta.validation.constraints.NotBlank(message = "Email adresi zorunludur")
        private String newEmail;
        
        @jakarta.validation.constraints.NotBlank(message = "Doğrulama kodu zorunludur")
        @jakarta.validation.constraints.Pattern(regexp = "^[0-9]{6}$", message = "Doğrulama kodu 6 haneli sayı olmalıdır")
        private String code;
    }

    @Data
    public static class UserProfileResponse {
        private Long id;
        private String email;
        private String fullName;
        private String phone;
        private boolean emailVerified;
        private boolean active;
        private java.time.LocalDateTime lastLoginAt;
        private java.time.LocalDateTime createdAt;
        private UserStatistics statistics;

        public static UserProfileResponseBuilder builder() {
            return new UserProfileResponseBuilder();
        }

        public static class UserProfileResponseBuilder {
            private Long id;
            private String email;
            private String fullName;
            private String phone;
            private boolean emailVerified;
            private boolean active;
            private java.time.LocalDateTime lastLoginAt;
            private java.time.LocalDateTime createdAt;
            private UserStatistics statistics;

            public UserProfileResponseBuilder id(Long id) {
                this.id = id;
                return this;
            }

            public UserProfileResponseBuilder email(String email) {
                this.email = email;
                return this;
            }

            public UserProfileResponseBuilder fullName(String fullName) {
                this.fullName = fullName;
                return this;
            }

            public UserProfileResponseBuilder phone(String phone) {
                this.phone = phone;
                return this;
            }

            public UserProfileResponseBuilder emailVerified(boolean emailVerified) {
                this.emailVerified = emailVerified;
                return this;
            }

            public UserProfileResponseBuilder active(boolean active) {
                this.active = active;
                return this;
            }

            public UserProfileResponseBuilder lastLoginAt(java.time.LocalDateTime lastLoginAt) {
                this.lastLoginAt = lastLoginAt;
                return this;
            }

            public UserProfileResponseBuilder createdAt(java.time.LocalDateTime createdAt) {
                this.createdAt = createdAt;
                return this;
            }

            public UserProfileResponseBuilder statistics(UserStatistics statistics) {
                this.statistics = statistics;
                return this;
            }

            public UserProfileResponse build() {
                UserProfileResponse response = new UserProfileResponse();
                response.id = this.id;
                response.email = this.email;
                response.fullName = this.fullName;
                response.phone = this.phone;
                response.emailVerified = this.emailVerified;
                response.active = this.active;
                response.lastLoginAt = this.lastLoginAt;
                response.createdAt = this.createdAt;
                response.statistics = this.statistics;
                return response;
            }
        }
    }

    @Data
    public static class CreateAddressRequest {
        @NotBlank(message = "Ad soyad zorunludur")
        @Size(min = 2, max = 100, message = "Ad soyad 2-100 karakter arasında olmalıdır")
        private String fullName;

        @NotBlank(message = "Telefon zorunludur")
        @Pattern(regexp = "^[0-9\\s\\+\\-\\(\\)]{10,20}$", message = "Geçerli bir telefon numarası giriniz")
        private String phone;

        @NotBlank(message = "Adres satırı zorunludur")
        @Size(min = 5, max = 255, message = "Adres satırı 5-255 karakter arasında olmalıdır")
        private String addressLine;

        @Size(max = 255, message = "Adres detayı en fazla 255 karakter olabilir")
        private String addressDetail;

        @NotBlank(message = "Şehir zorunludur")
        @Size(min = 2, max = 50, message = "Şehir 2-50 karakter arasında olmalıdır")
        private String city;

        @NotBlank(message = "İlçe zorunludur")
        @Size(min = 2, max = 50, message = "İlçe 2-50 karakter arasında olmalıdır")
        private String district;

        private Boolean isDefault;
    }

    @Data
    public static class UpdateAddressRequest {
        @Size(min = 2, max = 100, message = "Ad soyad 2-100 karakter arasında olmalıdır")
        private String fullName;

        @Pattern(regexp = "^[0-9\\s\\+\\-\\(\\)]{10,20}$", message = "Geçerli bir telefon numarası giriniz")
        private String phone;

        @Size(min = 5, max = 255, message = "Adres satırı 5-255 karakter arasında olmalıdır")
        private String addressLine;

        @Size(max = 255, message = "Adres detayı en fazla 255 karakter olabilir")
        private String addressDetail;

        @Size(min = 2, max = 50, message = "Şehir 2-50 karakter arasında olmalıdır")
        private String city;

        @Size(min = 2, max = 50, message = "İlçe 2-50 karakter arasında olmalıdır")
        private String district;

        private Boolean isDefault;
    }

    @Data
    public static class UserStatistics {
        private int totalOrders;
        private int completedOrders;
        private int cancelledOrders;
        private BigDecimal totalSpent;
        private int totalCouponsUsed;
        private BigDecimal totalDiscountAmount;
        private int totalReviews;
        private double averageRating;
        private int totalAddresses;
    }

    @Data
    public static class UserDashboardResponse {
        private UserProfileResponse user;
        private UserStatistics statistics;
        private List<OrderSummary> recentOrders;
        private List<CouponUsageSummary> couponUsages;
        private List<ReviewSummary> recentReviews;
    }

    @Data
    public static class OrderSummary {
        private Long id;
        private String orderNumber;
        private String status;
        private BigDecimal totalAmount;
        private int itemCount;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime shippedAt;
        private java.time.LocalDateTime deliveredAt;
    }

    @Data
    public static class CouponUsageSummary {
        private Long id;
        private String couponCode;
        private String couponName;
        private BigDecimal discountAmount;
        private String status;
        private String orderNumber;
        private java.time.LocalDateTime usedAt;
        private java.time.LocalDateTime createdAt;
    }

    @Data
    public static class ReviewSummary {
        private Long id;
        private Long productId;
        private String productName;
        private String productImageUrl;
        private Integer rating;
        private String comment;
        private boolean active;
        private java.time.LocalDateTime createdAt;
    }
}


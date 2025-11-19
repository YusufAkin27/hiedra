package eticaret.demo.auth;

import eticaret.demo.admin.AdminNotificationService;
import eticaret.demo.common.config.AppUrlConfig;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.security.JwtService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int VERIFICATION_CODE_LENGTH = 6;
    private static final int CODE_EXPIRATION_MINUTES = 10;
    private static final int RESEND_CODE_COOLDOWN_MINUTES = 1; // 1 dakika bekleme süresi
    private static final int MAX_CODE_REQUESTS_PER_WINDOW_MINUTES = 3; // 3 dakika içinde maksimum istek sayısı
    private static final int MAX_CODE_REQUESTS_COUNT = 1; // 3 dakika içinde maksimum 1 istek

    private final AppUserRepository appUserRepository;
    private final AuthVerificationCodeRepository verificationCodeRepository;
    private final MailService mailService;
    private final JwtService jwtService;
    private final AppUrlConfig appUrlConfig;
    private final AdminNotificationService adminNotificationService;
    private final eticaret.demo.contract.ContractService contractService;

    @Transactional
    public void requestLoginCode(String email, String ipAddress, String userAgent) {
        String normalizedEmail = normalizeEmail(email);

        AppUser user = appUserRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseGet(() -> createNewUser(normalizedEmail));

        requestLoginCodeForUser(user, ipAddress, userAgent);
    }

    @Transactional
    public void requestAdminLoginCode(String email, String ipAddress, String userAgent) {
        AppUser admin = getAdminUserOrThrow(email);
        requestLoginCodeForUser(admin, ipAddress, userAgent);
    }

    @Transactional
    public AuthResponse verifyLoginCode(String email, String code, String ipAddress, String userAgent, jakarta.servlet.http.HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        AppUser user = appUserRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new AuthException("Bu email ile kayıtlı kullanıcı bulunamadı."));

        return verifyLoginCodeForUser(user, code, ipAddress, userAgent, request);
    }

    @Transactional
    public AuthResponse verifyAdminLoginCode(String email, String code, String ipAddress, String userAgent, jakarta.servlet.http.HttpServletRequest request) {
        AppUser admin = getAdminUserOrThrow(email);
        return verifyLoginCodeForUser(admin, code, ipAddress, userAgent, request);
    }

    @Transactional
    public void resendLoginCode(String email, String ipAddress, String userAgent) {
        requestLoginCode(email, ipAddress, userAgent);
    }

    @Transactional
    public void resendAdminLoginCode(String email, String ipAddress, String userAgent) {
        requestAdminLoginCode(email, ipAddress, userAgent);
    }

    public boolean isAdminEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        return appUserRepository.findByEmailIgnoreCaseAndRole(normalizedEmail, UserRole.ADMIN)
                .isPresent();
    }

    private void sendVerificationEmail(AppUser user, String code) {
        String emailBody;
        String subject;

        // Admin ve normal kullanıcı için farklı e-posta şablonları
        if (user.getRole() == UserRole.ADMIN) {
            emailBody = mailService.buildAdminOtpEmail(user.getEmail(), code, appUrlConfig.getAdminLoginUrl());
            subject = String.format("Doğrulama Kodu: %s", code);
        } else {
            emailBody = mailService.buildUserOtpEmail(user.getEmail(), code, appUrlConfig.getLoginUrl());
            subject = "HIEDRA HOME COLLECTION Giriş Doğrulama Kodunuz";
        }

        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(user.getEmail())
                .subject(subject)
                .body(emailBody)
                .isHtml(true)
                .build();

        mailService.queueEmail(emailMessage);
    }

    private AppUser createNewUser(String email) {
        AppUser newUser = appUserRepository.save(AppUser.builder()
                .email(email)
                .role(UserRole.USER)
                .emailVerified(false)
                .active(false)
                .build());

        // Admin bildirimi gönder
        try {
            adminNotificationService.sendUserNotification(
                    newUser.getEmail(),
                    newUser.getFullName()
            );
        } catch (Exception e) {
            log.error("Kullanıcı bildirimi gönderilemedi: {}", e.getMessage(), e);
        }

        return newUser;
    }

    /**
     * Yeni kayıt olan kullanıcı için gerekli sözleşmeleri otomatik onayla
     * Kullanım Koşulları, Gizlilik Politikası, KVKK, Mesafeli Satış Sözleşmesi, Çerez Politikası
     */
    @Transactional
    public void autoAcceptRequiredContracts(AppUser user, jakarta.servlet.http.HttpServletRequest request) {
        try {
            // Otomatik onaylanacak sözleşme türleri
            // Kullanım Koşulları, Gizlilik Politikası, KVKK, Mesafeli Satış Sözleşmesi
            eticaret.demo.contract.ContractType[] requiredContractTypes = {
                eticaret.demo.contract.ContractType.KULLANIM,      // Kullanım Koşulları
                eticaret.demo.contract.ContractType.GIZLILIK,      // Gizlilik Politikası
                eticaret.demo.contract.ContractType.KVKK,          // KVKK Aydınlatma Metni
                eticaret.demo.contract.ContractType.SATIS          // Mesafeli Satış Sözleşmesi
            };

            for (eticaret.demo.contract.ContractType contractType : requiredContractTypes) {
                try {
                    eticaret.demo.contract.Contract contract = contractService.getLatestActiveContractByType(contractType);
                    
                    // Eğer zaten onaylanmamışsa onayla
                    if (!contractService.isContractAccepted(contract.getId(), user.getId(), null)) {
                        contractService.acceptContract(contract.getId(), user, null, request);
                        log.info("Kullanıcı {} için {} sözleşmesi otomatik onaylandı", user.getEmail(), contractType.getDisplayName());
                    }
                } catch (Exception e) {
                    // Sözleşme bulunamazsa veya hata olursa logla ama devam et
                    log.warn("Kullanıcı {} için {} sözleşmesi otomatik onaylanamadı: {}", 
                            user.getEmail(), contractType.getDisplayName(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Kullanıcı {} için sözleşmeler otomatik onaylanırken hata: {}", user.getEmail(), e.getMessage(), e);
        }
    }

    private void invalidatePendingCodes(AppUser user) {
        var pendingCodes = verificationCodeRepository.findByUserAndUsedFalse(user);
        if (pendingCodes.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        pendingCodes.forEach(code -> {
            code.setUsed(true);
            code.setUsedAt(now);
        });
        verificationCodeRepository.saveAll(pendingCodes);
    }

    private void invalidatePendingCodesExcept(AppUser user, AuthVerificationCode exceptCode) {
        if (exceptCode == null || exceptCode.getId() == null) {
            // Yeni kod henüz kaydedilmemişse, sadece tüm kodları iptal et
            invalidatePendingCodes(user);
            return;
        }

        var pendingCodes = verificationCodeRepository.findByUserAndUsedFalse(user);
        if (pendingCodes.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        Long exceptCodeId = exceptCode.getId();

        // Yeni kod hariç tüm eski kodları iptal et
        pendingCodes.stream()
                .filter(code -> {
                    // Yeni kodun ID'si ile karşılaştır
                    if (code.getId() == null) {
                        return true; // ID'si olmayan kodları iptal et
                    }
                    return !code.getId().equals(exceptCodeId);
                })
                .forEach(code -> {
                    code.setUsed(true);
                    code.setUsedAt(now);
                });

        verificationCodeRepository.saveAll(pendingCodes);
    }

    private String generateVerificationCode() {
        StringBuilder builder = new StringBuilder(VERIFICATION_CODE_LENGTH);
        for (int i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
            builder.append(RANDOM.nextInt(10));
        }
        return builder.toString();
    }

    private void requestLoginCodeForUser(AppUser user, String ipAddress, String userAgent) {
        LocalDateTime now = LocalDateTime.now();

        // 1. Spam koruması: Son kod gönderiminden 1 dakika geçmiş mi kontrol et
        if (user.getLastVerificationCodeSentAt() != null) {
            LocalDateTime lastSent = user.getLastVerificationCodeSentAt();
            LocalDateTime cooldownEnd = lastSent.plusMinutes(RESEND_CODE_COOLDOWN_MINUTES);

            if (now.isBefore(cooldownEnd)) {
                long secondsRemaining = java.time.Duration.between(now, cooldownEnd).getSeconds();
                throw new AuthException(String.format(
                        "Lütfen %d saniye sonra tekrar deneyin. Spam koruması aktif.",
                        secondsRemaining
                ));
            }
        }

        // 2. Spam koruması: Son 3 dakika içinde kod isteği var mı kontrol et
        LocalDateTime windowStart = now.minusMinutes(MAX_CODE_REQUESTS_PER_WINDOW_MINUTES);
        long recentCodeRequests = verificationCodeRepository
                .findByUserAndCreatedAtAfter(user, windowStart)
                .size();

        if (recentCodeRequests >= MAX_CODE_REQUESTS_COUNT) {
            throw new AuthException(
                    String.format(
                            "Çok fazla kod isteği yapıldı. Lütfen %d dakika sonra tekrar deneyin.",
                            MAX_CODE_REQUESTS_PER_WINDOW_MINUTES
                    )
            );
        }

        // Önce eski kodları iptal et
        invalidatePendingCodes(user);

        String verificationCode = generateVerificationCode();

        AuthVerificationCode codeEntity = AuthVerificationCode.builder()
                .user(user)
                .code(verificationCode)
                .expiresAt(now.plusMinutes(CODE_EXPIRATION_MINUTES))
                .used(false)
                .attemptCount(0)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .channel(VerificationChannel.EMAIL)
                .createdAt(now) // Manuel olarak ayarla (PrePersist'ten önce)
                .build();

        // Yeni kodu kaydet (createdAt PrePersist ile ayarlanacak ama biz zaten ayarladık)
        verificationCodeRepository.save(codeEntity);

        // Flush yaparak ID'nin atandığından emin ol
        verificationCodeRepository.flush();

        // Yeni kod oluşturulduktan sonra, yeni kod hariç tüm eski kodları iptal et
        // (race condition veya transaction sorunlarını önlemek için)
        invalidatePendingCodesExcept(user, codeEntity);

        user.setLastVerificationCodeSentAt(now);
        appUserRepository.save(user);

        sendVerificationEmail(user, verificationCode);
        log.info("Doğrulama kodu {} için gönderildi (rol: {}). Eski kodlar iptal edildi.", user.getEmail(), user.getRole());
    }

    private AuthResponse verifyLoginCodeForUser(AppUser user, String code, String ipAddress, String userAgent, jakarta.servlet.http.HttpServletRequest request) {
        AuthVerificationCode verification = verificationCodeRepository
                .findTopByUserAndCodeAndUsedFalseOrderByCreatedAtDesc(user, code)
                .orElseThrow(() -> new AuthException("Geçersiz doğrulama kodu."));

        verification.incrementAttemptCount();

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            verificationCodeRepository.save(verification);
            throw new AuthException("Doğrulama kodunun süresi dolmuş. Lütfen yeni kod talep edin.");
        }

        verification.setUsed(true);
        verification.setUsedAt(LocalDateTime.now());
        verification.setIpAddress(ipAddress);
        verification.setUserAgent(userAgent);
        verificationCodeRepository.save(verification);

        boolean isFirstTimeEmailVerification = !user.isEmailVerified();
        user.setEmailVerified(true);
        user.setActive(true);
        user.setLastLoginAt(LocalDateTime.now());
        appUserRepository.save(user);

        // İlk kez email doğrulandıysa (yeni kayıt), gerekli sözleşmeleri otomatik onayla
        if (isFirstTimeEmailVerification && request != null) {
            try {
                autoAcceptRequiredContracts(user, request);
            } catch (Exception e) {
                log.error("Sözleşmeler otomatik onaylanırken hata: {}", e.getMessage(), e);
            }
        }

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(AppUser user) {
        String token = jwtService.generateAccessToken(user);

        return AuthResponse.builder()
                .accessToken(token)
                .expiresIn(jwtService.getAccessTokenValidityMillis())
                .user(UserSummary.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .emailVerified(user.isEmailVerified())
                        .active(user.isActive())
                        .lastLoginAt(user.getLastLoginAt())
                        .build())
                .build();
    }

    private AppUser getAdminUserOrThrow(String email) {
        String normalizedEmail = normalizeEmail(email);
        return appUserRepository.findByEmailIgnoreCaseAndRole(normalizedEmail, UserRole.ADMIN)
                .orElseThrow(() -> new AuthException("Bu e-posta için yönetici yetkisi bulunmuyor."));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new AuthException("Email adresi zorunludur.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * OAuth2 için auth response oluştur
     */
    public AuthResponse buildAuthResponseForOAuth2(AppUser user) {
        return buildAuthResponse(user);
    }

    /**
     * Email ile kullanıcıyı bul veya oluştur (OAuth2 için)
     */
    @Transactional
    public AppUser findOrCreateUserByEmail(String email, String fullName, jakarta.servlet.http.HttpServletRequest request) {
        return findOrCreateUserByEmail(email, fullName, null, request);
    }
    
    /**
     * Email ile kullanıcıyı bul veya oluştur (OAuth2 için) - telefon numarası ile
     */
    @Transactional
    public AppUser findOrCreateUserByEmail(String email, String fullName, String phone, jakarta.servlet.http.HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);

        Optional<AppUser> existingUserOpt = appUserRepository.findByEmailIgnoreCase(normalizedEmail);
        boolean isNewUser = existingUserOpt.isEmpty();
        
        AppUser user = existingUserOpt.orElseGet(() -> {
            AppUser newUser = AppUser.builder()
                    .email(normalizedEmail)
                    .fullName(fullName)
                    .phone(phone)
                    .role(UserRole.USER)
                    .emailVerified(true)
                    .active(true)
                    .build();
            AppUser savedUser = appUserRepository.save(newUser);
            log.info("OAuth2 ile yeni kullanıcı oluşturuldu: {}", savedUser.getEmail());
            return savedUser;
        });

        // Yeni kullanıcı oluşturulduysa sözleşmeleri otomatik onayla
        if (isNewUser && request != null) {
            try {
                log.info("OAuth2 yeni kullanıcı için sözleşmeler otomatik onaylanıyor: {}", user.getEmail());
                autoAcceptRequiredContracts(user, request);
                log.info("OAuth2 yeni kullanıcı için sözleşmeler başarıyla onaylandı: {}", user.getEmail());
            } catch (Exception e) {
                log.error("OAuth2 yeni kullanıcı için sözleşmeler otomatik onaylanırken hata: {}", e.getMessage(), e);
            }
        } else if (isNewUser) {
            log.warn("OAuth2 yeni kullanıcı oluşturuldu ancak HttpServletRequest null, sözleşmeler onaylanamadı: {}", user.getEmail());
        }

        // Kullanıcı varsa güncelle - Google'dan gelen veriler her zaman güncel olsun
        boolean needsUpdate = false;
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            needsUpdate = true;
        }
        if (!user.isActive()) {
            user.setActive(true);
            needsUpdate = true;
        }
        // Ad soyadı her zaman güncelle (Google'dan gelen veri daha güncel olabilir)
        if (fullName != null && !fullName.isEmpty() && !fullName.equals(user.getFullName())) {
            user.setFullName(fullName);
            needsUpdate = true;
        }
        // Telefon numarasını güncelle (varsa ve farklıysa)
        if (phone != null && !phone.isEmpty() && !phone.equals(user.getPhone())) {
            user.setPhone(phone);
            needsUpdate = true;
        }
        user.setLastLoginAt(LocalDateTime.now());
        needsUpdate = true;

        if (needsUpdate) {
            appUserRepository.save(user);
        }

        return user;
    }
}

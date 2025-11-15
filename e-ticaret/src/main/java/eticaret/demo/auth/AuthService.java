package eticaret.demo.auth;

import eticaret.demo.admin.AdminNotificationService;
import eticaret.demo.config.AppUrlConfig;
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
            emailBody = buildAdminVerificationEmailTemplate(user.getEmail(), code, appUrlConfig.getAdminLoginUrl());
            subject = String.format("Doğrulama Kodu: %s", code);
        } else {
            emailBody = buildUserVerificationEmailTemplate(user.getEmail(), code);
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
     * Admin kullanıcılar için özel e-posta şablonu
     */
    private String buildAdminVerificationEmailTemplate(String email, String code, String loginUrl) {
        return String.format("""
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
                            background-color: #f5f5f5; 
                            margin: 0; 
                            padding: 0; 
                            line-height: 1.6;
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 40px auto; 
                            padding: 20px; 
                        }
                        .card { 
                            background-color: #ffffff; 
                            border-radius: 12px; 
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); 
                            overflow: hidden; 
                            border: 1px solid #e0e0e0; 
                        }
                        .header { 
                            background-color: #000000; 
                            color: #ffffff; 
                            padding: 40px 32px; 
                            text-align: center; 
                        }
                        .header h1 { 
                            margin: 0; 
                            font-size: 28px; 
                            letter-spacing: -0.5px; 
                            font-weight: 700; 
                            margin-bottom: 8px;
                        }
                        .header .subtitle {
                            font-size: 14px;
                            color: rgba(255, 255, 255, 0.8);
                            font-weight: 400;
                            margin-top: 4px;
                        }
                        .content { 
                            padding: 40px 32px; 
                            color: #1a1a1a; 
                        }
                        .greeting {
                            font-size: 16px;
                            color: #333333;
                            margin-bottom: 20px;
                        }
                        .description {
                            font-size: 15px;
                            color: #666666;
                            margin-bottom: 32px;
                            line-height: 1.7;
                        }
                        .code-box { 
                            background: linear-gradient(135deg, #f9f9f9 0%%, #f5f5f5 100%%); 
                            border-radius: 8px; 
                            padding: 32px 24px; 
                            text-align: center; 
                            margin: 32px 0; 
                            border: 2px solid #e0e0e0;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        }
                        .code-label {
                            font-size: 13px;
                            color: #666666;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            margin-bottom: 16px;
                            font-weight: 600;
                        }
                        .code { 
                            font-size: 48px; 
                            font-weight: 700; 
                            color: #000000; 
                            letter-spacing: 8px; 
                            font-variant-numeric: tabular-nums;
                            font-family: 'Courier New', monospace;
                        }
                        .info-section {
                            margin-top: 32px;
                            padding-top: 24px;
                            border-top: 1px solid #e0e0e0;
                        }
                        .info-item {
                            font-size: 14px;
                            color: #666666;
                            line-height: 1.8;
                            margin-bottom: 12px;
                        }
                        .info-item strong {
                            color: #333333;
                            font-weight: 600;
                        }
                        .warning-box {
                            background-color: #fff9e6;
                            border-left: 4px solid #ffc107;
                            padding: 16px;
                            margin: 24px 0;
                            border-radius: 4px;
                        }
                        .warning-box strong {
                            color: #856404;
                            font-weight: 600;
                            display: block;
                            margin-bottom: 6px;
                        }
                        .warning-box p {
                            color: #856404;
                            font-size: 14px;
                            margin: 0;
                            line-height: 1.6;
                        }
                        .button-container {
                            text-align: center;
                            margin: 32px 0;
                        }
                        .login-button {
                            display: inline-block;
                            background-color: #000000;
                            color: #ffffff;
                            padding: 14px 32px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 15px;
                            transition: background-color 0.2s ease;
                        }
                        .login-button:hover {
                            background-color: #1a1a1a;
                        }
                        .footer { 
                            padding: 32px; 
                            font-size: 12px; 
                            color: #999999; 
                            text-align: center; 
                            background-color: #f9f9f9;
                            border-top: 1px solid #e0e0e0;
                        }
                        .footer p {
                            margin: 4px 0;
                        }
                        .footer .brand {
                            font-weight: 600;
                            color: #333333;
                            font-size: 13px;
                        }
                        @media only screen and (max-width: 600px) {
                            .container { margin: 20px auto; padding: 16px; }
                            .header { padding: 32px 24px; }
                            .header h1 { font-size: 24px; }
                            .content { padding: 32px 24px; }
                            .code { font-size: 36px; letter-spacing: 6px; }
                            .code-box { padding: 24px 16px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1>Doğrulama Kodu</h1>
                                <p class="subtitle">HIEDRA HOME COLLECTION</p>
                            </div>
                            <div class="content">
                                <p class="greeting"><strong>Sayın Yönetici,</strong></p>
                                <p class="description">
                                    Yönetici paneline giriş yapmak için aşağıdaki doğrulama kodunu kullanın.
                                </p>
                                <div class="code-box">
                                    <div class="code-label">Doğrulama Kodu</div>
                                    <div class="code">%s</div>
                                </div>
                                <p style="text-align: center; margin-top: 16px; font-size: 14px; color: #666666;">
                                    Yukarıdaki kodu yönetici paneli giriş sayfasına girin.
                                </p>
                                <div class="info-section">
                                    <div class="info-item">
                                        <strong>Süre:</strong> Bu kod %d dakika boyunca geçerlidir.
                                    </div>
                                    <div class="info-item">
                                        <strong>Kullanım:</strong> Kodlar tek kullanımlıktır ve sadece son gönderilen kod geçerlidir.
                                    </div>
                                    <div class="info-item">
                                        <strong>Güvenlik:</strong> Bu kodu kimseyle paylaşmayın.
                                    </div>
                                </div>
                                <div class="warning-box">
                                    <strong>Güvenlik Uyarısı</strong>
                                    <p>
                                        Bu kod sadece yönetici paneli girişi için kullanılır. 
                                        Eğer bu işlemi siz başlatmadıysanız, lütfen derhal güvenlik ekibimizle iletişime geçin.
                                    </p>
                                </div>
                                <div class="button-container">
                                    <a href="%s" class="login-button">Yönetici Paneline Giriş Yap</a>
                                </div>
                            </div>
                            <div class="footer">
                                <p class="brand">HIEDRA HOME COLLECTION</p>
                                <p>Yönetici Paneli Güvenlik Sistemi</p>
                                <p style="margin-top: 12px;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """, code, CODE_EXPIRATION_MINUTES, loginUrl);
    }

    /**
     * Normal kullanıcılar için e-posta şablonu
     */
    private String buildUserVerificationEmailTemplate(String email, String code) {
        // Kodu hanelere ayır
        String codeHtml = code.chars()
                .mapToObj(c -> String.valueOf((char) c))
                .map(digit -> String.format("<span class=\"code-digit\">%s</span>", digit))
                .collect(java.util.stream.Collectors.joining());
        
        return String.format("""
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
                            background: linear-gradient(135deg, #f8fafc 0%%, #e2e8f0 100%%); 
                            margin: 0; 
                            padding: 20px; 
                            line-height: 1.6;
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 0 auto; 
                        }
                        .card { 
                            background-color: #ffffff; 
                            border-radius: 20px; 
                            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15); 
                            overflow: hidden; 
                            border: 1px solid rgba(102, 126, 234, 0.1);
                        }
                        .header { 
                            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); 
                            color: #ffffff; 
                            padding: 40px 32px; 
                            text-align: center; 
                        }
                        .header h1 { 
                            margin: 0 0 12px 0; 
                            font-size: 28px; 
                            font-weight: 700; 
                            letter-spacing: -0.5px;
                        }
                        .header .subtitle {
                            font-size: 14px;
                            color: rgba(255, 255, 255, 0.9);
                            margin-bottom: 32px;
                            font-weight: 400;
                        }
                        .code-container {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            gap: 12px;
                            margin: 24px 0;
                            flex-wrap: wrap;
                        }
                        .code-digit {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            width: 56px;
                            height: 64px;
                            background: rgba(255, 255, 255, 0.95);
                            color: #667eea;
                            font-size: 32px;
                            font-weight: 700;
                            border-radius: 12px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                            font-family: 'Courier New', monospace;
                            letter-spacing: 0;
                        }
                        .content { 
                            padding: 40px 32px; 
                            color: #1e293b; 
                        }
                        .greeting {
                            font-size: 16px;
                            color: #475569;
                            margin-bottom: 20px;
                            font-weight: 500;
                        }
                        .description {
                            font-size: 15px;
                            color: #64748b;
                            margin-bottom: 32px;
                            line-height: 1.7;
                        }
                        .info-section {
                            margin-top: 32px;
                            padding-top: 24px;
                            border-top: 1px solid #e2e8f0;
                        }
                        .info-item {
                            display: flex;
                            align-items: flex-start;
                            gap: 12px;
                            font-size: 14px;
                            color: #64748b;
                            line-height: 1.7;
                            margin-bottom: 16px;
                        }
                        .info-item strong {
                            color: #1e293b;
                            font-weight: 600;
                        }
                        .info-icon {
                            flex-shrink: 0;
                            margin-top: 2px;
                        }
                        .footer { 
                            padding: 32px; 
                            font-size: 12px; 
                            color: #94a3b8; 
                            text-align: center; 
                            background: linear-gradient(135deg, #f8fafc 0%%, #f1f5f9 100%%);
                            border-top: 1px solid #e2e8f0;
                        }
                        .footer p {
                            margin: 4px 0;
                        }
                        .footer .brand {
                            font-weight: 700;
                            color: #667eea;
                            font-size: 14px;
                            margin-bottom: 8px;
                        }
                        @media only screen and (max-width: 600px) {
                            body { padding: 12px; }
                            .container { margin: 0; }
                            .header { padding: 32px 24px; }
                            .header h1 { font-size: 24px; }
                            .content { padding: 32px 24px; }
                            .code-digit { 
                                width: 48px; 
                                height: 56px; 
                                font-size: 28px; 
                            }
                            .code-container { gap: 8px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1>Doğrulama Kodunuz</h1>
                                <p class="subtitle">HIEDRA HOME COLLECTION</p>
                                <div class="code-container">
                                    %s
                                </div>
                            </div>
                            <div class="content">
                                <p class="greeting">Merhaba,</p>
                                <p class="description">
                                    <strong>HIEDRA HOME COLLECTION</strong> hesabınıza güvenli bir şekilde giriş yapmak için yukarıdaki doğrulama kodunu kullanın.
                                </p>
                                <div class="info-section">
                                    <div class="info-item">
                                        <span class="info-icon">⏱</span>
                                        <span>Bu kod <strong>%d dakika</strong> boyunca geçerlidir. Bu işlemi siz başlatmadıysanız, lütfen bu e-postayı dikkate almayın.</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-icon">🔒</span>
                                        <span>Kodlar tek kullanımlıktır ve sadece son gönderilen kod geçerlidir.</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-icon">✨</span>
                                        <span>Hesabınız yoksa otomatik olarak oluşturulacaktır.</span>
                                    </div>
                                </div>
                            </div>
                            <div class="footer">
                                <p class="brand">HIEDRA HOME COLLECTION</p>
                                <p>Güvenli Giriş Sistemi</p>
                                <p style="margin-top: 12px;">Alışveriş deneyiminiz için teşekkür ederiz!</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """, codeHtml, CODE_EXPIRATION_MINUTES);
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

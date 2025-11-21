package eticaret.demo.order.lookup;

import eticaret.demo.common.config.AppUrlConfig;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderLookupVerificationService {

    private static final Duration CODE_EXPIRATION = Duration.ofMinutes(10);
    private static final Duration TOKEN_EXPIRATION = Duration.ofMinutes(30);
    private static final Duration RESEND_INTERVAL = Duration.ofSeconds(45);
    private static final int MAX_ATTEMPTS = 5;

    private final OrderLookupSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final AppUrlConfig appUrlConfig;
    private final SecureRandom secureRandom = new SecureRandom();

    public void sendVerificationCode(String email) {
        String normalizedEmail = normalizeEmail(email);
        Instant now = Instant.now();

        OrderLookupSession session = sessionRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> {
                    OrderLookupSession created = new OrderLookupSession();
                    created.setEmail(normalizedEmail);
                    return created;
                });

        if (session.getLastCodeSentAt() != null &&
                now.isBefore(session.getLastCodeSentAt().plus(RESEND_INTERVAL))) {
            long secondsLeft = Duration.between(now, session.getLastCodeSentAt().plus(RESEND_INTERVAL)).toSeconds();
            throw new IllegalStateException("Yeni kod gönderebilmek için lütfen " + secondsLeft + " saniye daha bekleyin.");
        }

        String code = generateVerificationCode();
        session.setCodeHash(passwordEncoder.encode(code));
        session.setCodeExpiresAt(now.plus(CODE_EXPIRATION));
        session.setLastCodeSentAt(now);
        session.setAttemptCount(0);
        session.setSendCount(Optional.ofNullable(session.getSendCount()).orElse(0) + 1);
        session.setActiveToken(null);
        session.setTokenExpiresAt(null);

        sessionRepository.save(session);

        String emailBody = mailService.buildOrderLookupCodeEmail(
                normalizedEmail,
                code,
                appUrlConfig.getFrontendUrl() + "/siparis-sorgula"
        );

        mailService.queueEmail(EmailMessage.builder()
                .toEmail(normalizedEmail)
                .subject("Siparişlerinizi görüntülemek için doğrulama kodunuz")
                .body(emailBody)
                .isHtml(true)
                .build());

        log.info("Order lookup doğrulama kodu gönderildi: {}", normalizedEmail);
    }

    @Transactional
    public OrderLookupVerificationResult verifyCode(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        OrderLookupSession session = sessionRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Bu e-posta için gönderilmiş aktif bir doğrulama kodu bulunamadı."));

        Instant now = Instant.now();

        if (session.getCodeExpiresAt() == null || now.isAfter(session.getCodeExpiresAt())) {
            throw new IllegalStateException("Doğrulama kodunun süresi dolmuş. Lütfen yeniden kod talep edin.");
        }

        int attempts = Optional.ofNullable(session.getAttemptCount()).orElse(0);
        if (attempts >= MAX_ATTEMPTS) {
            throw new IllegalStateException("Çok fazla hatalı deneme yapıldı. Lütfen yeniden kod talep edin.");
        }

        if (code == null || code.trim().isEmpty()) {
            throw new IllegalArgumentException("Doğrulama kodu zorunludur.");
        }

        String trimmedCode = code.trim();

        if (!passwordEncoder.matches(trimmedCode, session.getCodeHash())) {
            session.setAttemptCount(attempts + 1);
            sessionRepository.save(session);
            throw new IllegalArgumentException("Doğrulama kodu hatalı. Lütfen tekrar deneyiniz.");
        }

        session.setAttemptCount(0);
        session.setCodeHash(null);
        session.setCodeExpiresAt(null);

        String token = generateToken();
        session.setActiveToken(token);
        session.setTokenExpiresAt(now.plus(TOKEN_EXPIRATION));

        sessionRepository.save(session);

        log.info("Order lookup doğrulaması başarılı: {}", normalizedEmail);
        return new OrderLookupVerificationResult(token, session.getTokenExpiresAt());
    }

    public String requireValidToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Lookup oturumu bulunamadı. Lütfen doğrulama kodu giriniz.");
        }

        OrderLookupSession session = sessionRepository.findByActiveToken(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Lookup oturumu geçersiz veya süresi dolmuş."));

        Instant now = Instant.now();
        if (session.getTokenExpiresAt() == null || now.isAfter(session.getTokenExpiresAt())) {
            session.setActiveToken(null);
            session.setTokenExpiresAt(null);
            sessionRepository.save(session);
            throw new IllegalArgumentException("Lookup oturumunun süresi dolmuş. Lütfen doğrulama kodu ile tekrar giriş yapın.");
        }

        return session.getEmail();
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("E-posta adresi zorunludur.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateVerificationCode() {
        int number = secureRandom.nextInt(900_000) + 100_000;
        return String.valueOf(number);
    }

    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}


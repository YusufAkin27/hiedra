package eticaret.demo.security;

import eticaret.demo.auth.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Email doğrulama kodları için güvenlik servisi
 * Rate limiting, brute force koruması, account lockout
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationSecurityService {
    
    private final AppUserRepository appUserRepository;
    private final RateLimitingService rateLimitingService;
    
    // Email bazlı kod deneme sayısı (son 15 dakika)
    private final Map<String, VerificationAttempt> emailAttempts = new ConcurrentHashMap<>();
    
    // IP bazlı kod deneme sayısı
    private final Map<String, VerificationAttempt> ipAttempts = new ConcurrentHashMap<>();
    
    // Account lockout kayıtları
    private final Map<String, AccountLockout> accountLockouts = new ConcurrentHashMap<>();
    
    // Maksimum kod deneme sayısı (15 dakika içinde)
    private static final int MAX_VERIFICATION_ATTEMPTS = 5;
    
    // Account lockout süresi (dakika)
    private static final int LOCKOUT_DURATION_MINUTES = 30;
    
    // Temizleme aralığı
    private static final long CLEANUP_INTERVAL_MS = 300000; // 5 dakika
    private long lastCleanupTime = System.currentTimeMillis();
    
    /**
     * Email doğrulama kodu isteme kontrolü
     * @param email Email adresi
     * @param ipAddress IP adresi
     * @return true eğer kod gönderilebilir
     */
    public boolean canRequestCode(String email, String ipAddress) {
        cleanup();
        
        String normalizedEmail = email.toLowerCase().trim();
        
        // Account lockout kontrolü
        if (isAccountLocked(normalizedEmail)) {
            log.warn("Email doğrulama kodu isteği engellendi - hesap kilitli: {}", normalizedEmail);
            return false;
        }
        
        // Email bazlı rate limiting (15 dakikada 3 kod)
        if (!rateLimitingService.isEmailAllowed(normalizedEmail, 3, 900)) {
            log.warn("Email doğrulama kodu isteği engellendi - rate limit: {}", normalizedEmail);
            return false;
        }
        
        // IP bazlı rate limiting (15 dakikada 5 kod)
        if (!rateLimitingService.isAllowed(ipAddress, 5, 900)) {
            log.warn("Email doğrulama kodu isteği engellendi - IP rate limit: {}", ipAddress);
            return false;
        }
        
        return true;
    }
    
    /**
     * Email doğrulama kodu doğrulama kontrolü
     * @param email Email adresi
     * @param code Doğrulama kodu
     * @param ipAddress IP adresi
     * @return VerificationResult
     */
    @Transactional
    public VerificationResult canVerifyCode(String email, String code, String ipAddress) {
        cleanup();
        
        String normalizedEmail = email.toLowerCase().trim();
        VerificationResult result = new VerificationResult();
        
        // Account lockout kontrolü
        if (isAccountLocked(normalizedEmail)) {
            AccountLockout lockout = accountLockouts.get(normalizedEmail);
            result.setAllowed(false);
            result.setLocked(true);
            result.setLockoutUntil(lockout.getLockedUntil());
            result.setMessage("Hesap geçici olarak kilitlendi. Lütfen " + 
                lockout.getLockedUntil().toString() + " tarihinden sonra tekrar deneyin.");
            log.warn("Email doğrulama kodu doğrulama engellendi - hesap kilitli: {}", normalizedEmail);
            return result;
        }
        
        // Email bazlı deneme sayısı kontrolü
        VerificationAttempt emailAttempt = emailAttempts.computeIfAbsent(
            normalizedEmail, 
            k -> new VerificationAttempt()
        );
        
        if (emailAttempt.getAttemptCount() >= MAX_VERIFICATION_ATTEMPTS) {
            // Account lockout uygula
            lockAccount(normalizedEmail);
            result.setAllowed(false);
            result.setLocked(true);
            result.setMessage("Çok fazla başarısız deneme. Hesap 30 dakika süreyle kilitlendi.");
            log.warn("Hesap kilitlendi - çok fazla başarısız deneme: {}", normalizedEmail);
            return result;
        }
        
        // IP bazlı deneme sayısı kontrolü
        VerificationAttempt ipAttempt = ipAttempts.computeIfAbsent(
            ipAddress,
            k -> new VerificationAttempt()
        );
        
        if (ipAttempt.getAttemptCount() >= MAX_VERIFICATION_ATTEMPTS * 2) {
            result.setAllowed(false);
            result.setMessage("Bu IP adresinden çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin.");
            log.warn("IP bazlı doğrulama engellendi: {}", ipAddress);
            return result;
        }
        
        result.setAllowed(true);
        return result;
    }
    
    /**
     * Başarılı doğrulama sonrası temizlik
     */
    public void onVerificationSuccess(String email, String ipAddress) {
        String normalizedEmail = email.toLowerCase().trim();
        
        // Email bazlı deneme sayacını sıfırla
        emailAttempts.remove(normalizedEmail);
        
        // IP bazlı deneme sayacını sıfırla
        ipAttempts.remove(ipAddress);
        
        // Account lockout'u kaldır
        accountLockouts.remove(normalizedEmail);
        
        log.info("Email doğrulama başarılı - temizlik yapıldı: {}", normalizedEmail);
    }
    
    /**
     * Başarısız doğrulama sonrası kayıt
     */
    public void onVerificationFailure(String email, String ipAddress) {
        String normalizedEmail = email.toLowerCase().trim();
        
        // Email bazlı deneme sayacını artır
        VerificationAttempt emailAttempt = emailAttempts.computeIfAbsent(
            normalizedEmail,
            k -> new VerificationAttempt()
        );
        emailAttempt.increment();
        
        // IP bazlı deneme sayacını artır
        VerificationAttempt ipAttempt = ipAttempts.computeIfAbsent(
            ipAddress,
            k -> new VerificationAttempt()
        );
        ipAttempt.increment();
        
        log.warn("Email doğrulama başarısız - deneme sayısı artırıldı: email={}, ip={}, emailAttempts={}, ipAttempts={}",
            normalizedEmail, ipAddress, emailAttempt.getAttemptCount(), ipAttempt.getAttemptCount());
    }
    
    /**
     * Hesabı kilitle
     */
    private void lockAccount(String email) {
        LocalDateTime lockedUntil = LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES);
        accountLockouts.put(email, new AccountLockout(lockedUntil));
        
        // Veritabanında da işaretle (opsiyonel)
        appUserRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            // İleride account lockout için bir alan eklenebilir
            log.info("Hesap kilitlendi (in-memory): {}", email);
        });
    }
    
    /**
     * Hesap kilitli mi kontrol et
     */
    private boolean isAccountLocked(String email) {
        AccountLockout lockout = accountLockouts.get(email);
        if (lockout == null) {
            return false;
        }
        
        if (LocalDateTime.now().isAfter(lockout.getLockedUntil())) {
            // Lockout süresi dolmuş, kaldır
            accountLockouts.remove(email);
            return false;
        }
        
        return true;
    }
    
    /**
     * Eski kayıtları temizle
     */
    private void cleanup() {
        long now = System.currentTimeMillis();
        if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
            return;
        }
        
        lastCleanupTime = now;
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        
        // Eski deneme kayıtlarını temizle
        emailAttempts.entrySet().removeIf(entry -> entry.getValue().isExpired(cutoff));
        ipAttempts.entrySet().removeIf(entry -> entry.getValue().isExpired(cutoff));
        
        // Süresi dolmuş lockout'ları temizle
        accountLockouts.entrySet().removeIf(entry -> 
            LocalDateTime.now().isAfter(entry.getValue().getLockedUntil())
        );
        
        log.debug("Email verification security temizliği yapıldı. Email attempts: {}, IP attempts: {}, Lockouts: {}",
            emailAttempts.size(), ipAttempts.size(), accountLockouts.size());
    }
    
    /**
     * Doğrulama sonucu
     */
    public static class VerificationResult {
        private boolean allowed = false;
        private boolean locked = false;
        private LocalDateTime lockoutUntil;
        private String message;
        
        public boolean isAllowed() {
            return allowed;
        }
        
        public void setAllowed(boolean allowed) {
            this.allowed = allowed;
        }
        
        public boolean isLocked() {
            return locked;
        }
        
        public void setLocked(boolean locked) {
            this.locked = locked;
        }
        
        public LocalDateTime getLockoutUntil() {
            return lockoutUntil;
        }
        
        public void setLockoutUntil(LocalDateTime lockoutUntil) {
            this.lockoutUntil = lockoutUntil;
        }
        
        public String getMessage() {
            return message;
        }
        
        public void setMessage(String message) {
            this.message = message;
        }
    }
    
    /**
     * Doğrulama denemesi kaydı
     */
    private static class VerificationAttempt {
        private final AtomicInteger attemptCount = new AtomicInteger(0);
        private LocalDateTime firstAttempt;
        
        public void increment() {
            if (firstAttempt == null) {
                firstAttempt = LocalDateTime.now();
            }
            attemptCount.incrementAndGet();
        }
        
        public int getAttemptCount() {
            return attemptCount.get();
        }
        
        public boolean isExpired(LocalDateTime cutoff) {
            return firstAttempt != null && firstAttempt.isBefore(cutoff);
        }
    }
    
    /**
     * Account lockout kaydı
     */
    private static class AccountLockout {
        private final LocalDateTime lockedUntil;
        
        public AccountLockout(LocalDateTime lockedUntil) {
            this.lockedUntil = lockedUntil;
        }
        
        public LocalDateTime getLockedUntil() {
            return lockedUntil;
        }
    }
}


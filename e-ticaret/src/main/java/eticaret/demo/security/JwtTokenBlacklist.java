package eticaret.demo.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JWT token blacklist servisi
 * Logout edilen token'ları takip eder
 */
@Service
@Slf4j
public class JwtTokenBlacklist {
    
    // Token blacklist (token -> expiration time)
    private final Map<String, Long> blacklistedTokens = new ConcurrentHashMap<>();
    
    // Temizleme aralığı
    private static final long CLEANUP_INTERVAL_MS = 3600000; // 1 saat
    private long lastCleanupTime = System.currentTimeMillis();
    
    /**
     * Token'ı blacklist'e ekle
     * @param token JWT token
     * @param expirationTime Token'ın expiration zamanı (milliseconds)
     */
    public void blacklistToken(String token, long expirationTime) {
        blacklistedTokens.put(token, expirationTime);
        log.debug("Token blacklist'e eklendi. Expiration: {}", Instant.ofEpochMilli(expirationTime));
    }
    
    /**
     * Token blacklist'te mi kontrol et
     * @param token JWT token
     * @return true eğer token blacklist'te
     */
    public boolean isBlacklisted(String token) {
        cleanup();
        
        Long expirationTime = blacklistedTokens.get(token);
        if (expirationTime == null) {
            return false;
        }
        
        // Token'ın expiration zamanı geçmişse blacklist'ten kaldır
        if (System.currentTimeMillis() > expirationTime) {
            blacklistedTokens.remove(token);
            return false;
        }
        
        return true;
    }
    
    /**
     * Eski token'ları temizle
     */
    private void cleanup() {
        long now = System.currentTimeMillis();
        if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
            return;
        }
        
        lastCleanupTime = now;
        
        // Expiration zamanı geçmiş token'ları kaldır
        blacklistedTokens.entrySet().removeIf(entry -> 
            System.currentTimeMillis() > entry.getValue()
        );
        
        log.debug("JWT token blacklist temizliği yapıldı. Kalan token sayısı: {}", blacklistedTokens.size());
    }
    
    /**
     * Blacklist'i temizle (test amaçlı veya admin işlemi)
     */
    public void clear() {
        blacklistedTokens.clear();
        log.info("JWT token blacklist temizlendi");
    }
    
    /**
     * Blacklist boyutunu getir
     */
    public int size() {
        return blacklistedTokens.size();
    }
}


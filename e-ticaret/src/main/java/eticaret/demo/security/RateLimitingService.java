package eticaret.demo.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiting servisi - API isteklerini sınırlar
 */
@Service
@Slf4j
public class RateLimitingService {

    // IP adresi bazlı rate limiting
    private final Map<String, RequestCounter> ipRequestCounts;
    
    // Email bazlı rate limiting (auth işlemleri için)
    private final Map<String, RequestCounter> emailRequestCounts;
    
    // Temizleme işlemi için son temizleme zamanı
    private long lastCleanupTime;
    private static final long CLEANUP_INTERVAL = 60000; // 1 dakika
    
    /**
     * Constructor - Spring bean oluşturma için gerekli
     */
    public RateLimitingService() {
        this.ipRequestCounts = new ConcurrentHashMap<>();
        this.emailRequestCounts = new ConcurrentHashMap<>();
        this.lastCleanupTime = System.currentTimeMillis();
    }

    /**
     * IP adresi için rate limit kontrolü
     * @param ipAddress IP adresi
     * @param maxRequests Maksimum istek sayısı
     * @param windowSeconds Zaman penceresi (saniye)
     * @return true eğer istek yapılabilir, false eğer limit aşıldı
     */
    public boolean isAllowed(String ipAddress, int maxRequests, int windowSeconds) {
        cleanup();
        
        RequestCounter counter = ipRequestCounts.computeIfAbsent(ipAddress, 
            k -> new RequestCounter(windowSeconds));
        
        return counter.incrementAndCheck(maxRequests);
    }

    /**
     * Email adresi için rate limit kontrolü (auth işlemleri için)
     */
    public boolean isEmailAllowed(String email, int maxRequests, int windowSeconds) {
        cleanup();
        
        RequestCounter counter = emailRequestCounts.computeIfAbsent(email.toLowerCase(), 
            k -> new RequestCounter(windowSeconds));
        
        return counter.incrementAndCheck(maxRequests);
    }

    /**
     * Eski kayıtları temizle
     */
    private void cleanup() {
        long now = System.currentTimeMillis();
        if (now - lastCleanupTime < CLEANUP_INTERVAL) {
            return;
        }
        
        lastCleanupTime = now;
        
        // IP bazlı temizlik
        ipRequestCounts.entrySet().removeIf(entry -> entry.getValue().isExpired());
        
        // Email bazlı temizlik
        emailRequestCounts.entrySet().removeIf(entry -> entry.getValue().isExpired());
        
        log.debug("Rate limiting temizliği yapıldı. IP: {}, Email: {}", 
            ipRequestCounts.size(), emailRequestCounts.size());
    }

    /**
     * İstek sayacı sınıfı
     */
    private static class RequestCounter {
        private final AtomicInteger count = new AtomicInteger(0);
        private final long windowMillis;
        private long windowStart;

        public RequestCounter(int windowSeconds) {
            this.windowMillis = windowSeconds * 1000L;
            this.windowStart = System.currentTimeMillis();
        }

        public boolean incrementAndCheck(int maxRequests) {
            long now = System.currentTimeMillis();
            
            // Zaman penceresi dolmuş mu kontrol et
            if (now - windowStart >= windowMillis) {
                // Yeni pencere başlat
                count.set(1);
                windowStart = now;
                return true;
            }
            
            // Mevcut pencere içinde sayacı artır
            int current = count.incrementAndGet();
            return current <= maxRequests;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - windowStart >= windowMillis;
        }
    }
}


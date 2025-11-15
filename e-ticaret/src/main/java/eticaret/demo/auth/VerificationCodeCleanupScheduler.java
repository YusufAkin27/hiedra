package eticaret.demo.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Doğrulama kodu temizleme scheduler'ı
 * Günde bir kez eski doğrulama kodlarını siler
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VerificationCodeCleanupScheduler {

    private final AuthVerificationCodeRepository verificationCodeRepository;

    /**
     * Kod saklama süresi (gün cinsinden)
     * Varsayılan: 1 gün (24 saat)
     * application.properties'den auth.verification.code.retention.days ile ayarlanabilir
     */
    @Value("${auth.verification.code.retention.days:1}")
    private int retentionDays;

    /**
     * Her gün saat 03:00'de çalışır
     * Belirli bir süreden önce oluşturulmuş doğrulama kodlarını siler
     * Kullanılmış veya süresi dolmuş kodları temizler
     */
    @Scheduled(cron = "0 0 3 * * ?") // Her gün saat 03:00
    @Transactional
    public void cleanOldVerificationCodes() {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);
            
            // Silinecek kayıt sayısını al
            long count = verificationCodeRepository.countByCreatedAtBefore(cutoffDate);
            
            if (count > 0) {
                verificationCodeRepository.deleteByCreatedAtBefore(cutoffDate);
                log.info("Doğrulama kodu temizleme: {} adet eski kod silindi ({} günden önceki kayıtlar)", count, retentionDays);
            } else {
                log.debug("Doğrulama kodu temizleme: Silinecek eski kod bulunamadı");
            }
        } catch (Exception e) {
            log.error("Doğrulama kodu temizleme hatası: Eski kodlar silinirken hata oluştu", e);
        }
    }
}


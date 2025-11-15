package eticaret.demo.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Audit log temizleme scheduler'ı
 * Belirli bir süreden önceki logları otomatik olarak siler
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogScheduler {

    private final AuditLogRepository auditLogRepository;

    /**
     * Log saklama süresi (gün cinsinden)
     * Varsayılan: 90 gün
     * application.properties'den audit.log.retention.days ile ayarlanabilir
     */
    @Value("${audit.log.retention.days:90}")
    private int retentionDays;

    /**
     * Her gün saat 02:00'de çalışır
     * Belirli bir süreden önceki logları siler
     */
    @Scheduled(cron = "0 0 2 * * ?") // Her gün saat 02:00
    public void cleanOldLogs() {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);
            
            // Silinecek kayıt sayısını al
            long count = auditLogRepository.findByCreatedAtBefore(cutoffDate).size();
            
            if (count > 0) {
                auditLogRepository.deleteByCreatedAtBefore(cutoffDate);
                log.info("Scheduler: {} adet eski log silindi ({} günden önceki kayıtlar)", count, retentionDays);
            } else {
                log.debug("Scheduler: Silinecek eski log bulunamadı");
            }
        } catch (Exception e) {
            log.error("Scheduler: Eski loglar silinirken hata oluştu", e);
        }
    }
}


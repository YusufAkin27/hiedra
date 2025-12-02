package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(1) // AdminInitializer'dan sonra çalışsın
public class AdminIpInitializer implements CommandLineRunner {

    @Value("${security.admin.allowed-ips:127.0.0.1,::1}")
    private String initialAllowedIps;

    private final AdminIpService adminIpService;

    @Override
    @Transactional
    public void run(String... args) {
        if (initialAllowedIps == null || initialAllowedIps.isBlank()) {
            log.warn("security.admin.allowed-ips property'si boş, default IP'ler eklenmeyecek.");
            return;
        }

        // IP'leri parse et
        Set<String> ips = Arrays.stream(initialAllowedIps.split(","))
                .map(String::trim)
                .filter(ip -> !ip.isEmpty())
                .collect(Collectors.toSet());

        if (ips.isEmpty()) {
            log.warn("security.admin.allowed-ips property'sinde geçerli IP bulunamadı.");
            return;
        }

        log.info("Default admin IP'leri yükleniyor: {}", ips);

        int addedCount = 0;
        int skippedCount = 0;
        int invalidCount = 0;

        for (String ip : ips) {
            try {
                // AdminIpService.addIp metodu IP doğrulaması yapar ve zaten var olan IP'leri kontrol eder
                boolean added = adminIpService.addIp(ip, "Default IP from application.properties");
                if (added) {
                    addedCount++;
                    log.debug("Default admin IP eklendi: {}", ip);
                } else {
                    skippedCount++;
                    log.debug("IP zaten mevcut: {}", ip);
                }
            } catch (IllegalArgumentException e) {
                // Geçersiz IP formatı
                invalidCount++;
                log.warn("Geçersiz IP formatı atlandı: {} - {}", ip, e.getMessage());
            } catch (Exception e) {
                log.error("IP eklenirken hata oluştu: {} - {}", ip, e.getMessage(), e);
            }
        }

        log.info("Default admin IP'leri yüklendi. Eklenen: {}, Zaten mevcut: {}, Geçersiz: {}", addedCount, skippedCount, invalidCount);
    }
}


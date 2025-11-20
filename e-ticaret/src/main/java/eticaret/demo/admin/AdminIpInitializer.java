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

    private final AdminAllowedIpRepository adminAllowedIpRepository;

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

        for (String ip : ips) {
            try {
                // IP zaten var mı kontrol et
                if (adminAllowedIpRepository.existsByIpAddress(ip)) {
                    // Eğer pasif ise aktif yap
                    adminAllowedIpRepository.findByIpAddress(ip).ifPresent(existing -> {
                        if (!existing.getIsActive()) {
                            existing.setIsActive(true);
                            existing.setDescription("Default IP from application.properties");
                            adminAllowedIpRepository.save(existing);
                            log.debug("Pasif IP aktif hale getirildi: {}", ip);
                        }
                    });
                    skippedCount++;
                    continue;
                }

                // Yeni IP ekle
                AdminAllowedIp ipEntity = AdminAllowedIp.builder()
                        .ipAddress(ip)
                        .description("Default IP from application.properties")
                        .isActive(true)
                        .build();

                adminAllowedIpRepository.save(ipEntity);
                addedCount++;
                log.debug("Default admin IP eklendi: {}", ip);
            } catch (Exception e) {
                log.error("IP eklenirken hata oluştu: {} - {}", ip, e.getMessage(), e);
            }
        }

        log.info("Default admin IP'leri yüklendi. Eklenen: {}, Zaten mevcut: {}", addedCount, skippedCount);
    }
}


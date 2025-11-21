package eticaret.demo.security.ip;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
@Profile("!test")
public class IpAccessDataLoader {

    private final BlockedIpAddressRepository blockedIpAddressRepository;
    private final IpAccessProperties ipAccessProperties;

    @PostConstruct
    public void seedDefaults() {
        seedBlockedIps();
    }

    private void seedBlockedIps() {
        List<String> configured = ipAccessProperties.getBlocked();
        if (configured == null || configured.isEmpty()) {
            return;
        }

        for (String ip : configured) {
            if (!blockedIpAddressRepository.existsByIpAddress(ip)) {
                blockedIpAddressRepository.save(
                        BlockedIpAddress.builder()
                                .ipAddress(ip.trim())
                                .reason("Initializer")
                                .build()
                );
                log.info("Engelli IP kaydedildi: {}", ip);
            }
        }
    }
}


package eticaret.demo.security.ip;

import eticaret.demo.admin.AdminAllowedIp;
import eticaret.demo.admin.AdminAllowedIpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IpAccessControlService {

    private final BlockedIpAddressRepository blockedIpAddressRepository;
    private final AdminAllowedIpRepository adminAllowedIpRepository;

    @Transactional(readOnly = true)
    public boolean isBlocked(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return false;
        }
        List<BlockedIpAddress> blockedIps = blockedIpAddressRepository.findAll();
        return blockedIps.stream().anyMatch(rule -> rule.matches(ipAddress));
    }

    @Transactional(readOnly = true)
    public boolean isAdminAllowed(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return false;
        }
        List<AdminAllowedIp> allowedIps = adminAllowedIpRepository.findByIsActiveTrue();
        return allowedIps.stream().anyMatch(rule ->
                matches(rule.getIpAddress(), ipAddress)
        );
    }

    private boolean matches(String rule, String clientIp) {
        if (rule == null || rule.isBlank() || clientIp == null || clientIp.isBlank()) {
            return false;
        }
        return new IpAddressMatcher(rule.trim()).matches(clientIp.trim());
    }
}


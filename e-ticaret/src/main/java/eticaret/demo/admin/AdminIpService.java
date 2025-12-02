package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminIpService {

    private final AdminAllowedIpRepository adminAllowedIpRepository;

    public Set<String> getAllowedIps() {
        return adminAllowedIpRepository.findByIsActiveTrue()
                .stream()
                .map(AdminAllowedIp::getIpAddress)
                .collect(Collectors.toSet());
    }

    @Transactional
    public boolean addIp(String ip) {
        return addIp(ip, null);
    }

    @Transactional
    public boolean addIp(String ip, String description) {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("IP adresi boş olamaz");
        }
        
        String trimmedIp = ip.trim();
        if (!isValidIp(trimmedIp)) {
            throw new IllegalArgumentException("Geçersiz IP adresi: " + trimmedIp);
        }

        // IP zaten var mı kontrol et
        if (adminAllowedIpRepository.existsByIpAddress(trimmedIp)) {
            // Eğer pasif ise aktif yap
            Optional<AdminAllowedIp> existing = adminAllowedIpRepository.findByIpAddress(trimmedIp);
            if (existing.isPresent() && !existing.get().getIsActive()) {
                AdminAllowedIp ipEntity = existing.get();
                ipEntity.setIsActive(true);
                if (description != null && !description.isBlank()) {
                    ipEntity.setDescription(description);
                }
                adminAllowedIpRepository.save(ipEntity);
                log.info("Admin IP aktif hale getirildi: {}", trimmedIp);
                return true;
            }
            return false;
        }

        // Yeni IP ekle
        AdminAllowedIp ipEntity = AdminAllowedIp.builder()
                .ipAddress(trimmedIp)
                .description(description)
                .isActive(true)
                .build();
        
        adminAllowedIpRepository.save(ipEntity);
        log.info("Admin IP eklendi: {}", trimmedIp);
        return true;
    }

    @Transactional
    public boolean removeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("IP adresi boş olamaz");
        }

        String trimmedIp = ip.trim();
        Optional<AdminAllowedIp> ipEntity = adminAllowedIpRepository.findByIpAddress(trimmedIp);
        
        if (ipEntity.isPresent() && ipEntity.get().getIsActive()) {
            // IP'yi pasif yap (silme yerine)
            AdminAllowedIp entity = ipEntity.get();
            entity.setIsActive(false);
            adminAllowedIpRepository.save(entity);
            log.info("Admin IP kaldırıldı (pasif yapıldı): {}", trimmedIp);
            return true;
        }
        
        return false;
    }

    @Transactional
    public boolean deleteIp(String ip) {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("IP adresi boş olamaz");
        }

        String trimmedIp = ip.trim();
        Optional<AdminAllowedIp> ipEntity = adminAllowedIpRepository.findByIpAddress(trimmedIp);
        
        if (ipEntity.isPresent()) {
            adminAllowedIpRepository.delete(ipEntity.get());
            log.info("Admin IP kalıcı olarak silindi: {}", trimmedIp);
            return true;
        }
        
        return false;
    }

    public boolean isAllowed(String ip) {
        if (ip == null) {
            return false;
        }

        String trimmedIp = ip.trim();
        
        // Localhost varyasyonlarını kontrol et
        if (trimmedIp.equals("127.0.0.1") || 
            trimmedIp.equals("0:0:0:0:0:0:0:1") || 
            trimmedIp.equals("::1") ||
            trimmedIp.startsWith("127.") ||
            trimmedIp.equals("localhost")) {
            // Localhost için özel kontrol
            Set<String> allowedIps = getAllowedIps();
            return allowedIps.contains("127.0.0.1") || 
                   allowedIps.contains("0.0.0.0") ||
                   allowedIps.contains("::1") ||
                   allowedIps.contains("0:0:0:0:0:0:0:1") ||
                   isIpInSubnet(trimmedIp, allowedIps);
        }
        
        // Önce tam IP kontrolü
        Optional<AdminAllowedIp> exactMatch = adminAllowedIpRepository.findByIpAddress(trimmedIp);
        if (exactMatch.isPresent() && exactMatch.get().getIsActive()) {
            return true;
        }
        
        // Subnet kontrolü - tüm aktif IP'leri kontrol et
        Set<String> allowedIps = getAllowedIps();
        return isIpInSubnet(trimmedIp, allowedIps);
    }
    
    /**
     * IP'nin herhangi bir subnet içinde olup olmadığını kontrol eder
     */
    private boolean isIpInSubnet(String ip, Set<String> allowedIps) {
        for (String allowedIp : allowedIps) {
            if (isIpInSubnet(ip, allowedIp)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * IP'nin belirli bir subnet içinde olup olmadığını kontrol eder
     * Spring'in IpAddressMatcher'ını kullanarak hem tam IP hem de CIDR formatını destekler
     */
    private boolean isIpInSubnet(String ip, String subnet) {
        if (ip == null || ip.isBlank() || subnet == null || subnet.isBlank()) {
            return false;
        }
        
        try {
            // Spring'in IpAddressMatcher'ı hem tam IP hem de CIDR formatını destekler
            // Örnek: "192.168.1.1" (tam IP) veya "192.168.1.0/24" (CIDR)
            IpAddressMatcher matcher = new IpAddressMatcher(subnet.trim());
            boolean matches = matcher.matches(ip.trim());
            
            if (matches) {
                log.debug("IP {} subnet {} ile eşleşti", ip, subnet);
            }
            
            return matches;
        } catch (IllegalArgumentException e) {
            // Geçersiz subnet formatı (örn: eksik IP adresi)
            log.debug("Geçersiz subnet formatı: {} - {}", subnet, e.getMessage());
            return false;
        } catch (Exception e) {
            log.debug("Subnet kontrolü hatası: {} - {}", subnet, e.getMessage());
            return false;
        }
    }

    private boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }

        // CIDR formatı kontrolü (örn: 192.168.1.0/24)
        if (ip.contains("/")) {
            String[] parts = ip.split("/");
            if (parts.length != 2) {
                return false;
            }
            
            String networkIp = parts[0].trim();
            String prefixStr = parts[1].trim();
            
            try {
                int prefixLength = Integer.parseInt(prefixStr);
                
                // IPv4 CIDR kontrolü
                if (isValidIpv4(networkIp)) {
                    return prefixLength >= 0 && prefixLength <= 32;
                }
                
                // IPv6 CIDR kontrolü (basit)
                if (isValidIpv6(networkIp)) {
                    return prefixLength >= 0 && prefixLength <= 128;
                }
            } catch (NumberFormatException e) {
                return false;
            }
            
            return false;
        }

        // IPv4 format kontrolü
        if (isValidIpv4(ip)) {
            return true;
        }

        // IPv6 format kontrolü
        if (isValidIpv6(ip)) {
            return true;
        }

        // Localhost
        if (ip.equals("localhost") || ip.equals("0.0.0.0")) {
            return true;
        }

        return false;
    }
    
    /**
     * IPv4 adres formatını kontrol eder
     */
    private boolean isValidIpv4(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        
        if (!ip.matches("^([0-9]{1,3}\\.){3}[0-9]{1,3}$")) {
            return false;
        }
        
        String[] parts = ip.split("\\.");
        for (String part : parts) {
            try {
                int num = Integer.parseInt(part);
                if (num < 0 || num > 255) {
                    return false;
                }
            } catch (NumberFormatException e) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * IPv6 adres formatını kontrol eder (basit)
     */
    private boolean isValidIpv6(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        
        // Basit IPv6 kontrolü
        if (ip.contains(":") || ip.equals("::1") || ip.equals("0:0:0:0:0:0:0:1")) {
            return true;
        }
        
        return false;
    }
}


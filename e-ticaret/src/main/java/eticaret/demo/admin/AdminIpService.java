package eticaret.demo.admin;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AdminIpService {

    @Value("${security.admin.allowed-ips:127.0.0.1,::1}")
    private String initialAllowedIps;

    private final Set<String> allowedIps = new CopyOnWriteArraySet<>();

    @PostConstruct
    public void init() {
        if (initialAllowedIps != null && !initialAllowedIps.isBlank()) {
            Set<String> ips = Arrays.stream(initialAllowedIps.split(","))
                    .map(String::trim)
                    .filter(ip -> !ip.isEmpty())
                    .collect(Collectors.toSet());
            allowedIps.addAll(ips);
            log.info("Admin IP'leri yüklendi: {}", allowedIps);
        }
    }

    public Set<String> getAllowedIps() {
        return new HashSet<>(allowedIps);
    }

    public boolean addIp(String ip) {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("IP adresi boş olamaz");
        }
        
        String trimmedIp = ip.trim();
        if (!isValidIp(trimmedIp)) {
            throw new IllegalArgumentException("Geçersiz IP adresi: " + trimmedIp);
        }

        boolean added = allowedIps.add(trimmedIp);
        if (added) {
            log.info("Admin IP eklendi: {}", trimmedIp);
        }
        return added;
    }

    public boolean removeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("IP adresi boş olamaz");
        }

        String trimmedIp = ip.trim();
        boolean removed = allowedIps.remove(trimmedIp);
        if (removed) {
            log.info("Admin IP kaldırıldı: {}", trimmedIp);
        }
        return removed;
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
            return allowedIps.contains("127.0.0.1") || 
                   allowedIps.contains("0.0.0.0") ||
                   allowedIps.contains("::1");
        }
        
        return allowedIps.contains(trimmedIp);
    }

    private boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }

        // IPv4 format kontrolü
        if (ip.matches("^([0-9]{1,3}\\.){3}[0-9]{1,3}$")) {
            String[] parts = ip.split("\\.");
            for (String part : parts) {
                int num = Integer.parseInt(part);
                if (num < 0 || num > 255) {
                    return false;
                }
            }
            return true;
        }

        // IPv6 format kontrolü (basit)
        if (ip.contains(":") || ip.equals("::1") || ip.equals("0:0:0:0:0:0:0:1")) {
            return true;
        }

        // Localhost
        if (ip.equals("localhost") || ip.equals("0.0.0.0")) {
            return true;
        }

        return false;
    }
}


package eticaret.demo.admin;

import eticaret.demo.security.ip.BlockedIpAddress;
import eticaret.demo.security.ip.BlockedIpService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.common.response.DataResponseMessage;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/system")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSystemController {

    private final AdminIpService adminIpService;
    private final BlockedIpService blockedIpService;

    @Value("${jwt.access.secret:}")
    private String jwtAccessSecret;

    @Value("${jwt.refresh.secret:}")
    private String jwtRefreshSecret;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @GetMapping("/health")
    public ResponseEntity<DataResponseMessage<SystemHealthResponse>> getSystemHealth(
            @AuthenticationPrincipal AppUser currentUser) {
        
        SystemHealthResponse health = new SystemHealthResponse();
        
        // Runtime bilgileri
        RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        
        long uptime = runtimeBean.getUptime();
        long maxMemory = memoryBean.getHeapMemoryUsage().getMax();
        long usedMemory = memoryBean.getHeapMemoryUsage().getUsed();
        long freeMemory = maxMemory - usedMemory;
        
        health.setStatus("UP");
        health.setUptime(formatUptime(uptime));
        health.setUptimeMillis(uptime);
        health.setMemoryUsed(formatBytes(usedMemory));
        health.setMemoryFree(formatBytes(freeMemory));
        health.setMemoryTotal(formatBytes(maxMemory));
        health.setMemoryUsagePercent((int) ((usedMemory * 100) / maxMemory));
        
        // JVM bilgileri
        health.setJavaVersion(System.getProperty("java.version"));
        health.setJavaVendor(System.getProperty("java.vendor"));
        health.setOsName(System.getProperty("os.name"));
        health.setOsVersion(System.getProperty("os.version"));
        
        // Uygulama bilgileri
        health.setServerStartTime(LocalDateTime.ofInstant(
                Instant.ofEpochMilli(runtimeBean.getStartTime()),
                ZoneId.systemDefault()
        ));
        
        // Güvenlik bilgileri (maskelenmiş)
        Map<String, String> securityInfo = new HashMap<>();
        Set<String> allowedIps = adminIpService.getAllowedIps();
        securityInfo.put("allowedAdminIps", String.join(", ", allowedIps));
        securityInfo.put("jwtAccessSecretConfigured", jwtAccessSecret != null && !jwtAccessSecret.isEmpty() ? "Evet" : "Hayır");
        securityInfo.put("jwtRefreshSecretConfigured", jwtRefreshSecret != null && !jwtRefreshSecret.isEmpty() ? "Evet" : "Hayır");
        securityInfo.put("datasourceConfigured", datasourceUrl != null && !datasourceUrl.isEmpty() ? "Evet" : "Hayır");
        health.setSecurityInfo(securityInfo);
        
        // Kullanıcı bilgisi
        if (currentUser != null) {
            health.setCurrentUserEmail(currentUser.getEmail());
            health.setCurrentUserRole(currentUser.getRole().name());
        }
        
        return ResponseEntity.ok(DataResponseMessage.success("Sistem sağlık durumu", health));
    }

    private String formatUptime(long millis) {
        long seconds = millis / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        long days = hours / 24;
        
        if (days > 0) {
            return String.format("%d gün, %d saat", days, hours % 24);
        } else if (hours > 0) {
            return String.format("%d saat, %d dakika", hours, minutes % 60);
        } else if (minutes > 0) {
            return String.format("%d dakika, %d saniye", minutes, seconds % 60);
        } else {
            return String.format("%d saniye", seconds);
        }
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        } else if (bytes < 1024 * 1024) {
            return String.format("%.2f KB", bytes / 1024.0);
        } else if (bytes < 1024 * 1024 * 1024) {
            return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
        } else {
            return String.format("%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0));
        }
    }

    @GetMapping("/ips")
    public ResponseEntity<DataResponseMessage<IpListResponse>> getAllowedIps() {
        Set<String> ips = adminIpService.getAllowedIps();
        IpListResponse response = new IpListResponse();
        response.setIps(ips.stream().sorted().collect(Collectors.toList()));
        return ResponseEntity.ok(DataResponseMessage.success("İzin verilen IP'ler", response));
    }

    @PostMapping("/ips")
    public ResponseEntity<DataResponseMessage<IpListResponse>> addIp(@Valid @RequestBody AddIpRequest request) {
        try {
            boolean added = adminIpService.addIp(request.getIp(), request.getDescription());
            if (!added) {
                return ResponseEntity.ok(DataResponseMessage.error("Bu IP adresi zaten listede mevcut."));
            }
            Set<String> ips = adminIpService.getAllowedIps();
            IpListResponse response = new IpListResponse();
            response.setIps(ips.stream().sorted().collect(Collectors.toList()));
            return ResponseEntity.ok(DataResponseMessage.success("IP adresi başarıyla eklendi.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error(e.getMessage()));
        }
    }

    @GetMapping("/blocked-ips")
    public ResponseEntity<DataResponseMessage<BlockedIpListResponse>> getBlockedIps() {
        BlockedIpListResponse response = new BlockedIpListResponse();
        response.setBlockedIps(
                blockedIpService.getBlockedIps().stream()
                        .map(this::mapBlockedIp)
                        .toList()
        );
        return ResponseEntity.ok(DataResponseMessage.success("Engellenen IP'ler", response));
    }

    @PostMapping("/blocked-ips")
    public ResponseEntity<DataResponseMessage<BlockedIpListResponse>> addBlockedIp(@Valid @RequestBody AddBlockedIpRequest request) {
        try {
            blockedIpService.addBlockedIp(request.getIp(), request.getReason());
            return getBlockedIps();
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error(e.getMessage()));
        }
    }

    @DeleteMapping("/blocked-ips/{id}")
    public ResponseEntity<DataResponseMessage<BlockedIpListResponse>> deleteBlockedIp(@PathVariable Long id) {
        boolean deleted = blockedIpService.deleteBlockedIp(id);
        if (!deleted) {
            return ResponseEntity.ok(DataResponseMessage.error("IP kaydı bulunamadı."));
        }
        return getBlockedIps();
    }

    private BlockedIpDto mapBlockedIp(BlockedIpAddress entity) {
        BlockedIpDto dto = new BlockedIpDto();
        dto.setId(entity.getId());
        dto.setIpAddress(entity.getIpAddress());
        dto.setReason(entity.getReason());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    @DeleteMapping("/ips/{ip}")
    public ResponseEntity<DataResponseMessage<IpListResponse>> removeIp(@PathVariable String ip) {
        try {
            boolean removed = adminIpService.removeIp(ip);
            if (!removed) {
                return ResponseEntity.ok(DataResponseMessage.error("Bu IP adresi listede bulunamadı."));
            }
            Set<String> ips = adminIpService.getAllowedIps();
            IpListResponse response = new IpListResponse();
            response.setIps(ips.stream().sorted().collect(Collectors.toList()));
            return ResponseEntity.ok(DataResponseMessage.success("IP adresi başarıyla kaldırıldı.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error(e.getMessage()));
        }
    }

    @Data
    public static class IpListResponse {
        private List<String> ips;
    }

    @Data
    public static class AddIpRequest {
        @NotBlank(message = "IP adresi zorunludur.")
        private String ip;
        private String description;
    }

    @Data
    public static class BlockedIpListResponse {
        private List<BlockedIpDto> blockedIps;
    }

    @Data
    public static class BlockedIpDto {
        private Long id;
        private String ipAddress;
        private String reason;
        private Instant createdAt;
    }

    @Data
    public static class AddBlockedIpRequest {
        @NotBlank(message = "IP adresi zorunludur.")
        private String ip;
        private String reason;
    }

    @Data
    public static class SystemHealthResponse {
        private String status;
        private String uptime;
        private Long uptimeMillis;
        private String memoryUsed;
        private String memoryFree;
        private String memoryTotal;
        private Integer memoryUsagePercent;
        private String javaVersion;
        private String javaVendor;
        private String osName;
        private String osVersion;
        private LocalDateTime serverStartTime;
        private Map<String, String> securityInfo;
        private String currentUserEmail;
        private String currentUserRole;
    }
}


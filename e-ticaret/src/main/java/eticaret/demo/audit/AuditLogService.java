package eticaret.demo.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.auth.AppUser;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    /**
     * Audit log kaydı oluştur
     */
    @Transactional
    public void log(String action, String entityType, Long entityId, String description, 
                   String requestData, String responseData, String status, String errorMessage,
                   HttpServletRequest request) {
        try {
            String userId = null;
            String userEmail = null;
            String userRole = "GUEST";
            
            // Security context'ten kullanıcı bilgilerini al
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof AppUser) {
                AppUser user = (AppUser) authentication.getPrincipal();
                userId = user.getId().toString();
                userEmail = user.getEmail();
                userRole = user.getRole().name();
            }
            
            String ipAddress = getClientIp(request);
            String userAgent = request != null ? request.getHeader("User-Agent") : null;
            
            AuditLog auditLog = AuditLog.builder()
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .description(description)
                    .userId(userId)
                    .userEmail(userEmail)
                    .userRole(userRole)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .requestData(requestData)
                    .responseData(responseData)
                    .status(status != null ? status : "SUCCESS")
                    .errorMessage(errorMessage)
                    .build();
            
            auditLogRepository.save(auditLog);
            log.debug("Audit log kaydedildi: {} - {} - {}", action, entityType, entityId);
        } catch (Exception e) {
            log.error("Audit log kaydedilirken hata oluştu: {}", e.getMessage(), e);
            // Audit log hatası uygulamayı durdurmamalı
        }
    }

    /**
     * Basit audit log (sadece action ve entity)
     */
    @Transactional
    public void logSimple(String action, String entityType, Long entityId, String description, HttpServletRequest request) {
        log(action, entityType, entityId, description, null, null, "SUCCESS", null, request);
    }

    /**
     * Başarılı işlem logu
     */
    @Transactional
    public void logSuccess(String action, String entityType, Long entityId, String description, 
                          Object requestData, Object responseData, HttpServletRequest request) {
        try {
            String requestJson = requestData != null ? objectMapper.writeValueAsString(requestData) : null;
            String responseJson = responseData != null ? objectMapper.writeValueAsString(responseData) : null;
            log(action, entityType, entityId, description, requestJson, responseJson, "SUCCESS", null, request);
        } catch (Exception e) {
            log.error("Audit log kaydedilirken hata: {}", e.getMessage());
        }
    }

    /**
     * Hatalı işlem logu
     */
    @Transactional
    public void logError(String action, String entityType, Long entityId, String description, 
                       String errorMessage, HttpServletRequest request) {
        log(action, entityType, entityId, description, null, null, "ERROR", errorMessage, request);
    }

    /**
     * Bu sepet için hatırlatma maili daha önce gönderilmiş mi?
     */
    public boolean hasReminderEmailSent(Long cartId) {
        return auditLogRepository.existsByEntityTypeAndEntityIdAndAction(
                "Cart", cartId, "CART_REMINDER_EMAIL");
    }

    /**
     * Client IP adresini al
     * Öncelik sırası: X-Client-IP (frontend'den gönderilen) > X-Real-IP > X-Forwarded-For > RemoteAddr
     */
    private String getClientIp(HttpServletRequest request) {
        if (request == null) return "UNKNOWN";
        
        // X-Client-IP header'ını öncelikli olarak kontrol et (frontend'den gönderilen)
        String ip = request.getHeader("X-Client-IP");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            log.info("X-Client-IP header'dan IP alındı: {}", ip);
            return ip.trim();
        }
        
        // X-Real-IP header'ını kontrol et (nginx, reverse proxy)
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            log.info("X-Real-IP header'dan IP alındı: {}", ip);
            return ip.trim();
        }
        
        // X-Forwarded-For header'ını kontrol et
        ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            // X-Forwarded-For birden fazla IP içerebilir, ilkini al
            String firstIp = ip.split(",")[0].trim();
            log.info("X-Forwarded-For header'dan IP alındı: {}", firstIp);
            return firstIp;
        }
        
        // Son çare olarak RemoteAddr kullan
        ip = request.getRemoteAddr();
        log.info("RemoteAddr'den IP alındı: {}", ip);
        
        // Localhost IP'lerini kontrol et ve gerçek IP bulunamadıysa uyar
        if (ip != null && (ip.equals("127.0.0.1") || ip.equals("0:0:0:0:0:0:0:1") || ip.equals("::1"))) {
            log.warn("Localhost IP tespit edildi: {}. X-Client-IP header'ı kontrol edilmeli. Tüm header'lar: X-Client-IP={}, X-Real-IP={}, X-Forwarded-For={}", 
                    ip, 
                    request.getHeader("X-Client-IP"),
                    request.getHeader("X-Real-IP"),
                    request.getHeader("X-Forwarded-For"));
        }
        
        return ip != null ? ip : "UNKNOWN";
    }
}


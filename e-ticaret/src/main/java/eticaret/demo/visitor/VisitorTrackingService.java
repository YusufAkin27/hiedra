package eticaret.demo.visitor;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisitorTrackingService {

    private final ActiveVisitorRepository visitorRepository;
    private final VisitorPageViewRepository pageViewRepository;
    
    // User-Agent parsing için pattern'ler
    private static final Pattern MOBILE_PATTERN = Pattern.compile(
        "(?i)(android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini)");
    private static final Pattern TABLET_PATTERN = Pattern.compile(
        "(?i)(ipad|android(?!.*mobile)|tablet)");
    private static final Pattern CHROME_PATTERN = Pattern.compile("(?i)chrome/([\\d.]+)");
    private static final Pattern FIREFOX_PATTERN = Pattern.compile("(?i)firefox/([\\d.]+)");
    private static final Pattern SAFARI_PATTERN = Pattern.compile("(?i)version/([\\d.]+).*safari");
    private static final Pattern EDGE_PATTERN = Pattern.compile("(?i)edg?e?/([\\d.]+)");
    private static final Pattern WINDOWS_PATTERN = Pattern.compile("(?i)windows");
    private static final Pattern MACOS_PATTERN = Pattern.compile("(?i)mac os x|macintosh");
    private static final Pattern LINUX_PATTERN = Pattern.compile("(?i)linux");
    private static final Pattern ANDROID_PATTERN = Pattern.compile("(?i)android");
    private static final Pattern IOS_PATTERN = Pattern.compile("(?i)(iphone|ipad|ipod)");

    /**
     * Ziyaretçi aktivitesini kaydet veya güncelle
     * Sayfa görüntüleme kaydı da oluşturur
     */
    @Transactional
    public String trackVisitor(
            HttpServletRequest request,
            String currentPage,
            String providedSessionId,
            VisitorType visitorType,
            Long userId,
            String userEmail
    ) {
        try {
            String ipAddress = getClientIpAddress(request);
            String userAgent = request.getHeader("User-Agent");
            String referrer = request.getHeader("Referer");
            String language = request.getHeader("Accept-Language");
            String sessionId = resolveSessionId(request, providedSessionId);
            
            // Device ve browser bilgilerini parse et
            DeviceInfo deviceInfo = parseDeviceInfo(userAgent);

            // Mevcut ziyaretçiyi bul (session ID ile)
            Optional<ActiveVisitor> existingVisitorOpt = visitorRepository.findBySessionId(sessionId);
            
            ActiveVisitor visitor;
            boolean isNewVisitor = false;
            
            if (existingVisitorOpt.isPresent()) {
                // Mevcut ziyaretçiyi güncelle
                visitor = existingVisitorOpt.get();
                visitor.setLastActivityAt(LocalDateTime.now());
                visitor.incrementPageView();
                visitor.updateCurrentPage(currentPage);
                visitor.setVisitorType(visitorType != null ? visitorType : VisitorType.MISAFIR);

                if (userId != null) {
                    visitor.setUserId(userId);
                }
                if (userEmail != null) {
                    visitor.setUserEmail(trimEmail(userEmail));
                }
                if (userAgent != null && !userAgent.isBlank()) {
                    visitor.setUserAgent(trimUserAgent(userAgent));
                }
                
                // Device bilgilerini güncelle
                if (deviceInfo.deviceType != null) {
                    visitor.setDeviceType(deviceInfo.deviceType);
                }
                if (deviceInfo.browser != null) {
                    visitor.setBrowser(deviceInfo.browser);
                }
                if (deviceInfo.operatingSystem != null) {
                    visitor.setOperatingSystem(deviceInfo.operatingSystem);
                }
                if (referrer != null && !referrer.isBlank()) {
                    visitor.setReferrer(trimReferrer(referrer));
                }
                if (language != null && !language.isBlank()) {
                    visitor.setLanguage(extractLanguage(language));
                }
            } else {
                // Yeni ziyaretçi oluştur
                isNewVisitor = true;
                visitor = ActiveVisitor.builder()
                        .ipAddress(ipAddress)
                        .userAgent(userAgent != null ? trimUserAgent(userAgent) : null)
                        .sessionId(sessionId)
                        .firstSeenAt(LocalDateTime.now())
                        .lastActivityAt(LocalDateTime.now())
                        .pageViews(1)
                        .currentPage(currentPage)
                        .visitorType(visitorType != null ? visitorType : VisitorType.MISAFIR)
                        .userId(userId)
                        .userEmail(userEmail != null ? trimEmail(userEmail) : null)
                        .deviceType(deviceInfo.deviceType)
                        .browser(deviceInfo.browser)
                        .operatingSystem(deviceInfo.operatingSystem)
                        .referrer(referrer != null ? trimReferrer(referrer) : null)
                        .language(language != null ? extractLanguage(language) : null)
                        .totalSessionDuration(0)
                        .build();
            }

            try {
                visitor = visitorRepository.save(visitor);
            } catch (DataIntegrityViolationException | ConstraintViolationException e) {
                // Duplicate key hatası - eşzamanlı istek durumunda mevcut kaydı bul ve güncelle
                if (e.getCause() instanceof org.hibernate.exception.ConstraintViolationException ||
                    e.getMessage() != null && e.getMessage().contains("duplicate key")) {
                    log.debug("Duplicate key hatası yakalandı, mevcut kayıt güncelleniyor: SessionId={}", sessionId);
                    Optional<ActiveVisitor> retryVisitorOpt = visitorRepository.findBySessionId(sessionId);
                    if (retryVisitorOpt.isPresent()) {
                        visitor = retryVisitorOpt.get();
                        visitor.setLastActivityAt(LocalDateTime.now());
                        visitor.incrementPageView();
                        visitor.updateCurrentPage(currentPage);
                        visitor.setVisitorType(visitorType != null ? visitorType : VisitorType.MISAFIR);
                        
                        if (userId != null) {
                            visitor.setUserId(userId);
                        }
                        if (userEmail != null) {
                            visitor.setUserEmail(trimEmail(userEmail));
                        }
                        if (userAgent != null && !userAgent.isBlank()) {
                            visitor.setUserAgent(trimUserAgent(userAgent));
                        }
                        
                        // Device bilgilerini güncelle
                        if (deviceInfo.deviceType != null) {
                            visitor.setDeviceType(deviceInfo.deviceType);
                        }
                        if (deviceInfo.browser != null) {
                            visitor.setBrowser(deviceInfo.browser);
                        }
                        if (deviceInfo.operatingSystem != null) {
                            visitor.setOperatingSystem(deviceInfo.operatingSystem);
                        }
                        if (referrer != null && !referrer.isBlank()) {
                            visitor.setReferrer(trimReferrer(referrer));
                        }
                        if (language != null && !language.isBlank()) {
                            visitor.setLanguage(extractLanguage(language));
                        }
                        
                        visitor = visitorRepository.save(visitor);
                        isNewVisitor = false;
                    } else {
                        // Hala bulunamadıysa, yeni bir session ID oluştur
                        log.warn("Duplicate key hatası sonrası kayıt bulunamadı, yeni session ID oluşturuluyor: SessionId={}", sessionId);
                        sessionId = UUID.randomUUID().toString();
                        visitor = ActiveVisitor.builder()
                                .ipAddress(ipAddress)
                                .userAgent(userAgent != null ? trimUserAgent(userAgent) : null)
                                .sessionId(sessionId)
                                .firstSeenAt(LocalDateTime.now())
                                .lastActivityAt(LocalDateTime.now())
                                .pageViews(1)
                                .currentPage(currentPage)
                                .visitorType(visitorType != null ? visitorType : VisitorType.MISAFIR)
                                .userId(userId)
                                .userEmail(userEmail != null ? trimEmail(userEmail) : null)
                                .deviceType(deviceInfo.deviceType)
                                .browser(deviceInfo.browser)
                                .operatingSystem(deviceInfo.operatingSystem)
                                .referrer(referrer != null ? trimReferrer(referrer) : null)
                                .language(language != null ? extractLanguage(language) : null)
                                .totalSessionDuration(0)
                                .build();
                        visitor = visitorRepository.save(visitor);
                        isNewVisitor = true;
                    }
                } else {
                    throw e;
                }
            }
            
            // Sayfa görüntüleme kaydı oluştur (ayrı transaction'da)
            try {
                createPageView(visitor, currentPage, referrer, deviceInfo, language, request);
            } catch (Exception e) {
                // Sayfa görüntüleme hatası ana transaction'ı etkilemez
                log.warn("Sayfa görüntüleme kaydı oluşturulamadı: {}", e.getMessage());
            }
            
            log.debug("Ziyaretçi takip edildi: SessionId={}, Page={}, Type={}, New={}", 
                sessionId, currentPage, visitorType, isNewVisitor);

            return sessionId;
        } catch (Exception e) {
            // Ziyaretçi takibi hatası ana işlemi engellemez
            log.warn("Ziyaretçi takibi hatası: {}", e.getMessage(), e);
            return providedSessionId != null ? providedSessionId : UUID.randomUUID().toString();
        }
    }
    
    /**
     * Sayfa görüntüleme kaydı oluştur (ayrı transaction'da)
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    private void createPageView(ActiveVisitor visitor, String currentPage, String referrer, 
                                DeviceInfo deviceInfo, String language, HttpServletRequest request) {
        try {
            VisitorPageView pageView = VisitorPageView.builder()
                    .sessionId(visitor.getSessionId())
                    .userId(visitor.getUserId())
                    .ipAddress(visitor.getIpAddress())
                    .pagePath(currentPage != null ? trimPagePath(currentPage) : "/")
                    .referrer(referrer != null ? trimReferrer(referrer) : null)
                    .userAgent(visitor.getUserAgent())
                    .deviceType(deviceInfo.deviceType)
                    .browser(deviceInfo.browser)
                    .operatingSystem(deviceInfo.operatingSystem)
                    .language(language != null ? extractLanguage(language) : null)
                    .visitorType(visitor.getVisitorType())
                    .createdAt(LocalDateTime.now())
                    .build();
            
            pageViewRepository.save(pageView);
        } catch (Exception e) {
            log.warn("Sayfa görüntüleme kaydı oluşturulamadı: {}", e.getMessage());
            throw e; // Yeni transaction'da exception fırlatılabilir
        }
    }
    
    /**
     * Device bilgilerini parse et
     */
    private DeviceInfo parseDeviceInfo(String userAgent) {
        DeviceInfo info = new DeviceInfo();
        
        if (userAgent == null || userAgent.isBlank()) {
            info.deviceType = VisitorPageView.DeviceType.UNKNOWN;
            return info;
        }
        
        // Device type
        if (TABLET_PATTERN.matcher(userAgent).find()) {
            info.deviceType = VisitorPageView.DeviceType.TABLET;
        } else if (MOBILE_PATTERN.matcher(userAgent).find()) {
            info.deviceType = VisitorPageView.DeviceType.MOBILE;
        } else {
            info.deviceType = VisitorPageView.DeviceType.DESKTOP;
        }
        
        // Browser
        if (CHROME_PATTERN.matcher(userAgent).find()) {
            info.browser = "Chrome";
        } else if (FIREFOX_PATTERN.matcher(userAgent).find()) {
            info.browser = "Firefox";
        } else if (EDGE_PATTERN.matcher(userAgent).find()) {
            info.browser = "Edge";
        } else if (SAFARI_PATTERN.matcher(userAgent).find()) {
            info.browser = "Safari";
        } else {
            info.browser = "Unknown";
        }
        
        // Operating System
        if (WINDOWS_PATTERN.matcher(userAgent).find()) {
            info.operatingSystem = "Windows";
        } else if (MACOS_PATTERN.matcher(userAgent).find()) {
            info.operatingSystem = "macOS";
        } else if (ANDROID_PATTERN.matcher(userAgent).find()) {
            info.operatingSystem = "Android";
        } else if (IOS_PATTERN.matcher(userAgent).find()) {
            info.operatingSystem = "iOS";
        } else if (LINUX_PATTERN.matcher(userAgent).find()) {
            info.operatingSystem = "Linux";
        } else {
            info.operatingSystem = "Unknown";
        }
        
        return info;
    }
    
    /**
     * Device bilgileri için inner class
     */
    private static class DeviceInfo {
        VisitorPageView.DeviceType deviceType;
        String browser;
        String operatingSystem;
    }

    /**
     * Client IP adresini al
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }

        String xClientIp = request.getHeader("X-Client-IP");
        if (xClientIp != null && !xClientIp.isEmpty() && !"unknown".equalsIgnoreCase(xClientIp)) {
            return xClientIp;
        }

        return request.getRemoteAddr();
    }

    /**
     * Session ID'yi dışarıdan gelen değer öncelikli olacak şekilde çöz
     */
    private String resolveSessionId(HttpServletRequest request, String providedSessionId) {
        if (providedSessionId != null && !providedSessionId.isBlank()) {
            return providedSessionId;
        }

        String sessionId = null;
        try {
            sessionId = (String) request.getSession(false)
                    .getAttribute("VISITOR_SESSION_ID");
        } catch (Exception ignored) {
            // stateless yapı sebebiyle session olmayabilir
        }

        if (sessionId == null || sessionId.isEmpty()) {
            sessionId = UUID.randomUUID().toString();
            try {
                request.getSession(true).setAttribute("VISITOR_SESSION_ID", sessionId);
            } catch (Exception e) {
                log.debug("HTTP session oluşturulamadı, sessionId yalnızca yanıt içinde döndürülecek: {}", e.getMessage());
            }
        }
        return sessionId;
    }

    private String trimUserAgent(String userAgent) {
        if (userAgent == null) return null;
        return userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent;
    }

    private String trimEmail(String email) {
        if (email == null) return null;
        if (email.length() <= 255) {
            return email;
        }
        return email.substring(0, 255);
    }
    
    private String trimReferrer(String referrer) {
        if (referrer == null) return null;
        return referrer.length() > 1000 ? referrer.substring(0, 1000) : referrer;
    }
    
    private String trimPagePath(String pagePath) {
        if (pagePath == null) return "/";
        String trimmed = pagePath.trim();
        if (trimmed.length() > 500) {
            trimmed = trimmed.substring(0, 500);
        }
        return trimmed.isEmpty() ? "/" : trimmed;
    }
    
    private String extractLanguage(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isBlank()) {
            return null;
        }
        // "tr-TR,tr;q=0.9,en-US;q=0.8" -> "tr"
        String[] parts = acceptLanguage.split(",");
        if (parts.length > 0) {
            String lang = parts[0].trim().split(";")[0].trim().split("-")[0].toLowerCase();
            return lang.length() <= 10 ? lang : lang.substring(0, 10);
        }
        return null;
    }

    /**
     * Eski ziyaretçi kayıtlarını temizle (her 10 dakikada bir)
     */
    @Scheduled(fixedRate = 600000) // 10 dakika
    @Transactional
    public void cleanupOldVisitors() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusMinutes(30);
            int deletedCount = visitorRepository.deleteOldVisitors(cutoff);
            log.debug("Eski ziyaretçi kayıtları temizlendi: {} kayıt silindi", deletedCount);
        } catch (Exception e) {
            log.warn("Ziyaretçi temizleme hatası: {}", e.getMessage());
        }
    }
    
    /**
     * Eski sayfa görüntüleme kayıtlarını temizle (her gün)
     * 90 günden eski kayıtları sil
     */
    @Scheduled(cron = "0 0 2 * * *") // Her gün saat 02:00'da
    @Transactional
    public void cleanupOldPageViews() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
            List<VisitorPageView> oldViews = pageViewRepository.findByCreatedAtAfter(cutoff);
            // 90 günden eski kayıtları sil
            pageViewRepository.deleteAll(
                pageViewRepository.findAll().stream()
                    .filter(v -> v.getCreatedAt().isBefore(cutoff))
                    .toList()
            );
            log.info("Eski sayfa görüntüleme kayıtları temizlendi: {} kayıt silindi", 
                oldViews.size());
        } catch (Exception e) {
            log.warn("Sayfa görüntüleme temizleme hatası: {}", e.getMessage());
        }
    }
    
    /**
     * Aktif ziyaretçi sayısını getir
     */
    public long getActiveVisitorCount() {
        LocalDateTime since = LocalDateTime.now().minusMinutes(5);
        return visitorRepository.countActiveVisitors(since);
    }
    
    /**
     * Belirli bir tip için aktif ziyaretçi sayısını getir
     */
    public long getActiveVisitorCountByType(VisitorType type) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(5);
        return visitorRepository.countActiveVisitorsByType(since, type);
    }
}


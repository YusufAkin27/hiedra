package eticaret.demo.visitor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Visitor analytics service
 * Ziyaretçi istatistikleri ve analizleri için servis
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VisitorAnalyticsService {
    
    private final ActiveVisitorRepository activeVisitorRepository;
    private final VisitorPageViewRepository pageViewRepository;
    
    /**
     * Genel ziyaretçi istatistikleri
     */
    @Transactional(readOnly = true)
    public VisitorStatistics getVisitorStatistics(LocalDateTime since) {
        VisitorStatistics stats = new VisitorStatistics();
        stats.setSince(since);
        
        // Aktif ziyaretçiler
        long activeCount = activeVisitorRepository.countActiveVisitors(since);
        stats.setActiveVisitors(activeCount);
        
        // Tip bazlı aktif ziyaretçiler
        stats.setActiveGuests(activeVisitorRepository.countActiveVisitorsByType(since, VisitorType.MISAFIR));
        stats.setActiveUsers(activeVisitorRepository.countActiveVisitorsByType(since, VisitorType.KULLANICI));
        stats.setActiveAdmins(activeVisitorRepository.countActiveVisitorsByType(since, VisitorType.YONETICI));
        
        // Sayfa görüntülemeleri
        long totalPageViews = pageViewRepository.countByCreatedAtAfter(since);
        stats.setTotalPageViews(totalPageViews);
        
        // Benzersiz ziyaretçiler (session bazlı)
        long uniqueVisitors = pageViewRepository.countDistinctSessions(since);
        stats.setUniqueVisitors(uniqueVisitors);
        
        // Ortalama sayfa görüntüleme süresi
        Double avgDuration = pageViewRepository.calculateAverageDuration(since);
        stats.setAveragePageViewDuration(avgDuration != null ? avgDuration : 0.0);
        
        // Cihaz istatistikleri
        Map<String, Long> deviceStats = new HashMap<>();
        for (VisitorPageView.DeviceType deviceType : VisitorPageView.DeviceType.values()) {
            long count = pageViewRepository.countByDeviceTypeAndCreatedAtAfter(deviceType, since);
            deviceStats.put(deviceType.name(), count);
        }
        stats.setDeviceStatistics(deviceStats);
        
        // Tarayıcı istatistikleri
        List<Object[]> browserStats = pageViewRepository.findBrowserStatistics(since);
        Map<String, Long> browserMap = browserStats.stream()
                .collect(Collectors.toMap(
                    arr -> (String) arr[0],
                    arr -> (Long) arr[1]
                ));
        stats.setBrowserStatistics(browserMap);
        
        // En çok görüntülenen sayfalar
        List<Object[]> topPages = pageViewRepository.findMostViewedPages(since);
        Map<String, Long> topPagesMap = topPages.stream()
                .limit(10)
                .collect(Collectors.toMap(
                    arr -> (String) arr[0],
                    arr -> (Long) arr[1]
                ));
        stats.setTopPages(topPagesMap);
        
        return stats;
    }
    
    /**
     * Ziyaretçi trend analizi (günlük)
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getDailyVisitorTrend(int days) {
        Map<String, Long> trend = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (int i = days - 1; i >= 0; i--) {
            LocalDateTime dayStart = now.minusDays(i).withHour(0).withMinute(0).withSecond(0);
            
            long count = pageViewRepository.countDistinctSessions(dayStart);
            String dateKey = dayStart.toLocalDate().toString();
            trend.put(dateKey, count);
        }
        
        return trend;
    }
    
    /**
     * Sayfa görüntüleme trend analizi
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getPageViewTrend(int days) {
        Map<String, Long> trend = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (int i = days - 1; i >= 0; i--) {
            LocalDateTime dayStart = now.minusDays(i).withHour(0).withMinute(0).withSecond(0);
            
            long count = pageViewRepository.countByCreatedAtAfter(dayStart);
            String dateKey = dayStart.toLocalDate().toString();
            trend.put(dateKey, count);
        }
        
        return trend;
    }
    
    /**
     * Visitor statistics DTO
     */
    public static class VisitorStatistics {
        private LocalDateTime since;
        private long activeVisitors;
        private long activeGuests;
        private long activeUsers;
        private long activeAdmins;
        private long totalPageViews;
        private long uniqueVisitors;
        private double averagePageViewDuration;
        private Map<String, Long> deviceStatistics;
        private Map<String, Long> browserStatistics;
        private Map<String, Long> topPages;
        
        // Getters and Setters
        public LocalDateTime getSince() { return since; }
        public void setSince(LocalDateTime since) { this.since = since; }
        
        public long getActiveVisitors() { return activeVisitors; }
        public void setActiveVisitors(long activeVisitors) { this.activeVisitors = activeVisitors; }
        
        public long getActiveGuests() { return activeGuests; }
        public void setActiveGuests(long activeGuests) { this.activeGuests = activeGuests; }
        
        public long getActiveUsers() { return activeUsers; }
        public void setActiveUsers(long activeUsers) { this.activeUsers = activeUsers; }
        
        public long getActiveAdmins() { return activeAdmins; }
        public void setActiveAdmins(long activeAdmins) { this.activeAdmins = activeAdmins; }
        
        public long getTotalPageViews() { return totalPageViews; }
        public void setTotalPageViews(long totalPageViews) { this.totalPageViews = totalPageViews; }
        
        public long getUniqueVisitors() { return uniqueVisitors; }
        public void setUniqueVisitors(long uniqueVisitors) { this.uniqueVisitors = uniqueVisitors; }
        
        public double getAveragePageViewDuration() { return averagePageViewDuration; }
        public void setAveragePageViewDuration(double averagePageViewDuration) { 
            this.averagePageViewDuration = averagePageViewDuration; 
        }
        
        public Map<String, Long> getDeviceStatistics() { return deviceStatistics; }
        public void setDeviceStatistics(Map<String, Long> deviceStatistics) { 
            this.deviceStatistics = deviceStatistics; 
        }
        
        public Map<String, Long> getBrowserStatistics() { return browserStatistics; }
        public void setBrowserStatistics(Map<String, Long> browserStatistics) { 
            this.browserStatistics = browserStatistics; 
        }
        
        public Map<String, Long> getTopPages() { return topPages; }
        public void setTopPages(Map<String, Long> topPages) { this.topPages = topPages; }
    }
}


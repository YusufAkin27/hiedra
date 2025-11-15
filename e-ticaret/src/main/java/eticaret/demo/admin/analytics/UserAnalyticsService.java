package eticaret.demo.admin.analytics;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.cart.Cart;
import eticaret.demo.cart.CartRepository;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.product.ProductReview;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.product.ProductViewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Kullanıcı analitik servisi
 * Kullanıcı davranışlarını analiz eder ve istatistikler üretir
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserAnalyticsService {
    
    private final AppUserRepository userRepository;
    private final UserBehaviorRepository behaviorRepository;
    private final ProductViewRepository productViewRepository;
    private final ProductReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    
    /**
     * Kullanıcı davranışını kaydet
     */
    @Transactional
    public void trackBehavior(UserBehavior behavior) {
        try {
            behaviorRepository.save(behavior);
        } catch (Exception e) {
            log.error("Davranış kaydedilirken hata: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Kullanıcı istatistiklerini getir
     */
    @Transactional(readOnly = true)
    public UserStatistics getUserStatistics(Long userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı: " + userId));
        
        UserStatistics stats = new UserStatistics();
        stats.setUserId(userId);
        stats.setEmail(user.getEmail());
        stats.setFullName(user.getFullName());
        stats.setRegistrationDate(user.getCreatedAt());
        stats.setLastLoginDate(user.getLastLoginAt());
        stats.setEmailVerified(user.isEmailVerified());
        stats.setActive(user.isActive());
        
        // Ürün görüntülemeleri
        List<Long> viewedProductIds = productViewRepository.findViewedProductIdsByUserId(userId);
        stats.setTotalProductViews(viewedProductIds.size());
        stats.setUniqueProductsViewed((int) viewedProductIds.stream().distinct().count());
        
        // Yorumlar
        List<ProductReview> reviews = reviewRepository.findByUserId(userId);
        stats.setTotalReviews(reviews.size());
        stats.setAverageRating(reviews.stream()
                .filter(r -> r.getRating() != null)
                .mapToInt(ProductReview::getRating)
                .average()
                .orElse(0.0));
        
        // Siparişler
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getUser() != null && o.getUser().getId().equals(userId))
                .collect(Collectors.toList());
        
        stats.setTotalOrders(orders.size());
        stats.setCompletedOrders((int) orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.TAMAMLANDI || 
                            o.getStatus() == OrderStatus.TESLIM_EDILDI)
                .count());
        stats.setCancelledOrders((int) orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.IPTAL_EDILDI)
                .count());
        
        BigDecimal totalSpent = orders.stream()
                .filter(o -> o.getTotalAmount() != null)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalSpent(totalSpent);
        stats.setAverageOrderValue(orders.isEmpty() ? BigDecimal.ZERO : 
                totalSpent.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP));
        
        // Sepet istatistikleri
        List<Cart> carts = cartRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        stats.setTotalCarts(carts.size());
        stats.setActiveCarts((int) carts.stream()
                .filter(c -> c.getStatus().name().equals("AKTIF"))
                .count());
        
        BigDecimal totalCartValue = carts.stream()
                .filter(c -> c.getTotalAmount() != null)
                .map(Cart::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalCartValue(totalCartValue);
        stats.setAverageCartValue(carts.isEmpty() ? BigDecimal.ZERO :
                totalCartValue.divide(BigDecimal.valueOf(carts.size()), 2, RoundingMode.HALF_UP));
        
        // Davranış istatistikleri
        List<UserBehavior> behaviors = behaviorRepository.findByUserIdOrderByCreatedAtDesc(userId);
        stats.setTotalBehaviors(behaviors.size());
        
        Map<UserBehavior.BehaviorType, Long> behaviorCounts = behaviors.stream()
                .collect(Collectors.groupingBy(
                        UserBehavior::getBehaviorType,
                        Collectors.counting()
                ));
        stats.setBehaviorCounts(behaviorCounts);
        
        // Son aktivite
        if (!behaviors.isEmpty()) {
            stats.setLastActivityDate(behaviors.get(0).getCreatedAt());
        }
        
        // Engagement skoru (0-100)
        double engagementScore = calculateEngagementScore(stats);
        stats.setEngagementScore(engagementScore);
        
        // Kullanıcı segmenti
        stats.setUserSegment(determineUserSegment(stats));
        
        return stats;
    }
    
    /**
     * Engagement skorunu hesapla
     */
    private double calculateEngagementScore(UserStatistics stats) {
        double score = 0.0;
        
        // Ürün görüntülemeleri (max 20 puan)
        score += Math.min(stats.getTotalProductViews() * 0.5, 20.0);
        
        // Yorumlar (max 15 puan)
        score += Math.min(stats.getTotalReviews() * 3.0, 15.0);
        
        // Siparişler (max 30 puan)
        score += Math.min(stats.getTotalOrders() * 5.0, 30.0);
        
        // Harcama (max 20 puan)
        if (stats.getTotalSpent().compareTo(BigDecimal.valueOf(1000)) > 0) {
            score += 20.0;
        } else if (stats.getTotalSpent().compareTo(BigDecimal.valueOf(500)) > 0) {
            score += 15.0;
        } else if (stats.getTotalSpent().compareTo(BigDecimal.ZERO) > 0) {
            score += 10.0;
        }
        
        // Aktivite sıklığı (max 15 puan)
        if (stats.getLastActivityDate() != null) {
            long daysSinceLastActivity = java.time.temporal.ChronoUnit.DAYS.between(
                    stats.getLastActivityDate(), LocalDateTime.now());
            if (daysSinceLastActivity <= 1) {
                score += 15.0;
            } else if (daysSinceLastActivity <= 7) {
                score += 10.0;
            } else if (daysSinceLastActivity <= 30) {
                score += 5.0;
            }
        }
        
        return Math.min(score, 100.0);
    }
    
    /**
     * Kullanıcı segmentini belirle
     */
    private String determineUserSegment(UserStatistics stats) {
        if (stats.getTotalOrders() == 0) {
            return "VISITOR"; // Sadece gezen
        } else if (stats.getTotalOrders() == 1) {
            return "NEW_CUSTOMER"; // Yeni müşteri
        } else if (stats.getTotalOrders() <= 5) {
            return "REGULAR_CUSTOMER"; // Düzenli müşteri
        } else if (stats.getTotalOrders() <= 10) {
            return "LOYAL_CUSTOMER"; // Sadık müşteri
        } else {
            return "VIP_CUSTOMER"; // VIP müşteri
        }
    }
    
    /**
     * Tüm kullanıcılar için özet istatistikler
     */
    @Transactional(readOnly = true)
    public UserAnalyticsSummary getAnalyticsSummary(LocalDateTime startDate, LocalDateTime endDate) {
        UserAnalyticsSummary summary = new UserAnalyticsSummary();
        
        // Toplam kullanıcı sayısı
        long totalUsers = userRepository.count();
        summary.setTotalUsers(totalUsers);
        
        // Aktif kullanıcılar (son 30 günde giriş yapan)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long activeUsers = userRepository.countByLastLoginAtAfter(thirtyDaysAgo);
        summary.setActiveUsers(activeUsers);
        
        // Yeni kullanıcılar (belirtilen tarih aralığında)
        long newUsers = userRepository.countByCreatedAtAfter(startDate != null ? startDate : thirtyDaysAgo);
        summary.setNewUsers(newUsers);
        
        // Toplam davranış sayısı
        long totalBehaviors = behaviorRepository.countByCreatedAtAfter(
                startDate != null ? startDate : thirtyDaysAgo);
        summary.setTotalBehaviors(totalBehaviors);
        
        // En sık yapılan davranışlar
        List<Object[]> commonBehaviors = behaviorRepository.findMostCommonBehaviors();
        Map<String, Long> behaviorMap = new HashMap<>();
        for (Object[] result : commonBehaviors) {
            UserBehavior.BehaviorType type = (UserBehavior.BehaviorType) result[0];
            Long count = ((Number) result[1]).longValue();
            behaviorMap.put(type.name(), count);
        }
        summary.setBehaviorDistribution(behaviorMap);
        
        // Kullanıcı segmentasyonu
        List<AppUser> allUsers = userRepository.findAll();
        Map<String, Long> segmentCounts = new HashMap<>();
        for (AppUser user : allUsers) {
            UserStatistics userStats = getUserStatistics(user.getId());
            String segment = userStats.getUserSegment();
            segmentCounts.put(segment, segmentCounts.getOrDefault(segment, 0L) + 1);
        }
        summary.setUserSegments(segmentCounts);
        
        return summary;
    }
    
    /**
     * Kullanıcı istatistikleri DTO
     */
    @lombok.Data
    public static class UserStatistics {
        private Long userId;
        private String email;
        private String fullName;
        private LocalDateTime registrationDate;
        private LocalDateTime lastLoginDate;
        private LocalDateTime lastActivityDate;
        private boolean emailVerified;
        private boolean active;
        
        // Ürün görüntülemeleri
        private int totalProductViews;
        private int uniqueProductsViewed;
        
        // Yorumlar
        private int totalReviews;
        private double averageRating;
        
        // Siparişler
        private int totalOrders;
        private int completedOrders;
        private int cancelledOrders;
        private BigDecimal totalSpent;
        private BigDecimal averageOrderValue;
        
        // Sepet
        private int totalCarts;
        private int activeCarts;
        private BigDecimal totalCartValue;
        private BigDecimal averageCartValue;
        
        // Davranışlar
        private int totalBehaviors;
        private Map<UserBehavior.BehaviorType, Long> behaviorCounts;
        
        // Analiz
        private double engagementScore;
        private String userSegment; // VISITOR, NEW_CUSTOMER, REGULAR_CUSTOMER, LOYAL_CUSTOMER, VIP_CUSTOMER
    }
    
    /**
     * Analitik özet DTO
     */
    @lombok.Data
    public static class UserAnalyticsSummary {
        private long totalUsers;
        private long activeUsers;
        private long newUsers;
        private long totalBehaviors;
        private Map<String, Long> behaviorDistribution;
        private Map<String, Long> userSegments;
    }
}


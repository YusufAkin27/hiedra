package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.contact_us.ContactUs;
import eticaret.demo.contact_us.ContactUsRepository;
import eticaret.demo.response.DataResponseMessage;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.guest.GuestUserRepository;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.visitor.ActiveVisitorRepository;
import eticaret.demo.visitor.VisitorType;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ContactUsRepository contactUsRepository;
    private final ProductReviewRepository reviewRepository;
    private final GuestUserRepository guestUserRepository;
    private final AppUserRepository appUserRepository;
    private final ActiveVisitorRepository visitorRepository;

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
        Map<String, Object> stats = new HashMap<>();
        
        // Ürün istatistikleri
        long totalProducts = productRepository.count();
        stats.put("totalProducts", totalProducts);
        
        // Sipariş istatistikleri
        long totalOrders = orderRepository.count();
        stats.put("totalOrders", totalOrders);
        
        // Duruma göre sipariş sayıları
        Map<String, Long> ordersByStatus = new HashMap<>();
        for (OrderStatus status : OrderStatus.values()) {
            long count = orderRepository.countByStatus(status);
            ordersByStatus.put(status.name(), count);
        }
        stats.put("ordersByStatus", ordersByStatus);
        
        // Toplam gelir (PAID, DELIVERED, COMPLETED durumundaki siparişler)
        BigDecimal totalRevenue = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() == OrderStatus.ODENDI ||
                           o.getStatus() == OrderStatus.TESLIM_EDILDI ||
                           o.getStatus() == OrderStatus.TAMAMLANDI)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.put("totalRevenue", totalRevenue);
        
        // Bugünkü siparişler
        long todayOrders = orderRepository.findAll().stream()
                .filter(o -> o.getCreatedAt().toLocalDate().equals(LocalDateTime.now().toLocalDate()))
                .count();
        stats.put("todayOrders", todayOrders);
        
        // Bekleyen mesajlar (doğrulanmış ama yanıtlanmamış)
        long pendingMessages = contactUsRepository.findAll().stream()
                .filter(ContactUs::isVerified)
                .count();
        stats.put("pendingMessages", pendingMessages);
        
        // Yorum istatistikleri
        long totalReviews = reviewRepository.count();
        long activeReviews = reviewRepository.findAllActive().size();
        long pendingReviews = totalReviews - activeReviews;
        Double averageRating = reviewRepository.findAllActive().stream()
                .mapToInt(r -> r.getRating() != null ? r.getRating() : 0)
                .average()
                .orElse(0.0);
        stats.put("totalReviews", totalReviews);
        stats.put("activeReviews", activeReviews);
        stats.put("pendingReviews", pendingReviews);
        stats.put("averageRating", averageRating);
        
        // Guest kullanıcı istatistikleri
        long totalGuests = guestUserRepository.countAllGuests();
        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
        long activeGuestsLast24Hours = guestUserRepository.countActiveGuestsSince(last24Hours);
        stats.put("totalGuests", totalGuests);
        stats.put("activeGuestsLast24Hours", activeGuestsLast24Hours);
        
        // Aktif ziyaretçi istatistikleri
        LocalDateTime last5Minutes = LocalDateTime.now().minusMinutes(5);
        long activeVisitorsNow = visitorRepository.countActiveVisitors(last5Minutes);
        LocalDateTime last1Hour = LocalDateTime.now().minusHours(1);
        long activeVisitorsLastHour = visitorRepository.countActiveVisitors(last1Hour);
        stats.put("activeVisitorsNow", activeVisitorsNow);
        stats.put("activeVisitorsLastHour", activeVisitorsLastHour);

        long activeGuestSessions = visitorRepository.countActiveVisitorsByType(last5Minutes, VisitorType.MISAFIR);
        long activeUserSessions = visitorRepository.countActiveVisitorsByType(last5Minutes, VisitorType.KULLANICI);
        long activeAdminSessions = visitorRepository.countActiveVisitorsByType(last5Minutes, VisitorType.YONETICI);
        stats.put("activeGuestSessions", activeGuestSessions);
        stats.put("activeUserSessions", activeUserSessions);
        stats.put("activeAdminSessions", activeAdminSessions);
        stats.put("activeAuthenticatedSessions", activeUserSessions + activeAdminSessions);

        // Kullanıcı istatistikleri
        long totalUsers = appUserRepository.count();
        long activeUsers = appUserRepository.countByActiveTrue();
        long verifiedUsers = appUserRepository.countByEmailVerifiedTrue();
        long adminUsers = appUserRepository.countByRole(UserRole.ADMIN);
        long customerUsers = appUserRepository.countByRole(UserRole.USER);
        LocalDateTime usersLast7Days = LocalDateTime.now().minusDays(7);
        long newUsersLast7Days = appUserRepository.countByCreatedAtAfter(usersLast7Days);
        long usersLoggedLast24Hours = appUserRepository.countByLastLoginAtAfter(last24Hours);

        stats.put("totalUsers", totalUsers);
        stats.put("activeUsers", activeUsers);
        stats.put("verifiedUsers", verifiedUsers);
        stats.put("adminUsers", adminUsers);
        stats.put("customerUsers", customerUsers);
        stats.put("newUsersLast7Days", newUsersLast7Days);
        stats.put("usersLoggedLast24Hours", usersLoggedLast24Hours);
        
        // Son 7 günlük sipariş trendi
        Map<String, Long> ordersLast7Days = new HashMap<>();
        for (int i = 6; i >= 0; i--) {
            LocalDateTime date = LocalDateTime.now().minusDays(i);
            long count = orderRepository.findAll().stream()
                    .filter(o -> o.getCreatedAt().toLocalDate().equals(date.toLocalDate()))
                    .count();
            ordersLast7Days.put(date.toLocalDate().toString(), count);
        }
        stats.put("ordersLast7Days", ordersLast7Days);
        
        // ETag oluştur (stats verisinin hash'i)
        String etag = generateETag(stats);
        
        // If-None-Match header'ı varsa ve ETag eşleşiyorsa 304 döndür
        if (ifNoneMatch != null && ifNoneMatch.equals(etag)) {
            HttpHeaders headers = new HttpHeaders();
            headers.setETag(etag);
            headers.setCacheControl("public, max-age=300"); // 5 dakika cache
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).headers(headers).build();
        }
        
        // Yeni veri döndür
        HttpHeaders headers = new HttpHeaders();
        headers.setETag(etag);
        headers.setCacheControl("public, max-age=300"); // 5 dakika cache
        headers.set("Vary", "Authorization"); // Authorization header'ına göre cache
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(DataResponseMessage.success("İstatistikler başarıyla getirildi", stats));
    }
    
    /**
     * Stats verisinden ETag oluştur
     */
    private String generateETag(Map<String, Object> stats) {
        try {
            // Stats verisini string'e çevir ve hash'le
            String data = stats.toString();
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hashBytes = md.digest(data.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return "\"" + sb.toString() + "\"";
        } catch (Exception e) {
            // Hata durumunda timestamp kullan
            return "\"" + String.valueOf(System.currentTimeMillis()) + "\"";
        }
    }
}


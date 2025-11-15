package eticaret.demo.admin;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.address.Address;
import eticaret.demo.address.AdresRepository;
import eticaret.demo.audit.AuditLog;
import eticaret.demo.audit.AuditLogRepository;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.cart.Cart;
import eticaret.demo.cart.CartRepository;
import eticaret.demo.coupon.CouponUsage;
import eticaret.demo.coupon.CouponUsageRepository;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.product.ProductReview;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.response.DataResponseMessage;


import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AppUserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdresRepository addressRepository;
    private final CartRepository cartRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final ProductReviewRepository productReviewRepository;
    private final OrderRepository orderRepository;

    @GetMapping
    public ResponseEntity<DataResponseMessage<List<UserSummary>>> getAllUsers() {
        List<AppUser> users = userRepository.findAll();
        List<UserSummary> summaries = users.stream()
                .map(user -> UserSummary.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .emailVerified(user.isEmailVerified())
                        .active(user.isActive())
                        .lastLoginAt(user.getLastLoginAt())
                        .createdAt(user.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(DataResponseMessage.success("Kullanıcılar başarıyla getirildi", summaries));
    }

    /**
     * Email veya ID ile kullanıcı ara
     * GET /api/admin/users/search?query=email@example.com veya ?query=123
     */
    @GetMapping("/search")
    public ResponseEntity<DataResponseMessage<List<UserSummary>>> searchUsers(@RequestParam String query) {
        List<AppUser> users = new ArrayList<>();
        
        // ID ile arama
        try {
            Long userId = Long.parseLong(query);
            userRepository.findById(userId).ifPresent(users::add);
        } catch (NumberFormatException e) {
            // ID değilse email ile ara
            userRepository.findByEmailIgnoreCase(query).ifPresent(users::add);
        }
        
        // Email ile kısmi eşleşme
        if (users.isEmpty()) {
            List<AppUser> allUsers = userRepository.findAll();
            users = allUsers.stream()
                    .filter(user -> user.getEmail().toLowerCase().contains(query.toLowerCase()))
                    .collect(Collectors.toList());
        }
        
        List<UserSummary> summaries = users.stream()
                .map(user -> UserSummary.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .emailVerified(user.isEmailVerified())
                        .active(user.isActive())
                        .lastLoginAt(user.getLastLoginAt())
                        .createdAt(user.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(DataResponseMessage.success("Arama sonuçları", summaries));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<UserSummary>> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    UserSummary summary = UserSummary.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .role(user.getRole().name())
                            .emailVerified(user.isEmailVerified())
                            .active(user.isActive())
                            .lastLoginAt(user.getLastLoginAt())
                            .createdAt(user.getCreatedAt())
                            .build();
                    return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı başarıyla getirildi", summary));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Kullanıcının tüm detaylarını getir (audit logs, adresler, sepet, kuponlar, yorumlar, siparişler)
     * GET /api/admin/users/{id}/details
     */
    @GetMapping("/{id}/details")
    public ResponseEntity<DataResponseMessage<UserDetailsResponse>> getUserDetails(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    UserDetailsResponse details = new UserDetailsResponse();
                    
                    // Kullanıcı bilgileri
                    details.setUser(UserSummary.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .role(user.getRole().name())
                            .emailVerified(user.isEmailVerified())
                            .active(user.isActive())
                            .lastLoginAt(user.getLastLoginAt())
                            .createdAt(user.getCreatedAt())
                            .fullName(user.getFullName())
                            .phone(user.getPhone())
                            .build());
                    
                    // Audit logları
                    List<AuditLog> auditLogs = auditLogRepository.findByUserIdOrderByCreatedAtDesc(String.valueOf(user.getId()));
                    details.setAuditLogs(auditLogs.stream()
                            .map(log -> AuditLogSummary.builder()
                                    .id(log.getId())
                                    .action(log.getAction())
                                    .entityType(log.getEntityType())
                                    .entityId(log.getEntityId())
                                    .description(log.getDescription())
                                    .ipAddress(log.getIpAddress())
                                    .status(log.getStatus())
                                    .createdAt(log.getCreatedAt())
                                    .build())
                            .collect(Collectors.toList()));
                    
                    // Adresler
                    List<Address> addresses = addressRepository.findByUser_IdOrderByIsDefaultDescCreatedAtDesc(user.getId());
                    details.setAddresses(addresses.stream()
                            .map(addr -> AddressSummary.builder()
                                    .id(addr.getId())
                                    .fullName(addr.getFullName())
                                    .phone(addr.getPhone())
                                    .addressLine(addr.getAddressLine())
                                    .addressDetail(addr.getAddressDetail())
                                    .city(addr.getCity())
                                    .district(addr.getDistrict())
                                    .isDefault(addr.getIsDefault())
                                    .createdAt(addr.getCreatedAt())
                                    .build())
                            .collect(Collectors.toList()));
                    
                    // Sepetler
                    List<Cart> carts = cartRepository.findByUser_IdOrderByCreatedAtDesc(user.getId());
                    details.setCarts(carts.stream()
                            .map(cart -> CartSummary.builder()
                                    .id(cart.getId())
                                    .status(cart.getStatus().name())
                                    .totalAmount(cart.getTotalAmount())
                                    .itemCount(cart.getItems() != null ? cart.getItems().size() : 0)
                                    .createdAt(cart.getCreatedAt())
                                    .updatedAt(cart.getUpdatedAt())
                                    .build())
                            .collect(Collectors.toList()));
                    
                    // Kupon kullanımları
                    List<CouponUsage> couponUsages = couponUsageRepository.findByUser_IdOrderByCreatedAtDesc(user.getId());
                    details.setCouponUsages(couponUsages.stream()
                            .map(usage -> CouponUsageSummary.builder()
                                    .id(usage.getId())
                                    .couponCode(usage.getCoupon() != null ? usage.getCoupon().getCode() : null)
                                    .couponName(usage.getCoupon() != null ? usage.getCoupon().getName() : null)
                                    .discountAmount(usage.getDiscountAmount())
                                    .status(usage.getStatus().name())
                                    .usedAt(usage.getUsedAt())
                                    .createdAt(usage.getCreatedAt())
                                    .build())
                            .collect(Collectors.toList()));
                    
                    // Ürün yorumları
                    List<ProductReview> reviews = productReviewRepository.findByUserId(user.getId());
                    details.setReviews(reviews.stream()
                            .map(review -> {
                                ReviewSummary.ReviewSummaryBuilder builder = ReviewSummary.builder()
                                        .id(review.getId())
                                        .productId(review.getProduct() != null ? review.getProduct().getId() : null)
                                        .productName(review.getProduct() != null ? review.getProduct().getName() : null)
                                        .rating(review.getRating())
                                        .comment(review.getComment())
                                        .active(Boolean.TRUE.equals(review.getActive()))
                                        .createdAt(review.getCreatedAt());
                                return builder.build();
                            })
                            .collect(Collectors.toList()));
                    
                    // Siparişler - user field'ına göre veya email'e göre
                    List<Order> orders = orderRepository.findAllByOrderByCreatedAtDesc().stream()
                            .filter(order -> (order.getUser() != null && order.getUser().getId().equals(user.getId())) ||
                                           (order.getCustomerEmail() != null && order.getCustomerEmail().equalsIgnoreCase(user.getEmail())))
                            .toList();
                    details.setOrders(orders.stream()
                            .map(order -> OrderSummary.builder()
                                    .id(order.getId())
                                    .orderNumber(order.getOrderNumber())
                                    .status(order.getStatus().name())
                                    .totalAmount(order.getTotalAmount())
                                    .itemCount(order.getOrderItems() != null ? order.getOrderItems().size() : 0)
                                    .createdAt(order.getCreatedAt())
                                    .build())
                            .collect(Collectors.toList()));
                    
                    return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı detayları başarıyla getirildi", details));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/logs")
    public ResponseEntity<DataResponseMessage<List<UserLog>>> getUserLogs() {
        List<AppUser> users = userRepository.findAll();
        List<UserLog> logs = users.stream()
                .map(user -> UserLog.builder()
                        .userId(user.getId())
                        .email(user.getEmail())
                        .action("LOGIN")
                        .timestamp(user.getLastLoginAt() != null ? user.getLastLoginAt() : user.getCreatedAt())
                        .details(Map.of(
                                "role", user.getRole().name(),
                                "emailVerified", String.valueOf(user.isEmailVerified()),
                                "active", String.valueOf(user.isActive())
                        ))
                        .build())
                .filter(log -> log.getTimestamp() != null)
                .sorted((l1, l2) -> l2.getTimestamp().compareTo(l1.getTimestamp()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı logları başarıyla getirildi", logs));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<DataResponseMessage<UserSummary>> updateUserStatus(
            @PathVariable Long id,
            @RequestBody UpdateUserStatusRequest request) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setActive(request.isActive());
                    AppUser updated = userRepository.save(user);
                    UserSummary summary = UserSummary.builder()
                            .id(updated.getId())
                            .email(updated.getEmail())
                            .role(updated.getRole().name())
                            .emailVerified(updated.isEmailVerified())
                            .active(updated.isActive())
                            .lastLoginAt(updated.getLastLoginAt())
                            .createdAt(updated.getCreatedAt())
                            .build();
                    return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı durumu güncellendi", summary));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Data
    @lombok.Builder
    public static class UserSummary {
        private Long id;
        private String email;
        private String fullName;
        private String phone;
        private String role;
        private boolean emailVerified;
        private boolean active;
        private LocalDateTime lastLoginAt;
        private LocalDateTime createdAt;
    }

    @Data
    @lombok.Builder
    public static class UserLog {
        private Long userId;
        private String email;
        private String action;
        private LocalDateTime timestamp;
        private Map<String, String> details;
    }

    @Data
    public static class UpdateUserStatusRequest {
        private boolean active;
    }

    @Data
    public static class UserDetailsResponse {
        private UserSummary user;
        private List<AuditLogSummary> auditLogs;
        private List<AddressSummary> addresses;
        private List<CartSummary> carts;
        private List<CouponUsageSummary> couponUsages;
        private List<ReviewSummary> reviews;
        private List<OrderSummary> orders;
    }

    @Data
    @lombok.Builder
    public static class AuditLogSummary {
        private Long id;
        private String action;
        private String entityType;
        private Long entityId;
        private String description;
        private String ipAddress;
        private String status;
        private LocalDateTime createdAt;
    }

    @Data
    @lombok.Builder
    public static class AddressSummary {
        private Long id;
        private String fullName;
        private String phone;
        private String addressLine;
        private String addressDetail;
        private String city;
        private String district;
        private Boolean isDefault;
        private LocalDateTime createdAt;
    }

    @Data
    @lombok.Builder
    public static class CartSummary {
        private Long id;
        private String status;
        private java.math.BigDecimal totalAmount;
        private Integer itemCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @lombok.Builder
    public static class CouponUsageSummary {
        private Long id;
        private String couponCode;
        private String couponName;
        private java.math.BigDecimal discountAmount;
        private String status;
        private LocalDateTime usedAt;
        private LocalDateTime createdAt;
    }

    @Data
    @lombok.Builder
    public static class ReviewSummary {
        private Long id;
        private Long productId;
        private String productName;
        private Integer rating;
        private String comment;
        private boolean active;
        private LocalDateTime createdAt;
    }

    @Data
    @lombok.Builder
    public static class OrderSummary {
        private Long id;
        private String orderNumber;
        private String status;
        private java.math.BigDecimal totalAmount;
        private Integer itemCount;
        private LocalDateTime createdAt;
    }
}


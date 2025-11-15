package eticaret.demo.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderResponseDTO {
    
    private Long id;
    private String orderNumber;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private OrderStatus status;
    private String statusDescription;
    
    // Müşteri bilgileri
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    
    // Adres bilgileri
    private List<AddressDTO> addresses;
    
    // Sipariş kalemleri
    private List<OrderItemDTO> orderItems;
    
    // İptal/İade bilgileri
    private boolean canCancel;
    private boolean canRefund;
    private String cancelReason;
    private LocalDateTime cancelledAt;
    private String cancelledBy;
    private LocalDateTime refundedAt;
    private BigDecimal refundAmount;
    private String refundReason;
    
    // Ödeme bilgileri
    private String paymentTransactionId;
    private String paymentId;
    private String paymentMethod;
    private LocalDateTime paidAt;
    
    // Kargo bilgileri
    private String trackingNumber;
    private String carrier;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime expectedDeliveryDate;
    
    // Fiyat detayları
    private BigDecimal subtotal;
    private BigDecimal shippingCost;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    
    // Diğer bilgiler
    private String orderSource;
    private String adminNotes;
    private Long userId;
    private String guestUserId;
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AddressDTO {
        private Long id;
        private String fullName;
        private String phone;
        private String addressLine;
        private String addressDetail;
        private String city;
        private String district;
    }
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrderItemDTO {
        private Long id;
        private String productName;
        private Double width;
        private Double height;
        private String pleatType;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private Long productId;
        private String productImageUrl;
        private String productSku;
    }
}
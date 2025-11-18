package eticaret.demo.payment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TopUpSessionData {
    private String username;
    private String fullName;
    private String phone;
    private String address;
    private String city;
    private String district;
    private String addressDetail;
    private BigDecimal amount;
    // Login kullanıcı için seçilen adres bilgileri
    private Long addressId;
    private Long userId;
    // Sepet bilgileri
    private Long cartId;
    private String guestUserId;
    private List<OrderDetail> orderDetails; // Sipariş detayları (sepet veya direkt)
    // Kupon bilgileri
    private String couponCode; // Uygulanan kupon kodu
    private BigDecimal discountAmount; // Kupon indirimi
}

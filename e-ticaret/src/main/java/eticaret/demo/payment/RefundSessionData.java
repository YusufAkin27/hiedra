package eticaret.demo.payment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RefundSessionData {
    private String paymentId;
    private String conversationId;
    private String firstName;
    private String lastName;
    private String email;
    private String paymentTransactionId;
    private String phone;
    private String address;
    private String city;
    private String district;
    private String addressDetail;
    private BigDecimal amount;
    private LocalDateTime paymentDate;
    private String orderNumber;
    private String cardNumber; // Son 4 hane için
    private String ip;
}
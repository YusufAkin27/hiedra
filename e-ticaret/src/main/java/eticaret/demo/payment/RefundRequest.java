package eticaret.demo.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RefundRequest {

    @NotBlank(message = "Ödeme ID'si boş olamaz.")
    private String paymentId;

    @NotNull(message = "İade tutarı boş olamaz.")
    @DecimalMin(value = "0.01", message = "İade tutarı 0'dan büyük olmalıdır.")
    private BigDecimal refundAmount;

    private String reason; // İade nedeni (opsiyonel)
    
    private String ip; // İsteği atan IP
}
package eticaret.demo.order;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OrderQueryRequest {
    
    @NotBlank(message = "Sipariş numarası boş olamaz.")
    private String orderNumber;
    
    @NotBlank(message = "Email boş olamaz.")
    @Email(message = "Geçerli bir email adresi giriniz.")
    private String customerEmail;
}
package eticaret.demo.contact_us;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Admin yanıt isteği DTO'su
 */
@Data
public class AdminResponseRequest {
    
    @NotBlank(message = "Yanıt mesajı zorunludur")
    @Size(min = 5, max = 5000, message = "Yanıt mesajı 5 ile 5000 karakter arasında olmalıdır")
    private String response;
}
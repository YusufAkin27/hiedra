package eticaret.demo.contact_us;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * İletişim formu mesaj DTO'su
 * Detaylı validasyon kuralları ile
 */
@Data
public class ContactUsMessage {
    
    @NotBlank(message = "Ad Soyad alanı zorunludur")
    @Size(min = 2, max = 200, message = "Ad Soyad 2 ile 200 karakter arasında olmalıdır")
    private String name;
    
    @NotBlank(message = "E-posta adresi zorunludur")
    @Email(message = "Geçerli bir e-posta adresi giriniz")
    @Size(max = 255, message = "E-posta adresi en fazla 255 karakter olabilir")
    private String email;
    
    @NotBlank(message = "Mesaj alanı zorunludur")
    @Size(min = 5, max = 5000, message = "Mesaj 5 ile 5000 karakter arasında olmalıdır")
    private String message;
    
    @Size(max = 20, message = "Telefon numarası en fazla 20 karakter olabilir")
    private String phone;
    
    @NotBlank(message = "Konu alanı zorunludur")
    @Size(min = 3, max = 500, message = "Konu 3 ile 500 karakter arasında olmalıdır")
    private String subject;
}

package eticaret.demo.order;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Sipariş güncelleme isteği DTO'su
 * Bean Validation ile
 */
@Data
public class OrderUpdateRequest {
    
    /**
     * Müşteri bilgileri (Admin için)
     */
    @Size(min = 2, max = 100, message = "Müşteri adı 2-100 karakter arasında olmalıdır")
    private String customerName;
    
    @Email(message = "Geçerli bir email adresi giriniz")
    @Size(max = 255, message = "Email en fazla 255 karakter olabilir")
    private String customerEmail;
    
    @Size(max = 20, message = "Telefon en fazla 20 karakter olabilir")
    private String customerPhone;
    
    /**
     * Adres güncelleme alanları
     */
    @Size(min = 2, max = 100, message = "Ad soyad 2-100 karakter arasında olmalıdır")
    private String fullName;
    
    @Size(max = 20, message = "Telefon en fazla 20 karakter olabilir")
    private String phone;
    
    @Size(min = 10, max = 500, message = "Adres satırı 10-500 karakter arasında olmalıdır")
    private String addressLine;
    
    @Size(max = 200, message = "Adres detayı en fazla 200 karakter olabilir")
    private String addressDetail;
    
    @Size(min = 2, max = 50, message = "Şehir 2-50 karakter arasında olmalıdır")
    private String city;
    
    @Size(min = 2, max = 50, message = "İlçe 2-50 karakter arasında olmalıdır")
    private String district;
}
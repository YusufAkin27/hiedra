package eticaret.demo.address;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.auth.AppUser;
import eticaret.demo.order.Order;

import java.time.LocalDateTime;

@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "addresses")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    @NotBlank(message = "Ad soyad zorunludur")
    @Size(min = 2, max = 100, message = "Ad soyad 2-100 karakter arasında olmalıdır")
    private String fullName;  // örnek: Yusuf Akın

    @Column(name = "phone", nullable = false)
    @NotBlank(message = "Telefon zorunludur")
    @Size(min = 10, max = 20, message = "Telefon 10-20 karakter arasında olmalıdır")
    private String phone;

    @Column(name = "address_line", nullable = false, length = 255)
    @NotBlank(message = "Adres satırı zorunludur")
    @Size(min = 5, max = 255, message = "Adres satırı 5-255 karakter arasında olmalıdır")
    private String addressLine; // Ana adres (örnek: Atatürk Cd. No:25)

    @Column(name = "address_detail", length = 255)
    @Size(max = 255, message = "Adres detayı en fazla 255 karakter olabilir")
    private String addressDetail; // Daire, kat vs. (opsiyonel)

    @Column(name = "city", nullable = false)
    @NotBlank(message = "Şehir zorunludur")
    @Size(min = 2, max = 50, message = "Şehir 2-50 karakter arasında olmalıdır")
    private String city;

    @Column(name = "district", nullable = false)
    @NotBlank(message = "İlçe zorunludur")
    @Size(min = 2, max = 50, message = "İlçe 2-50 karakter arasında olmalıdır")
    private String district;

    @Column(name = "neighbourhood", length = 100)
    @Size(max = 100, message = "Mahalle en fazla 100 karakter olabilir")
    private String neighbourhood; // Mahalle (opsiyonel)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnore // User bilgisi frontend'e gönderilmez
    private AppUser user; // Kullanıcı adresi (opsiyonel - sipariş adresleri için null olabilir)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = true)
    @JsonIgnore // Order bilgisi frontend'e gönderilmez
    private Order order; // Sipariş adresi (opsiyonel - kullanıcı adresleri için null olabilir)

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    @NotNull(message = "Varsayılan adres durumu belirtilmelidir")
    private Boolean isDefault = false; // Varsayılan adres mi?

    @Column(name = "created_at", nullable = false)
    @NotNull(message = "Oluşturulma tarihi zorunludur")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

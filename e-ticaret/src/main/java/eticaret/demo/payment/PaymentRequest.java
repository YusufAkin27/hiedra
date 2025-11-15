package eticaret.demo.payment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PaymentRequest {


    // Amount sepet kullanılıyorsa backend'de hesaplanacak, aksi halde zorunlu
    private BigDecimal amount;

    @NotBlank(message = "Kart numarası zorunludur.")
    @Pattern(
            regexp = "^[0-9]{16}$",
            message = "Kart numarası 16 haneli olmalıdır ve sadece rakam içermelidir."
    )
    private String cardNumber;

    @NotBlank(message = "Son kullanma tarihi zorunludur.")
    @Pattern(
            regexp = "^(0[1-9]|1[0-2])/([0-9]{2})$",
            message = "Son kullanma tarihi MM/YY formatında olmalıdır (örnek: 09/26)."
    )
    private String cardExpiry;

    @NotBlank(message = "CVC kodu zorunludur.")
    @Pattern(
            regexp = "^[0-9]{3,4}$",
            message = "CVC kodu 3 veya 4 haneli olmalıdır."
    )
    private String cardCvc;


    // -------------------------
    // 2️⃣ Müşteri Bilgileri
    // -------------------------
    @NotBlank(message = "Ad alanı boş olamaz.")
    private String firstName;

    @NotBlank(message = "Soyad alanı boş olamaz.")
    private String lastName;

    @NotBlank(message = "E-posta adresi boş olamaz.")
    @Email(message = "Geçerli bir e-posta adresi giriniz.")
    private String email;

    @NotBlank(message = "Telefon numarası boş olamaz.")
    @Pattern(
            regexp = "^[0-9]{10,11}$",
            message = "Telefon numarası 10 veya 11 haneli olmalıdır."
    )
    private String phone;

    @NotBlank(message = "Adres alanı boş olamaz.")
    private String address;

    @NotBlank(message = "Şehir alanı boş olamaz.")
    private String city;

    @NotBlank(message = "İlçe alanı boş olamaz.")
    private String district;

    private String addressDetail; // opsiyonel (örnek: daire no, kat, apartman)

    // -------------------------
    // 2️⃣1️⃣ Kullanıcı Adres Seçimi (Login kullanıcılar için)
    // -------------------------
    private Long addressId; // Login olmuş kullanıcının seçtiği adres ID'si (opsiyonel)
    private Long userId; // Login olmuş kullanıcının ID'si (opsiyonel)

    // -------------------------
    // 2️⃣2️⃣ Sepet Bilgileri
    // -------------------------
    private Long cartId; // Sepet ID'si (opsiyonel - eğer gönderilirse sepet kullanılır)
    private String guestUserId; // Guest kullanıcı ID'si (misafir kullanıcılar için)

    // -------------------------
    // 3️⃣ Sipariş Detayları
    // -------------------------
    @NotNull(message = "Sipariş detayları zorunludur.")
    @NotEmpty(message = "En az bir ürün seçilmelidir.")
    @Valid
    private List<OrderDetail> orderDetails; // ✅ Zorunlu - Frontend'den gönderilecek, backend'de tekrar hesaplanacak
}

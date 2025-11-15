package eticaret.demo.cart;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.auth.AppUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "carts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnore // User bilgisi frontend'e gönderilmez (lazy loading proxy hatasını önlemek için)
    private AppUser user; // Giriş yapmış kullanıcı (opsiyonel)

    @Column(length = 100)
    private String guestUserId; // Giriş yapmamış kullanıcı için session ID

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CartStatus status = CartStatus.AKTIF; // ACTIVE, CONFIRMED, ABANDONED

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<CartItem> items = new ArrayList<>();

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO; // Kupon indirimi

    @Column(length = 50)
    private String couponCode; // Uygulanan kupon kodu

    @Column
    private Long couponUsageId; // Kupon kullanım ID'si

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        calculateTotal();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        calculateTotal();
    }

    /**
     * Sepet toplamını hesapla
     */
    public void calculateTotal() {
        BigDecimal subtotal = items.stream()
                .map(CartItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // İndirim sonrası toplam
        this.totalAmount = subtotal.subtract(discountAmount);
        if (this.totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            this.totalAmount = BigDecimal.ZERO;
        }
    }

    /**
     * Kupon indirimi uygula
     */
    public void applyCouponDiscount(BigDecimal discount, String couponCode, Long couponUsageId) {
        this.discountAmount = discount;
        this.couponCode = couponCode;
        this.couponUsageId = couponUsageId;
        calculateTotal();
    }

    /**
     * Kupon indirimini kaldır
     */
    public void removeCouponDiscount() {
        this.discountAmount = BigDecimal.ZERO;
        this.couponCode = null;
        this.couponUsageId = null;
        calculateTotal();
    }
    
    /**
     * Sepette kupon uygulanmış mı?
     */
    public boolean hasCoupon() {
        return couponCode != null && couponUsageId != null;
    }
    
    /**
     * Sepet boş mu?
     */
    public boolean isEmpty() {
        return items == null || items.isEmpty();
    }

    /**
     * Sepete ürün ekle veya miktarı güncelle
     */
    public void addItem(CartItem item) {
        // Aynı ürün ve özellikler varsa miktarı artır
        CartItem existingItem = items.stream()
                .filter(i -> i.getProduct().getId().equals(item.getProduct().getId()) &&
                           i.getWidth().equals(item.getWidth()) &&
                           i.getHeight().equals(item.getHeight()) &&
                           i.getPleatType().equals(item.getPleatType()))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + item.getQuantity());
            existingItem.calculateSubtotal();
        } else {
            item.setCart(this);
            items.add(item);
        }
        calculateTotal();
    }

    /**
     * Sepetten ürün çıkar
     */
    public void removeItem(Long itemId) {
        items.removeIf(item -> item.getId().equals(itemId));
        calculateTotal();
    }

    /**
     * Sepeti temizle
     */
    public void clear() {
        items.clear();
        totalAmount = BigDecimal.ZERO;
        discountAmount = BigDecimal.ZERO;
        couponCode = null;
        couponUsageId = null;
        calculateTotal();
    }

    /**
     * Sepet onaylandı mı?
     */
    public boolean isConfirmed() {
        return status == CartStatus.ONAYLANMIS;
    }

    /**
     * Sepet öğe sayısı
     */
    public int getItemCount() {
        return items.size();
    }
}


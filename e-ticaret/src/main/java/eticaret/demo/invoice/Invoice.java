package eticaret.demo.invoice;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import eticaret.demo.order.Order;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fatura entity'si
 * Her sipariş için otomatik oluşturulan fatura
 */
@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "invoices", indexes = {
    @Index(name = "idx_invoice_number", columnList = "invoice_number"),
    @Index(name = "idx_invoice_order_id", columnList = "order_id"),
    @Index(name = "idx_invoice_created_at", columnList = "created_at")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Fatura numarası (benzersiz)
     * Format: HHC-YYYY-XXXXXX
     */
    @Column(name = "invoice_number", unique = true, nullable = false, length = 20)
    private String invoiceNumber;

    /**
     * Sipariş (OneToOne ilişki)
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    @JsonIgnore
    private Order order;

    /**
     * Sipariş numarası (referans için)
     */
    @Column(name = "order_number", nullable = false, length = 20)
    private String orderNumber;

    // ============ FİRMA BİLGİLERİ ============
    
    /**
     * Firma adı
     */
    @Column(name = "company_name", nullable = false, length = 200)
    @Builder.Default
    private String companyName = "HIEDRA HOME COLLECTION";

    /**
     * Firma adresi
     */
    @Column(name = "company_address", nullable = false, length = 500)
    @Builder.Default
    private String companyAddress = "Şerifali Mahallesi, Şehit Sokak No:51, Dudullu OSB, Ümraniye / İstanbul, 34775 Türkiye";

    /**
     * Firma telefon
     */
    @Column(name = "company_phone", nullable = false, length = 20)
    @Builder.Default
    private String companyPhone = "+90 216 540 40 86";

    /**
     * Firma e-posta
     */
    @Column(name = "company_email", nullable = false, length = 100)
    @Builder.Default
    private String companyEmail = "info@hiedra.com.tr";

    // ============ MÜŞTERİ BİLGİLERİ ============

    /**
     * Müşteri adı
     */
    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    /**
     * Müşteri e-posta
     */
    @Column(name = "customer_email", nullable = false, length = 255)
    private String customerEmail;

    /**
     * Müşteri telefon
     */
    @Column(name = "customer_phone", nullable = false, length = 20)
    private String customerPhone;

    /**
     * Müşteri TC Kimlik No (varsayılan: 11111111111)
     */
    @Column(name = "customer_tc", nullable = false, length = 11)
    @Builder.Default
    private String customerTc = "11111111111";

    /**
     * Fatura adresi
     */
    @Column(name = "billing_address", nullable = false, length = 500)
    private String billingAddress;

    // ============ TUTAR BİLGİLERİ ============

    /**
     * Alt toplam (KDV hariç)
     */
    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    /**
     * KDV oranı (%)
     */
    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal taxRate = new BigDecimal("10.00");

    /**
     * KDV tutarı
     */
    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount;

    /**
     * İndirim tutarı
     */
    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    /**
     * Kargo ücreti
     */
    @Column(name = "shipping_cost", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal shippingCost = BigDecimal.ZERO;

    /**
     * Genel toplam (KDV dahil)
     */
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    /**
     * Kupon kodu (varsa)
     */
    @Column(name = "coupon_code", length = 50)
    private String couponCode;

    // ============ TARİH BİLGİLERİ ============

    /**
     * Fatura tarihi
     */
    @Column(name = "invoice_date", nullable = false)
    private LocalDateTime invoiceDate;

    /**
     * Oluşturulma tarihi
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * PDF dosya yolu (opsiyonel - disk'te tutuluyorsa)
     */
    @Column(name = "pdf_path", length = 500)
    private String pdfPath;

    /**
     * PDF oluşturuldu mu?
     */
    @Column(name = "pdf_generated", nullable = false)
    @Builder.Default
    private Boolean pdfGenerated = false;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.invoiceDate == null) {
            this.invoiceDate = now;
        }
        if (this.taxRate == null) {
            this.taxRate = new BigDecimal("10.00");
        }
        if (this.discountAmount == null) {
            this.discountAmount = BigDecimal.ZERO;
        }
        if (this.shippingCost == null) {
            this.shippingCost = BigDecimal.ZERO;
        }
        if (this.customerTc == null) {
            this.customerTc = "11111111111";
        }
        if (this.pdfGenerated == null) {
            this.pdfGenerated = false;
        }
    }

    /**
     * KDV tutarını hesapla
     */
    public BigDecimal calculateTaxAmount() {
        if (subtotal == null || taxRate == null) {
            return BigDecimal.ZERO;
        }
        return subtotal.multiply(taxRate).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Toplam tutarı hesapla
     */
    public BigDecimal calculateTotalAmount() {
        BigDecimal sub = subtotal != null ? subtotal : BigDecimal.ZERO;
        BigDecimal tax = taxAmount != null ? taxAmount : BigDecimal.ZERO;
        BigDecimal discount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
        BigDecimal shipping = shippingCost != null ? shippingCost : BigDecimal.ZERO;
        
        return sub.add(tax).subtract(discount).add(shipping);
    }
}


package eticaret.demo.invoice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Fatura DTO
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class InvoiceDTO {
    
    private Long id;
    private String invoiceNumber;
    private String orderNumber;
    
    // Firma bilgileri
    private String companyName;
    private String companyAddress;
    private String companyPhone;
    private String companyEmail;
    
    // Müşteri bilgileri
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerTc;
    private String billingAddress;
    
    // Tutar bilgileri
    private BigDecimal subtotal;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal shippingCost;
    private BigDecimal totalAmount;
    private String couponCode;
    
    // Tarih bilgileri
    private LocalDateTime invoiceDate;
    private LocalDateTime createdAt;
    
    // PDF durumu
    private Boolean pdfGenerated;
    
    // Fatura kalemleri (sipariş ürünleri)
    private List<InvoiceItemDTO> items;

    /**
     * Fatura kalemi DTO
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class InvoiceItemDTO {
        private String productName;
        private Double width;
        private Double height;
        private String pleatType;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }
}


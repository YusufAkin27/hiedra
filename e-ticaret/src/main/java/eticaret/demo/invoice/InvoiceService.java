package eticaret.demo.invoice;

import eticaret.demo.common.response.ResponseMessage;
import eticaret.demo.order.Order;

/**
 * Fatura servisi interface
 */
public interface InvoiceService {

    /**
     * Sipariş için fatura oluştur
     */
    Invoice createInvoiceForOrder(Order order);

    /**
     * Fatura numarasına göre fatura getir
     */
    ResponseMessage getInvoiceByNumber(String invoiceNumber);

    /**
     * Sipariş numarasına göre fatura getir
     */
    ResponseMessage getInvoiceByOrderNumber(String orderNumber);

    /**
     * Fatura PDF'i oluştur ve byte array olarak döndür
     */
    byte[] generateInvoicePdf(String invoiceNumber);

    /**
     * Fatura PDF'i oluştur ve byte array olarak döndür (Order numarası ile)
     */
    byte[] generateInvoicePdfByOrderNumber(String orderNumber);

    /**
     * Tüm faturaları getir (Admin)
     */
    ResponseMessage getAllInvoices();

    /**
     * Müşteri e-postasına göre faturaları getir
     */
    ResponseMessage getInvoicesByCustomerEmail(String email);

    /**
     * Fatura DTO'ya dönüştür
     */
    InvoiceDTO convertToDTO(Invoice invoice);

    /**
     * Yeni fatura numarası oluştur
     */
    String generateInvoiceNumber();

    /**
     * Faturayı müşteriye e-posta ile gönder
     */
    ResponseMessage sendInvoiceByEmail(String orderNumber);
}


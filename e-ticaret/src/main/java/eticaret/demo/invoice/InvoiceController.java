package eticaret.demo.invoice;

import eticaret.demo.common.response.ResponseMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Fatura API Controller
 * Müşteriler için fatura erişim endpoint'leri
 */
@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class InvoiceController {

    private final InvoiceService invoiceService;

    /**
     * Fatura numarasına göre fatura bilgilerini getir
     */
    @GetMapping("/{invoiceNumber}")
    public ResponseEntity<ResponseMessage> getInvoice(@PathVariable String invoiceNumber) {
        log.info("Fatura getiriliyor: {}", invoiceNumber);
        ResponseMessage response = invoiceService.getInvoiceByNumber(invoiceNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * Sipariş numarasına göre fatura bilgilerini getir
     */
    @GetMapping("/order/{orderNumber}")
    public ResponseEntity<ResponseMessage> getInvoiceByOrder(@PathVariable String orderNumber) {
        log.info("Sipariş numarasına göre fatura getiriliyor: {}", orderNumber);
        ResponseMessage response = invoiceService.getInvoiceByOrderNumber(orderNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * Fatura PDF indir (fatura numarası ile)
     */
    @GetMapping("/{invoiceNumber}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable String invoiceNumber) {
        log.info("Fatura PDF indiriliyor: {}", invoiceNumber);
        
        try {
            byte[] pdfBytes = invoiceService.generateInvoicePdf(invoiceNumber);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "fatura-" + invoiceNumber + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Fatura PDF indirme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Fatura PDF indir (sipariş numarası ile)
     */
    @GetMapping("/order/{orderNumber}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdfByOrder(@PathVariable String orderNumber) {
        log.info("Sipariş numarasına göre fatura PDF indiriliyor: {}", orderNumber);
        
        try {
            byte[] pdfBytes = invoiceService.generateInvoicePdfByOrderNumber(orderNumber);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "fatura-" + orderNumber + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Fatura PDF indirme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Müşterinin tüm faturalarını getir (e-posta ile)
     */
    @GetMapping("/customer/{email}")
    public ResponseEntity<ResponseMessage> getCustomerInvoices(@PathVariable String email) {
        log.info("Müşteri faturaları getiriliyor: {}", email);
        ResponseMessage response = invoiceService.getInvoicesByCustomerEmail(email);
        return ResponseEntity.ok(response);
    }
}


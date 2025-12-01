package eticaret.demo.admin;

import eticaret.demo.common.response.ResponseMessage;
import eticaret.demo.invoice.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Admin Fatura Controller
 * Admin paneli için fatura yönetim endpoint'leri
 */
@RestController
@RequestMapping("/api/admin/invoices")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class AdminInvoiceController {

    private final InvoiceService invoiceService;

    /**
     * Tüm faturaları getir
     */
    @GetMapping
    public ResponseEntity<ResponseMessage> getAllInvoices() {
        log.info("Admin: Tüm faturalar getiriliyor");
        ResponseMessage response = invoiceService.getAllInvoices();
        return ResponseEntity.ok(response);
    }

    /**
     * Fatura numarasına göre fatura getir
     */
    @GetMapping("/{invoiceNumber}")
    public ResponseEntity<ResponseMessage> getInvoice(@PathVariable String invoiceNumber) {
        log.info("Admin: Fatura getiriliyor: {}", invoiceNumber);
        ResponseMessage response = invoiceService.getInvoiceByNumber(invoiceNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * Sipariş numarasına göre fatura getir
     */
    @GetMapping("/order/{orderNumber}")
    public ResponseEntity<ResponseMessage> getInvoiceByOrder(@PathVariable String orderNumber) {
        log.info("Admin: Sipariş numarasına göre fatura getiriliyor: {}", orderNumber);
        ResponseMessage response = invoiceService.getInvoiceByOrderNumber(orderNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * Fatura PDF indir (admin için)
     */
    @GetMapping("/{invoiceNumber}/download")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable String invoiceNumber) {
        log.info("Admin: Fatura indiriliyor: {}", invoiceNumber);
        
        try {
            byte[] pdfBytes = invoiceService.generateInvoicePdf(invoiceNumber);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "fatura-" + invoiceNumber + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Admin: Fatura indirme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Sipariş numarasına göre fatura PDF indir
     */
    @GetMapping("/order/{orderNumber}/download")
    public ResponseEntity<byte[]> downloadInvoiceByOrder(@PathVariable String orderNumber) {
        log.info("Admin: Sipariş numarasına göre fatura indiriliyor: {}", orderNumber);
        
        try {
            byte[] pdfBytes = invoiceService.generateInvoicePdfByOrderNumber(orderNumber);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "fatura-" + orderNumber + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Admin: Fatura indirme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Fatura PDF görüntüle (inline)
     */
    @GetMapping("/{invoiceNumber}/view")
    public ResponseEntity<byte[]> viewInvoice(@PathVariable String invoiceNumber) {
        log.info("Admin: Fatura görüntüleniyor: {}", invoiceNumber);
        
        try {
            byte[] pdfBytes = invoiceService.generateInvoicePdf(invoiceNumber);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=fatura-" + invoiceNumber + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Admin: Fatura görüntüleme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Sipariş numarasına göre fatura PDF görüntüle (inline)
     */
    @GetMapping("/order/{orderNumber}/view")
    public ResponseEntity<byte[]> viewInvoiceByOrder(@PathVariable String orderNumber) {
        log.info("Admin: Sipariş numarasına göre fatura görüntüleniyor: {}", orderNumber);
        
        try {
            byte[] pdfBytes = invoiceService.generateInvoicePdfByOrderNumber(orderNumber);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=fatura-" + orderNumber + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Admin: Fatura görüntüleme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Müşteri e-postasına göre faturaları getir
     */
    @GetMapping("/customer/{email}")
    public ResponseEntity<ResponseMessage> getCustomerInvoices(@PathVariable String email) {
        log.info("Admin: Müşteri faturaları getiriliyor: {}", email);
        ResponseMessage response = invoiceService.getInvoicesByCustomerEmail(email);
        return ResponseEntity.ok(response);
    }
}


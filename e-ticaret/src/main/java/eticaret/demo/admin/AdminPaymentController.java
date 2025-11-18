package eticaret.demo.admin;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.payment.PaymentRecord;
import eticaret.demo.payment.PaymentRecordRepository;
import eticaret.demo.payment.PaymentStatus;
import eticaret.demo.common.response.DataResponseMessage;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminPaymentController {

    private final PaymentRecordRepository paymentRecordRepository;
    private final AuditLogService auditLogService;

    /**
     * Tüm ödemeleri listele (pagination ile)
     * GET /api/admin/payments?status=SUCCESS&page=0&size=20
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getAllPayments(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<PaymentRecord> paymentPage;
            
            if (status != null) {
                paymentPage = paymentRecordRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
            } else {
                paymentPage = paymentRecordRepository.findAllByOrderByCreatedAtDesc(pageable);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", paymentPage.getContent());
            response.put("totalElements", paymentPage.getTotalElements());
            response.put("totalPages", paymentPage.getTotalPages());
            response.put("currentPage", paymentPage.getNumber());
            response.put("pageSize", paymentPage.getSize());
            response.put("hasNext", paymentPage.hasNext());
            response.put("hasPrevious", paymentPage.hasPrevious());
            
            auditLogService.logSimple("GET_ALL_PAYMENTS", "Payment", null,
                    "Ödemeler listelendi (Sayfa: " + page + ", Boyut: " + size + 
                    ", Toplam: " + paymentPage.getTotalElements() + 
                    (status != null ? ", Durum: " + status : "") + ")", request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Ödemeler başarıyla getirildi", response));
        } catch (Exception e) {
            log.error("Ödemeler getirilirken hata: ", e);
            auditLogService.logError("GET_ALL_PAYMENTS", "Payment", null,
                    "Ödemeler getirilirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Ödemeler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Ödeme detayı getir
     * GET /api/admin/payments/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<PaymentRecord>> getPaymentById(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            Optional<PaymentRecord> paymentOpt = paymentRecordRepository.findById(id);
            if (paymentOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            PaymentRecord payment = paymentOpt.get();
            auditLogService.logSimple("GET_PAYMENT", "Payment", id,
                    "Ödeme detayı görüntülendi: " + payment.getOrderNumber(), request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Ödeme başarıyla getirildi", payment));
        } catch (Exception e) {
            log.error("Ödeme getirilirken hata: ", e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Ödeme getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Ödeme istatistikleri
     * GET /api/admin/payments/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<DataResponseMessage<PaymentStats>> getPaymentStats(
            HttpServletRequest request) {
        try {
            // Tüm ödemeleri say
            long totalPayments = paymentRecordRepository.count();
            
            // Duruma göre sayılar
            long successCount = paymentRecordRepository.countByStatus(PaymentStatus.SUCCESS);
            long failedCount = paymentRecordRepository.countByStatus(PaymentStatus.FAILED);
            long pendingCount = paymentRecordRepository.countByStatus(PaymentStatus.PENDING);
            long cancelledCount = paymentRecordRepository.countByStatus(PaymentStatus.CANCELLED);
            long refundedCount = paymentRecordRepository.countByStatus(PaymentStatus.REFUNDED);
            long partiallyRefundedCount = paymentRecordRepository.countByStatus(PaymentStatus.PARTIALLY_REFUNDED);
            
            // Başarılı ödemelerin toplam tutarı
            BigDecimal totalSuccessAmount = paymentRecordRepository
                    .findByStatusOrderByCreatedAtDesc(PaymentStatus.SUCCESS)
                    .stream()
                    .map(PaymentRecord::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Başarısız ödemelerin toplam tutarı
            BigDecimal totalFailedAmount = paymentRecordRepository
                    .findByStatusOrderByCreatedAtDesc(PaymentStatus.FAILED)
                    .stream()
                    .map(PaymentRecord::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Beklemede olan ödemelerin toplam tutarı
            BigDecimal totalPendingAmount = paymentRecordRepository
                    .findByStatusOrderByCreatedAtDesc(PaymentStatus.PENDING)
                    .stream()
                    .map(PaymentRecord::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            PaymentStats stats = PaymentStats.builder()
                    .totalPayments(totalPayments)
                    .successCount(successCount)
                    .failedCount(failedCount)
                    .pendingCount(pendingCount)
                    .cancelledCount(cancelledCount)
                    .refundedCount(refundedCount)
                    .partiallyRefundedCount(partiallyRefundedCount)
                    .totalSuccessAmount(totalSuccessAmount)
                    .totalFailedAmount(totalFailedAmount)
                    .totalPendingAmount(totalPendingAmount)
                    .build();
            
            auditLogService.logSimple("GET_PAYMENT_STATS", "Payment", null,
                    "Ödeme istatistikleri görüntülendi", request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Ödeme istatistikleri başarıyla getirildi", stats));
        } catch (Exception e) {
            log.error("Ödeme istatistikleri getirilirken hata: ", e);
            auditLogService.logError("GET_PAYMENT_STATS", "Payment", null,
                    "Ödeme istatistikleri getirilirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Ödeme istatistikleri getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Duruma göre ödemeleri getir (kısa endpoint)
     * GET /api/admin/payments/status/SUCCESS
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getPaymentsByStatus(
            @PathVariable PaymentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<PaymentRecord> paymentPage = paymentRecordRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", paymentPage.getContent());
            response.put("totalElements", paymentPage.getTotalElements());
            response.put("totalPages", paymentPage.getTotalPages());
            response.put("currentPage", paymentPage.getNumber());
            response.put("pageSize", paymentPage.getSize());
            response.put("hasNext", paymentPage.hasNext());
            response.put("hasPrevious", paymentPage.hasPrevious());
            response.put("status", status);
            
            auditLogService.logSimple("GET_PAYMENTS_BY_STATUS", "Payment", null,
                    "Ödemeler duruma göre listelendi: " + status + " (Sayfa: " + page + 
                    ", Toplam: " + paymentPage.getTotalElements() + ")", request);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    status.getDisplayName() + " ödemeler başarıyla getirildi", response));
        } catch (Exception e) {
            log.error("Ödemeler duruma göre getirilirken hata: ", e);
            auditLogService.logError("GET_PAYMENTS_BY_STATUS", "Payment", null,
                    "Ödemeler duruma göre getirilirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Ödemeler getirilemedi: " + e.getMessage()));
        }
    }

    @Data
    @lombok.Builder
    public static class PaymentStats {
        private long totalPayments;
        private long successCount;
        private long failedCount;
        private long pendingCount;
        private long cancelledCount;
        private long refundedCount;
        private long partiallyRefundedCount;
        private BigDecimal totalSuccessAmount;
        private BigDecimal totalFailedAmount;
        private BigDecimal totalPendingAmount;
    }
}


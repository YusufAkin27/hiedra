package eticaret.demo.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * İade kayıtları repository
 */
public interface RefundRecordRepository extends JpaRepository<RefundRecord, Long> {
    
    /**
     * Refund Transaction ID ile bul
     */
    Optional<RefundRecord> findByRefundTransactionId(String refundTransactionId);
    
    /**
     * Payment Record ID ile bul
     */
    @Query("SELECT rr FROM RefundRecord rr WHERE rr.paymentRecord.id = :paymentRecordId ORDER BY rr.createdAt DESC")
    List<RefundRecord> findByPaymentRecordId(@Param("paymentRecordId") Long paymentRecordId);
    
    /**
     * Order Number ile bul
     */
    @Query("SELECT rr FROM RefundRecord rr WHERE rr.orderNumber = :orderNumber ORDER BY rr.createdAt DESC")
    List<RefundRecord> findByOrderNumber(@Param("orderNumber") String orderNumber);
    
    /**
     * Payment Transaction ID ile bul
     */
    @Query("SELECT rr FROM RefundRecord rr WHERE rr.paymentTransactionId = :paymentTransactionId ORDER BY rr.createdAt DESC")
    List<RefundRecord> findByPaymentTransactionId(@Param("paymentTransactionId") String paymentTransactionId);
    
    /**
     * Duruma göre iadeleri getir
     */
    List<RefundRecord> findByStatusOrderByCreatedAtDesc(RefundStatus status);
    
    /**
     * Tarih aralığına göre iadeleri getir
     */
    @Query("SELECT rr FROM RefundRecord rr WHERE rr.createdAt BETWEEN :start AND :end ORDER BY rr.createdAt DESC")
    List<RefundRecord> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    /**
     * Belirli bir ödeme için toplam iade tutarı
     */
    @Query("SELECT COALESCE(SUM(rr.refundAmount), 0) FROM RefundRecord rr WHERE rr.paymentRecord.id = :paymentRecordId AND rr.status = 'SUCCESS'")
    BigDecimal getTotalRefundAmountByPaymentRecordId(@Param("paymentRecordId") Long paymentRecordId);
    
    /**
     * Başarılı iadeleri say
     */
    long countByStatus(RefundStatus status);
}


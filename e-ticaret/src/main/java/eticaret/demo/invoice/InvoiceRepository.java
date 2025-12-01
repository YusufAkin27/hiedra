package eticaret.demo.invoice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    /**
     * Fatura numarasına göre bul
     */
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    /**
     * Sipariş numarasına göre bul
     */
    Optional<Invoice> findByOrderNumber(String orderNumber);

    /**
     * Sipariş ID'sine göre bul
     */
    Optional<Invoice> findByOrderId(Long orderId);

    /**
     * Müşteri e-postasına göre tüm faturaları getir
     */
    List<Invoice> findByCustomerEmailOrderByCreatedAtDesc(String customerEmail);

    /**
     * Belirli tarih aralığındaki faturaları getir
     */
    @Query("SELECT i FROM Invoice i WHERE i.createdAt BETWEEN :startDate AND :endDate ORDER BY i.createdAt DESC")
    List<Invoice> findByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Son fatura numarasını getir (yıla göre)
     */
    @Query("SELECT i.invoiceNumber FROM Invoice i WHERE i.invoiceNumber LIKE :prefix ORDER BY i.invoiceNumber DESC LIMIT 1")
    Optional<String> findLastInvoiceNumberByPrefix(@Param("prefix") String prefix);

    /**
     * Belirli yıla ait fatura sayısını getir
     */
    @Query("SELECT COUNT(i) FROM Invoice i WHERE YEAR(i.createdAt) = :year")
    long countByYear(@Param("year") int year);

    /**
     * PDF oluşturulmamış faturaları getir
     */
    List<Invoice> findByPdfGeneratedFalse();

    /**
     * Tüm faturaları tarihe göre sıralı getir
     */
    List<Invoice> findAllByOrderByCreatedAtDesc();
}


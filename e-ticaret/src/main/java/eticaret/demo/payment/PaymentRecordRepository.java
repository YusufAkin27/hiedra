package eticaret.demo.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Ödeme kayıtları repository
 */
public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, Long> {
    
    /**
     * İyzico Payment ID ile bul
     */
    Optional<PaymentRecord> findByIyzicoPaymentId(String iyzicoPaymentId);
    
    /**
     * Conversation ID ile bul
     */
    Optional<PaymentRecord> findByConversationId(String conversationId);
    
    /**
     * Order Number ile bul
     */
    Optional<PaymentRecord> findByOrderNumber(String orderNumber);
    
    /**
     * Payment Transaction ID ile bul
     */
    Optional<PaymentRecord> findByPaymentTransactionId(String paymentTransactionId);
    
    /**
     * Kullanıcı ID ile tüm ödemeleri getir
     */
    @Query("SELECT pr FROM PaymentRecord pr WHERE pr.user.id = :userId ORDER BY pr.createdAt DESC")
    List<PaymentRecord> findByUserId(@Param("userId") Long userId);
    
    /**
     * Guest User ID ile tüm ödemeleri getir
     */
    @Query("SELECT pr FROM PaymentRecord pr WHERE pr.guestUserId = :guestUserId ORDER BY pr.createdAt DESC")
    List<PaymentRecord> findByGuestUserId(@Param("guestUserId") String guestUserId);
    
    /**
     * Email ile tüm ödemeleri getir
     */
    @Query("SELECT pr FROM PaymentRecord pr WHERE LOWER(TRIM(pr.customerEmail)) = LOWER(TRIM(:email)) ORDER BY pr.createdAt DESC")
    List<PaymentRecord> findByCustomerEmail(@Param("email") String email);
    
    /**
     * Duruma göre ödemeleri getir
     */
    List<PaymentRecord> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    
    /**
     * Tarih aralığına göre ödemeleri getir
     */
    @Query("SELECT pr FROM PaymentRecord pr WHERE pr.createdAt BETWEEN :start AND :end ORDER BY pr.createdAt DESC")
    List<PaymentRecord> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    /**
     * Başarılı ödemeleri say
     */
    long countByStatus(PaymentStatus status);
    
    /**
     * Belirli bir tarihten sonraki başarılı ödemeleri say
     */
    @Query("SELECT COUNT(pr) FROM PaymentRecord pr WHERE pr.status = :status AND pr.createdAt >= :since")
    long countByStatusAndCreatedAtAfter(@Param("status") PaymentStatus status, @Param("since") LocalDateTime since);
}


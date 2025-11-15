package eticaret.demo.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    
    /**
     * Belirli bir ürünle birlikte alınan diğer ürünleri bul
     * "Bu ürünü alanlar şunları da aldı" önerisi için
     */
    @Query("SELECT oi2.productId, COUNT(oi2.productId) as purchaseCount " +
           "FROM OrderItem oi1 " +
           "JOIN OrderItem oi2 ON oi1.order.id = oi2.order.id " +
           "WHERE oi1.productId = :productId " +
           "AND oi2.productId != :productId " +
           "AND oi2.productId IS NOT NULL " +
           "GROUP BY oi2.productId " +
           "ORDER BY purchaseCount DESC")
    List<Object[]> findFrequentlyBoughtTogether(Long productId);
    
    /**
     * Kullanıcının satın aldığı ürünleri getir
     */
    @Query("SELECT DISTINCT oi.productId FROM OrderItem oi " +
           "JOIN oi.order o " +
           "WHERE LOWER(TRIM(o.customerEmail)) = LOWER(TRIM(:customerEmail)) " +
           "AND oi.productId IS NOT NULL")
    List<Long> findPurchasedProductIdsByCustomerEmail(String customerEmail);
}

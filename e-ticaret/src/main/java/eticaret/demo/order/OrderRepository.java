package eticaret.demo.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // Sipariş numarası ile sorgulama
    Optional<Order> findByOrderNumber(String orderNumber);
    
    // Sipariş numarası ve email ile sorgulama (müşteri için)
    Optional<Order> findByOrderNumberAndCustomerEmail(String orderNumber, String customerEmail);
    
    // Email ile tüm siparişleri getirme (sadece orderItems fetch edilir, addresses ayrı yüklenecek)
    // Case-insensitive arama (PostgreSQL'de ILIKE kullanılabilir ama LOWER daha uyumlu)
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.orderItems WHERE LOWER(TRIM(o.customerEmail)) = LOWER(TRIM(:customerEmail)) ORDER BY o.createdAt DESC")
    List<Order> findByCustomerEmailOrderByCreatedAtDesc(@Param("customerEmail") String customerEmail);
    
    // Duruma göre siparişleri getirme
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.user WHERE o.status = :status ORDER BY o.createdAt DESC")
    List<Order> findByStatusOrderByCreatedAtDesc(@Param("status") OrderStatus status);
    
    // Duruma göre siparişleri sayfalı getirme
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.user WHERE o.status = :status ORDER BY o.createdAt DESC")
    Page<Order> findByStatusOrderByCreatedAtDesc(@Param("status") OrderStatus status, Pageable pageable);
    
    // Tüm siparişleri tarih sırasına göre getirme
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.user ORDER BY o.createdAt DESC")
    List<Order> findAllByOrderByCreatedAtDesc();
    
    // Tüm siparişleri sayfalı getirme
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.user ORDER BY o.createdAt DESC")
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    // İptal edilmiş siparişler
    List<Order> findByCancelledAtIsNotNullOrderByCreatedAtDesc();
    
    // İade talep edilmiş siparişler
    @Query("SELECT o FROM Order o WHERE o.status = 'REFUND_REQUESTED' ORDER BY o.createdAt DESC")
    List<Order> findRefundRequestedOrders();
    
    // Duruma göre sipariş sayısı
    long countByStatus(OrderStatus status);
    
    // Addresses ile birlikte sipariş getir
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.addresses WHERE o.id = :id")
    Optional<Order> findByIdWithAddresses(@Param("id") Long id);
    
    // Tarih aralığına göre siparişleri getir
    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    
    // Guest kullanıcı ID'sine göre siparişleri getir
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.orderItems WHERE o.guestUserId = :guestUserId ORDER BY o.createdAt DESC")
    List<Order> findByGuestUserIdOrderByCreatedAtDesc(@Param("guestUserId") String guestUserId);
    
    // Guest kullanıcı ID'si ve email ile sipariş sorgulama
    @Query("SELECT o FROM Order o WHERE o.guestUserId = :guestUserId AND LOWER(TRIM(o.customerEmail)) = LOWER(TRIM(:customerEmail)) ORDER BY o.createdAt DESC")
    List<Order> findByGuestUserIdAndCustomerEmail(@Param("guestUserId") String guestUserId, 
                                                    @Param("customerEmail") String customerEmail);
    
    // Guest kullanıcı ID'si ve sipariş numarası ile sipariş getir
    @Query("SELECT o FROM Order o WHERE o.guestUserId = :guestUserId AND o.orderNumber = :orderNumber")
    Optional<Order> findByGuestUserIdAndOrderNumber(@Param("guestUserId") String guestUserId, 
                                                     @Param("orderNumber") String orderNumber);
}
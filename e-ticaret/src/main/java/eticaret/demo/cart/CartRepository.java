package eticaret.demo.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {
    
    // Kullanıcıya göre aktif sepet (items zaten EAGER, product'ları manuel initialize edeceğiz)
    @Query("SELECT c FROM Cart c WHERE c.user.id = :userId AND c.status = :status")
    Optional<Cart> findByUser_IdAndStatus(@Param("userId") Long userId, @Param("status") CartStatus status);
    
    // Guest kullanıcıya göre aktif sepet (items zaten EAGER, product'ları manuel initialize edeceğiz)
    @Query("SELECT c FROM Cart c WHERE c.guestUserId = :guestUserId AND c.status = :status")
    Optional<Cart> findByGuestUserIdAndStatus(@Param("guestUserId") String guestUserId, @Param("status") CartStatus status);
    
    // Kullanıcıya göre tüm sepetler
    List<Cart> findByUser_IdOrderByCreatedAtDesc(Long userId);
    
    // Guest kullanıcıya göre tüm sepetler
    List<Cart> findByGuestUserIdOrderByCreatedAtDesc(String guestUserId);
    
    // Status'e göre sepetler
    List<Cart> findByStatusOrderByCreatedAtDesc(CartStatus status);
    
    // Kullanıcı veya guest ID'ye göre aktif sepet
    @Query("SELECT c FROM Cart c WHERE " +
           "(c.user.id = :userId OR c.guestUserId = :guestUserId) AND c.status = :status")
    Optional<Cart> findByUserOrGuestAndStatus(
            @Param("userId") Long userId,
            @Param("guestUserId") String guestUserId,
            @Param("status") CartStatus status
    );
    
    // Onaylanmış sepetler
    List<Cart> findByStatusOrderByUpdatedAtDesc(CartStatus status);
}


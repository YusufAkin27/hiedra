package eticaret.demo.cart;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    
    // Sepete göre öğeler
    List<CartItem> findByCart_IdOrderByCreatedAtAsc(Long cartId);
    
    // Sepet ve ürüne göre öğe
    Optional<CartItem> findByCart_IdAndProduct_Id(Long cartId, Long productId);
    
    // Sepetten öğe sil
    void deleteByCart_Id(Long cartId);
}


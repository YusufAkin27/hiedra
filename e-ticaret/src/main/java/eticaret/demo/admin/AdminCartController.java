package eticaret.demo.admin;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.cart.Cart;
import eticaret.demo.cart.CartRepository;
import eticaret.demo.cart.CartStatus;
import eticaret.demo.response.DataResponseMessage;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/carts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCartController {

    private final AppUserRepository userRepository;
    private final CartRepository cartRepository;

    @GetMapping
    public ResponseEntity<DataResponseMessage<List<CartSummary>>> getAllCarts() {
        // Tüm aktif sepetleri getir
        List<Cart> activeCarts = cartRepository.findByStatusOrderByCreatedAtDesc(CartStatus.AKTIF);
        
        List<CartSummary> cartSummaries = activeCarts.stream()
                .map(cart -> {
                    CartSummary summary = new CartSummary();
                    if (cart.getUser() != null) {
                        summary.setUserId(cart.getUser().getId());
                        summary.setUserEmail(cart.getUser().getEmail());
                    } else {
                        summary.setUserId(null);
                        summary.setUserEmail("Guest: " + (cart.getGuestUserId() != null ? cart.getGuestUserId().substring(0, Math.min(20, cart.getGuestUserId().length())) : "Unknown"));
                    }
                    summary.setCartId(cart.getId());
                    summary.setItemCount(cart.getItems() != null ? cart.getItems().size() : 0);
                    summary.setTotalAmount(cart.getTotalAmount() != null ? cart.getTotalAmount() : java.math.BigDecimal.ZERO);
                    summary.setStatus(cart.getStatus() != null ? cart.getStatus().name() : "ACTIVE");
                    summary.setCreatedAt(cart.getCreatedAt());
                    summary.setUpdatedAt(cart.getUpdatedAt());
                    return summary;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(DataResponseMessage.success("Sepet bilgileri başarıyla getirildi", cartSummaries));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<DataResponseMessage<CartSummary>> getUserCart(@PathVariable Long userId) {
        Optional<AppUser> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AppUser user = userOpt.get();
        Optional<Cart> cartOpt = cartRepository.findByUser_IdAndStatus(userId, CartStatus.AKTIF);
        
        CartSummary cartSummary = new CartSummary();
        cartSummary.setUserId(user.getId());
        cartSummary.setUserEmail(user.getEmail());
        
        if (cartOpt.isPresent()) {
            Cart cart = cartOpt.get();
            cartSummary.setCartId(cart.getId());
            cartSummary.setItemCount(cart.getItems() != null ? cart.getItems().size() : 0);
            cartSummary.setTotalAmount(cart.getTotalAmount() != null ? cart.getTotalAmount() : java.math.BigDecimal.ZERO);
            cartSummary.setStatus(cart.getStatus() != null ? cart.getStatus().name() : "ACTIVE");
            cartSummary.setCreatedAt(cart.getCreatedAt());
            cartSummary.setUpdatedAt(cart.getUpdatedAt());
        } else {
            cartSummary.setCartId(null);
            cartSummary.setItemCount(0);
            cartSummary.setTotalAmount(java.math.BigDecimal.ZERO);
            cartSummary.setStatus("EMPTY");
        }
        
        return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı sepeti başarıyla getirildi", cartSummary));
    }

    /**
     * Belirli bir sepetin detaylarını getir
     * GET /api/admin/carts/{cartId}/details
     */
    @GetMapping("/{cartId}/details")
    public ResponseEntity<DataResponseMessage<Cart>> getCartDetails(@PathVariable Long cartId) {
        Optional<Cart> cartOpt = cartRepository.findById(cartId);
        if (cartOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Cart cart = cartOpt.get();
        // User'ı initialize et (lazy loading proxy hatasını önlemek için)
        if (cart.getUser() != null) {
            cart.getUser().getId();
        }
        // Items içindeki product'ları initialize et (JSON serialization için)
        if (cart.getItems() != null) {
            cart.getItems().forEach(item -> {
                if (item.getProduct() != null) {
                    item.getProduct().getId();
                    if (item.getProduct().getCategory() != null) {
                        item.getProduct().getCategory().getId();
                    }
                }
            });
        }
        
        return ResponseEntity.ok(DataResponseMessage.success("Sepet detayları başarıyla getirildi", cart));
    }

    @Data
    public static class CartSummary {
        private Long cartId;
        private Long userId;
        private String userEmail;
        private Integer itemCount;
        private java.math.BigDecimal totalAmount;
        private String status;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime updatedAt;
    }
}


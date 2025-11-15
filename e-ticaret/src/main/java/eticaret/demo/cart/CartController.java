package eticaret.demo.cart;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AppUser;
import eticaret.demo.exception.CartException;
import eticaret.demo.exception.ProductException;
import eticaret.demo.guest.GuestUserService;
import eticaret.demo.response.DataResponseMessage;
import eticaret.demo.coupon.CouponService;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Slf4j
public class CartController {

    private final CartService cartService;
    private final AuditLogService auditLogService;
    private final CouponService couponService;
    private final GuestUserService guestUserService;

    /**
     * Kullanıcının sepetini getir
     * GET /api/cart
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<Cart>> getCart(
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            Long userId = getCurrentUserId();
            String finalGuestUserId = null;
            String userType = userId != null ? "authenticated" : "guest";
            
            // Giriş yapmamış kullanıcı için çerezden guestUserId al veya oluştur
            if (userId == null) {
                // Önce query param'dan kontrol et
                if (guestUserId != null && !guestUserId.trim().isEmpty()) {
                    if (guestUserService.isValidGuestUserId(guestUserId)) {
                        finalGuestUserId = guestUserId.trim();
                    } else {
                        log.warn("Geçersiz guestUserId formatı: {}", guestUserId);
                        // Geçersiz format, yeni oluştur
                        finalGuestUserId = guestUserService.getOrCreateGuestUserId(request, response);
                    }
                } else {
                    // Çerezden al veya yeni oluştur
                    finalGuestUserId = guestUserService.getOrCreateGuestUserId(request, response);
                }
                
                // Guest kullanıcı için çereze kaydet
                if (finalGuestUserId != null) {
                    guestUserService.setGuestUserIdCookie(response, finalGuestUserId);
                }
            } else {
                // Authenticated kullanıcı için guestUserId kullanılmamalı
                if (guestUserId != null && !guestUserId.trim().isEmpty()) {
                    log.warn("Authenticated kullanıcı için guestUserId parametresi gönderildi, yok sayılıyor. UserId: {}", userId);
                }
            }
            
            Cart cart = cartService.getOrCreateCart(userId, finalGuestUserId);
            
            auditLogService.logSuccess(
                    "GET_CART",
                    "Cart",
                    cart.getId(),
                    "Sepet görüntülendi",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A",
                            "itemCount", cart.getItemCount()
                    ),
                    Map.of(
                            "cartId", cart.getId(),
                            "totalAmount", cart.getTotalAmount(),
                            "itemCount", cart.getItemCount()
                    ),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Sepet başarıyla getirildi", cart));
        } catch (CartException e) {
            log.warn("Sepet getirilirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "GET_CART",
                    "Cart",
                    null,
                    "Sepet getirilirken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Sepet getirilirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "GET_CART",
                    "Cart",
                    null,
                    "Sepet getirilirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new CartException("Sepet getirilemedi: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Sepete ürün ekle
     * POST /api/cart/items
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @PostMapping("/items")
    public ResponseEntity<DataResponseMessage<Cart>> addItem(
            @Valid @RequestBody AddItemRequest requestBody,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            // Validation kontrolü
            if (requestBody.getProductId() == null) {
                throw new CartException("Ürün ID'si zorunludur");
            }
            if (requestBody.getQuantity() == null || requestBody.getQuantity() <= 0) {
                throw new CartException("Miktar 0'dan büyük olmalıdır");
            }
            
            Long userId = getCurrentUserId();
            String finalGuestUserId = null;
            String userType = userId != null ? "authenticated" : "guest";
            
            // Giriş yapmamış kullanıcı için çerezden guestUserId al veya oluştur
            if (userId == null) {
                if (guestUserId != null && !guestUserId.trim().isEmpty()) {
                    if (guestUserService.isValidGuestUserId(guestUserId)) {
                        finalGuestUserId = guestUserId.trim();
                    } else {
                        log.warn("Geçersiz guestUserId formatı: {}", guestUserId);
                        finalGuestUserId = guestUserService.getOrCreateGuestUserId(request, response);
                    }
                } else {
                    finalGuestUserId = guestUserService.getOrCreateGuestUserId(request, response);
                }
                
                // Guest kullanıcı için çereze kaydet
                if (finalGuestUserId != null) {
                    guestUserService.setGuestUserIdCookie(response, finalGuestUserId);
                }
            } else {
                // Authenticated kullanıcı için guestUserId kullanılmamalı
                if (guestUserId != null && !guestUserId.trim().isEmpty()) {
                    log.warn("Authenticated kullanıcı için guestUserId parametresi gönderildi, yok sayılıyor. UserId: {}", userId);
                }
            }
            
            Cart cart = cartService.getOrCreateCart(userId, finalGuestUserId);
            
            Cart updatedCart = cartService.addItemToCart(
                    cart.getId(),
                    requestBody.getProductId(),
                    requestBody.getQuantity(),
                    requestBody.getWidth(),
                    requestBody.getHeight(),
                    requestBody.getPleatType()
            );
            
            auditLogService.logSuccess(
                    "ADD_TO_CART",
                    "Cart",
                    updatedCart.getId(),
                    "Sepete ürün eklendi",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A",
                            "productId", requestBody.getProductId(),
                            "quantity", requestBody.getQuantity()
                    ),
                    Map.of(
                            "cartId", updatedCart.getId(),
                            "totalAmount", updatedCart.getTotalAmount(),
                            "itemCount", updatedCart.getItemCount()
                    ),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Ürün sepete eklendi", updatedCart));
        } catch (CartException | ProductException e) {
            log.warn("Sepete ürün eklenirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "ADD_TO_CART",
                    "Cart",
                    null,
                    "Sepete ürün eklenirken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Sepete ürün eklenirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "ADD_TO_CART",
                    "Cart",
                    null,
                    "Sepete ürün eklenirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new CartException("Ürün sepete eklenemedi: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Sepetten ürün çıkar
     * DELETE /api/cart/items/{itemId}
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<DataResponseMessage<Cart>> removeItem(
            @PathVariable Long itemId,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            if (itemId == null) {
                throw new CartException("Sepet öğesi ID'si zorunludur");
            }
            
            Long userId = getCurrentUserId();
            String finalGuestUserId = resolveGuestUserId(userId, guestUserId, request, response);
            String userType = userId != null ? "authenticated" : "guest";
            
            Optional<Cart> cartOpt = cartService.getCartByUser(userId, finalGuestUserId);
            
            if (cartOpt.isEmpty()) {
                throw CartException.cartNotFound();
            }
            
            Cart cart = cartService.removeItemFromCart(cartOpt.get().getId(), itemId);
            
            auditLogService.logSuccess(
                    "REMOVE_FROM_CART",
                    "Cart",
                    cart.getId(),
                    "Sepetten ürün çıkarıldı",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A",
                            "itemId", itemId
                    ),
                    Map.of(
                            "cartId", cart.getId(),
                            "totalAmount", cart.getTotalAmount(),
                            "itemCount", cart.getItemCount()
                    ),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Ürün sepetten çıkarıldı", cart));
        } catch (CartException e) {
            log.warn("Sepetten ürün çıkarılırken hata: {}", e.getMessage());
            auditLogService.logError(
                    "REMOVE_FROM_CART",
                    "Cart",
                    null,
                    "Sepetten ürün çıkarılırken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Sepetten ürün çıkarılırken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "REMOVE_FROM_CART",
                    "Cart",
                    null,
                    "Sepetten ürün çıkarılırken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new CartException("Ürün sepetten çıkarılamadı: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Sepet öğesi miktarını güncelle
     * PUT /api/cart/items/{itemId}
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @PutMapping("/items/{itemId}")
    public ResponseEntity<DataResponseMessage<Cart>> updateItemQuantity(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateQuantityRequest requestBody,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            if (itemId == null) {
                throw new CartException("Sepet öğesi ID'si zorunludur");
            }
            
            Long userId = getCurrentUserId();
            String finalGuestUserId = resolveGuestUserId(userId, guestUserId, request, response);
            String userType = userId != null ? "authenticated" : "guest";
            
            Optional<Cart> cartOpt = cartService.getCartByUser(userId, finalGuestUserId);
            
            if (cartOpt.isEmpty()) {
                throw CartException.cartNotFound();
            }
            
            Cart cart = cartService.updateItemQuantity(
                    cartOpt.get().getId(),
                    itemId,
                    requestBody.getQuantity()
            );
            
            auditLogService.logSuccess(
                    "UPDATE_CART_ITEM",
                    "Cart",
                    cart.getId(),
                    "Sepet öğesi miktarı güncellendi",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A",
                            "itemId", itemId,
                            "quantity", requestBody.getQuantity()
                    ),
                    Map.of(
                            "cartId", cart.getId(),
                            "totalAmount", cart.getTotalAmount(),
                            "itemCount", cart.getItemCount()
                    ),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Sepet öğesi güncellendi", cart));
        } catch (CartException | ProductException e) {
            log.warn("Sepet öğesi güncellenirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "UPDATE_CART_ITEM",
                    "Cart",
                    null,
                    "Sepet öğesi güncellenirken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Sepet öğesi güncellenirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "UPDATE_CART_ITEM",
                    "Cart",
                    null,
                    "Sepet öğesi güncellenirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new CartException("Sepet öğesi güncellenemedi: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Sepeti temizle
     * DELETE /api/cart
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @DeleteMapping
    public ResponseEntity<DataResponseMessage<Void>> clearCart(
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            Long userId = getCurrentUserId();
            String finalGuestUserId = resolveGuestUserId(userId, guestUserId, request, response);
            String userType = userId != null ? "authenticated" : "guest";
            
            Optional<Cart> cartOpt = cartService.getCartByUser(userId, finalGuestUserId);
            
            if (cartOpt.isEmpty()) {
                throw CartException.cartNotFound();
            }
            
            Long cartId = cartOpt.get().getId();
            cartService.clearCart(cartId);
            
            auditLogService.logSuccess(
                    "CLEAR_CART",
                    "Cart",
                    cartId,
                    "Sepet temizlendi",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A"
                    ),
                    Map.of("cartId", cartId),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Sepet temizlendi", null));
        } catch (CartException e) {
            log.warn("Sepet temizlenirken hata: {}", e.getMessage());
            auditLogService.logError(
                    "CLEAR_CART",
                    "Cart",
                    null,
                    "Sepet temizlenirken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Sepet temizlenirken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "CLEAR_CART",
                    "Cart",
                    null,
                    "Sepet temizlenirken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new CartException("Sepet temizlenemedi: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Sepete kupon uygula
     * POST /api/cart/apply-coupon
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @PostMapping("/apply-coupon")
    public ResponseEntity<DataResponseMessage<Cart>> applyCoupon(
            @Valid @RequestBody ApplyCouponRequest requestBody,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            Long userId = getCurrentUserId();
            String finalGuestUserId = resolveGuestUserId(userId, guestUserId, request, response);
            String userType = userId != null ? "authenticated" : "guest";
            
            Optional<Cart> cartOpt = cartService.getCartByUser(userId, finalGuestUserId);
            
            if (cartOpt.isEmpty()) {
                throw CartException.cartNotFound();
            }
            
            String userEmail = getCurrentUserEmail();
            Cart cart = cartService.applyCoupon(
                    cartOpt.get().getId(),
                    requestBody.getCouponCode().trim(),
                    userId,
                    finalGuestUserId,
                    userEmail
            );
            
            auditLogService.logSuccess(
                    "APPLY_COUPON",
                    "Cart",
                    cart.getId(),
                    "Kupon uygulandı",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A",
                            "couponCode", requestBody.getCouponCode()
                    ),
                    Map.of(
                            "cartId", cart.getId(),
                            "discountAmount", cart.getDiscountAmount(),
                            "totalAmount", cart.getTotalAmount()
                    ),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Kupon başarıyla uygulandı", cart));
        } catch (eticaret.demo.exception.CouponException | CartException e) {
            log.warn("Kupon uygulanırken hata: {}", e.getMessage());
            auditLogService.logError(
                    "APPLY_COUPON",
                    "Cart",
                    null,
                    "Kupon uygulanırken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Kupon uygulanırken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "APPLY_COUPON",
                    "Cart",
                    null,
                    "Kupon uygulanırken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new eticaret.demo.exception.BusinessException("Kupon uygulanamadı: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Sepetten kuponu kaldır
     * DELETE /api/cart/coupon
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @DeleteMapping("/coupon")
    public ResponseEntity<DataResponseMessage<Cart>> removeCoupon(
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            Long userId = getCurrentUserId();
            String finalGuestUserId = resolveGuestUserId(userId, guestUserId, request, response);
            String userType = userId != null ? "authenticated" : "guest";
            
            Optional<Cart> cartOpt = cartService.getCartByUser(userId, finalGuestUserId);
            
            if (cartOpt.isEmpty()) {
                throw CartException.cartNotFound();
            }
            
            Cart cart = cartService.removeCoupon(cartOpt.get().getId());
            
            auditLogService.logSuccess(
                    "REMOVE_COUPON",
                    "Cart",
                    cart.getId(),
                    "Kupon sepetten kaldırıldı",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A"
                    ),
                    Map.of(
                            "cartId", cart.getId(),
                            "totalAmount", cart.getTotalAmount()
                    ),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Kupon kaldırıldı", cart));
        } catch (CartException e) {
            log.warn("Kupon kaldırılırken hata: {}", e.getMessage());
            auditLogService.logError(
                    "REMOVE_COUPON",
                    "Cart",
                    null,
                    "Kupon kaldırılırken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Kupon kaldırılırken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "REMOVE_COUPON",
                    "Cart",
                    null,
                    "Kupon kaldırılırken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new eticaret.demo.exception.BusinessException("Kupon kaldırılamadı: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Sepeti onayla (siparişe dönüştür)
     * POST /api/cart/confirm
     * NOT: Kupon kullanımı ödeme tamamlandıktan sonra işaretlenecek
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @PostMapping("/confirm")
    public ResponseEntity<DataResponseMessage<Cart>> confirmCart(
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            Long userId = getCurrentUserId();
            String finalGuestUserId = resolveGuestUserId(userId, guestUserId, request, response);
            String userType = userId != null ? "authenticated" : "guest";
            
            Optional<Cart> cartOpt = cartService.getCartByUser(userId, finalGuestUserId);
            
            if (cartOpt.isEmpty()) {
                throw CartException.cartNotFound();
            }
            
            Cart cart = cartService.confirmCart(cartOpt.get().getId());
            
            auditLogService.logSuccess(
                    "CONFIRM_CART",
                    "Cart",
                    cart.getId(),
                    "Sepet onaylandı ve siparişe dönüştürüldü",
                    Map.of(
                            "userType", userType,
                            "userId", userId != null ? userId : "N/A",
                            "guestUserId", finalGuestUserId != null ? finalGuestUserId : "N/A"
                    ),
                    Map.of(
                            "cartId", cart.getId(),
                            "totalAmount", cart.getTotalAmount(),
                            "discountAmount", cart.getDiscountAmount(),
                            "itemCount", cart.getItemCount(),
                            "status", cart.getStatus().name()
                    ),
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Sepet onaylandı", cart));
        } catch (CartException | ProductException e) {
            log.warn("Sepet onaylanırken hata: {}", e.getMessage());
            auditLogService.logError(
                    "CONFIRM_CART",
                    "Cart",
                    null,
                    "Sepet onaylanırken hata",
                    e.getMessage(),
                    request
            );
            throw e;
        } catch (Exception e) {
            log.error("Sepet onaylanırken beklenmeyen hata: ", e);
            auditLogService.logError(
                    "CONFIRM_CART",
                    "Cart",
                    null,
                    "Sepet onaylanırken beklenmeyen hata",
                    e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata",
                    request
            );
            throw new CartException("Sepet onaylanamadı: " + (e.getMessage() != null ? e.getMessage() : "Bilinmeyen hata"));
        }
    }

    /**
     * Guest ve authenticated kullanıcı için guestUserId'yi al veya oluştur
     * Helper metod - tüm endpoint'lerde tutarlılık için
     */
    private String resolveGuestUserId(Long userId, String guestUserId, 
                                      HttpServletRequest request, 
                                      jakarta.servlet.http.HttpServletResponse response) {
        if (userId != null) {
            // Authenticated kullanıcı için guestUserId kullanılmamalı
            if (guestUserId != null && !guestUserId.trim().isEmpty()) {
                log.warn("Authenticated kullanıcı için guestUserId parametresi gönderildi, yok sayılıyor. UserId: {}", userId);
            }
            return null;
        }
        
        // Guest kullanıcı için
        if (guestUserId != null && !guestUserId.trim().isEmpty()) {
            if (guestUserService.isValidGuestUserId(guestUserId)) {
                return guestUserId.trim();
            } else {
                log.warn("Geçersiz guestUserId formatı: {}", guestUserId);
                // Geçersiz format, yeni oluştur veya çerezden al
                String newGuestId = guestUserService.getOrCreateGuestUserId(request, response);
                if (response != null) {
                    guestUserService.setGuestUserIdCookie(response, newGuestId);
                }
                return newGuestId;
            }
        } else {
            // Çerezden al veya yeni oluştur
            String newGuestId = guestUserService.getOrCreateGuestUserId(request, response);
            if (response != null) {
                guestUserService.setGuestUserIdCookie(response, newGuestId);
            }
            return newGuestId;
        }
    }

    /**
     * Mevcut kullanıcı ID'sini al
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUser) {
            AppUser user = (AppUser) authentication.getPrincipal();
            return user.getId();
        }
        return null;
    }

    /**
     * Mevcut kullanıcı email'ini al
     */
    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUser) {
            AppUser user = (AppUser) authentication.getPrincipal();
            return user.getEmail();
        }
        return null;
    }

    @Data
    public static class AddItemRequest {
        @NotNull(message = "Ürün ID'si zorunludur")
        private Long productId;
        
        @NotNull(message = "Miktar zorunludur")
        @Min(value = 1, message = "Miktar en az 1 olmalıdır")
        private Integer quantity;
        
        private Double width;
        
        private Double height;
        
        private String pleatType;
    }

    @Data
    public static class UpdateQuantityRequest {
        @NotNull(message = "Miktar zorunludur")
        @Min(value = 1, message = "Miktar en az 1 olmalıdır")
        private Integer quantity;
    }

    @Data
    public static class ApplyCouponRequest {
        @NotBlank(message = "Kupon kodu zorunludur")
        private String couponCode;
    }
}


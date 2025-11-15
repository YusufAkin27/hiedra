package eticaret.demo.cart;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.common.exception.CartException;
import eticaret.demo.common.exception.ProductException;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.coupon.CouponService;
import eticaret.demo.coupon.CouponUsage;
import eticaret.demo.coupon.CouponUsageRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final AppUserRepository userRepository;
    private final CouponService couponService;
    private final CouponUsageRepository couponUsageRepository;

    /**
     * Kullanıcının aktif sepetini getir veya oluştur
     */
    @Transactional
    public Cart getOrCreateCart(Long userId, String guestUserId) {
        Optional<Cart> cartOpt;
        
        if (userId != null) {
            cartOpt = cartRepository.findByUser_IdAndStatus(userId, CartStatus.AKTIF);
        } else {
            cartOpt = cartRepository.findByGuestUserIdAndStatus(guestUserId, CartStatus.AKTIF);
        }
        
        if (cartOpt.isPresent()) {
            Cart cart = cartOpt.get();
            
            // Items zaten EAGER olarak yüklenecek, sadece product'ları initialize et
            if (cart.getItems() != null && !cart.getItems().isEmpty()) {
                // Stok kontrolü ve silinen ürün kontrolü yap
                List<CartItem> itemsToRemove = new java.util.ArrayList<>();
                
                for (CartItem item : cart.getItems()) {
                    if (item.getProduct() != null) {
                        // Product'ı tamamen initialize et (lazy loading proxy hatasını önlemek için)
                        item.getProduct().getId();
                        item.getProduct().getName();
                        item.getProduct().getPrice();
                        if (item.getProduct().getCategory() != null) {
                            item.getProduct().getCategory().getId();
                            item.getProduct().getCategory().getName();
                        }
                        
                        // Stok kontrolü: Stoğu biten ürünleri sepetten kaldır
                        if (item.getProduct().getQuantity() == null || item.getProduct().getQuantity() <= 0) {
                            log.info("Ürün stoğu bitti, sepetten kaldırılıyor - ProductId: {}, ProductName: {}", 
                                    item.getProduct().getId(), item.getProduct().getName());
                            itemsToRemove.add(item);
                            continue;
                        }
                    } else {
                        // Ürün silinmiş, sepetten kaldır
                        log.info("Ürün silinmiş, sepetten kaldırılıyor - CartItemId: {}", item.getId());
                        itemsToRemove.add(item);
                    }
                }
                
                // Silinmesi gereken ürünleri sepetten kaldır
                // Cart sınıfında orphanRemoval = true olduğu için removeItem çağrısı yeterli
                if (!itemsToRemove.isEmpty()) {
                    for (CartItem item : itemsToRemove) {
                        cart.removeItem(item.getId());
                    }
                    log.info("Sepetten {} adet ürün kaldırıldı (stok bitti veya ürün silindi)", itemsToRemove.size());
                }
            }
            
            // User'ı initialize et (lazy loading proxy hatasını önlemek için)
            if (cart.getUser() != null) {
                cart.getUser().getId();
            }
            
            cart.calculateTotal();
            return cartRepository.save(cart);
        }
        
        // Yeni sepet oluştur
        Cart.CartBuilder builder = Cart.builder()
                .status(CartStatus.AKTIF)
                .items(new java.util.ArrayList<>());
        
        if (userId != null) {
            AppUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new CartException("Kullanıcı bulunamadı (ID: " + userId + ")"));
            builder.user(user);
        } else {
            if (guestUserId == null || guestUserId.trim().isEmpty()) {
                guestUserId = UUID.randomUUID().toString();
                log.info("Yeni guest kullanıcı ID'si oluşturuldu: {}", guestUserId);
            }
            builder.guestUserId(guestUserId.trim());
        }
        
        Cart cart = builder.build();
        return cartRepository.save(cart);
    }

    /**
     * Sepete ürün ekle
     */
    @Transactional
    public Cart addItemToCart(Long cartId, Long productId, Integer quantity, 
                              Double width, Double height, String pleatType) {
        // Validation
        if (cartId == null) {
            throw new CartException("Sepet ID'si zorunludur");
        }
        if (productId == null) {
            throw new CartException("Ürün ID'si zorunludur");
        }
        if (quantity == null || quantity <= 0) {
            throw new CartException("Miktar 0'dan büyük olmalıdır");
        }
        
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> CartException.cartNotFound());
        
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> ProductException.productNotFound(productId));
        
        // Ürün aktif mi kontrolü
        if (product.getActive() == null || !product.getActive()) {
            throw new ProductException("Bu ürün şu anda satışta değil (ID: " + productId + ")");
        }
        
        // Stok kontrolü
        if (product.getQuantity() == null || product.getQuantity() <= 0) {
            throw ProductException.outOfStock(productId);
        }
        if (product.getQuantity() < quantity) {
            throw CartException.insufficientStock(productId, quantity, product.getQuantity());
        }
        
        CartItem item = CartItem.builder()
                .cart(cart)
                .product(product)
                .quantity(quantity)
                .width(width)
                .height(height)
                .pleatType(pleatType != null ? pleatType : "1x1")
                .build();
        
        item.calculateSubtotal();
        cart.addItem(item);
        
        Cart savedCart = cartRepository.save(cart);
        // Items içindeki product'ları initialize et (JSON serialization için)
        if (savedCart.getItems() != null) {
            savedCart.getItems().forEach(cartItem -> {
                if (cartItem.getProduct() != null) {
                    cartItem.getProduct().getId();
                    if (cartItem.getProduct().getCategory() != null) {
                        cartItem.getProduct().getCategory().getId();
                    }
                }
            });
        }
        return savedCart;
    }

    /**
     * Sepetten ürün çıkar
     */
    @Transactional
    public Cart removeItemFromCart(Long cartId, Long itemId) {
        // Validation
        if (cartId == null) {
            throw new CartException("Sepet ID'si zorunludur");
        }
        if (itemId == null) {
            throw new CartException("Sepet öğesi ID'si zorunludur");
        }
        
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> CartException.cartNotFound());
        
        // Sepet öğesi var mı kontrol et
        boolean itemExists = cart.getItems().stream()
                .anyMatch(item -> item.getId() != null && item.getId().equals(itemId));
        
        if (!itemExists) {
            throw CartException.cartItemNotFound();
        }
        
        cart.removeItem(itemId);
        Cart savedCart = cartRepository.save(cart);
        // Items içindeki product'ları initialize et (JSON serialization için)
        if (savedCart.getItems() != null) {
            savedCart.getItems().forEach(item -> {
                if (item.getProduct() != null) {
                    item.getProduct().getId();
                    if (item.getProduct().getCategory() != null) {
                        item.getProduct().getCategory().getId();
                    }
                }
            });
        }
        return savedCart;
    }

    /**
     * Sepet öğesi miktarını güncelle
     */
    @Transactional
    public Cart updateItemQuantity(Long cartId, Long itemId, Integer quantity) {
        // Validation
        if (cartId == null) {
            throw new CartException("Sepet ID'si zorunludur");
        }
        if (itemId == null) {
            throw new CartException("Sepet öğesi ID'si zorunludur");
        }
        if (quantity == null) {
            throw new CartException("Miktar zorunludur");
        }
        
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> CartException.cartNotFound());
        
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId() != null && i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> CartException.cartItemNotFound());
        
        if (quantity <= 0) {
            cart.removeItem(itemId);
        } else {
            // Ürün kontrolü
            if (item.getProduct() == null) {
                throw new CartException("Sepet öğesindeki ürün bulunamadı");
            }
            
            // Ürün aktif mi kontrolü
            if (item.getProduct().getActive() == null || !item.getProduct().getActive()) {
                throw new ProductException("Bu ürün şu anda satışta değil (ID: " + item.getProduct().getId() + ")");
            }
            
            // Stok kontrolü
            if (item.getProduct().getQuantity() == null || item.getProduct().getQuantity() <= 0) {
                throw ProductException.outOfStock(item.getProduct().getId());
            }
            if (item.getProduct().getQuantity() < quantity) {
                throw CartException.insufficientStock(
                        item.getProduct().getId(), 
                        quantity, 
                        item.getProduct().getQuantity()
                );
            }
            
            item.setQuantity(quantity);
            item.calculateSubtotal();
        }
        
        cart.calculateTotal();
        Cart savedCart = cartRepository.save(cart);
        // Items içindeki product'ları initialize et (JSON serialization için)
        if (savedCart.getItems() != null) {
            savedCart.getItems().forEach(cartItem -> {
                if (cartItem.getProduct() != null) {
                    cartItem.getProduct().getId();
                    if (cartItem.getProduct().getCategory() != null) {
                        cartItem.getProduct().getCategory().getId();
                    }
                }
            });
        }
        return savedCart;
    }

    /**
     * Sepeti temizle
     */
    @Transactional
    public Cart clearCart(Long cartId) {
        // Validation
        if (cartId == null) {
            throw new CartException("Sepet ID'si zorunludur");
        }
        
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> CartException.cartNotFound());
        
        cart.clear();
        return cartRepository.save(cart);
    }

    /**
     * Sepeti onayla (siparişe dönüştür)
     */
    @Transactional
    public Cart confirmCart(Long cartId) {
        // Validation
        if (cartId == null) {
            throw new CartException("Sepet ID'si zorunludur");
        }
        
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> CartException.cartNotFound());
        
        if (cart.isEmpty()) {
            throw CartException.emptyCart();
        }
        
        // Stok kontrolü ve ürün kontrolü
        for (CartItem item : cart.getItems()) {
            if (item.getProduct() == null) {
                throw new CartException("Sepet öğesindeki ürün bulunamadı (Item ID: " + item.getId() + ")");
            }
            
            Product product = item.getProduct();
            
            // Ürün aktif mi kontrolü
            if (product.getActive() == null || !product.getActive()) {
                throw new ProductException("Ürün '" + product.getName() + "' şu anda satışta değil (ID: " + product.getId() + ")");
            }
            
            // Stok kontrolü
            if (product.getQuantity() == null || product.getQuantity() <= 0) {
                throw ProductException.outOfStock(product.getId());
            }
            if (product.getQuantity() < item.getQuantity()) {
                throw CartException.insufficientStock(
                        product.getId(),
                        item.getQuantity(),
                        product.getQuantity()
                );
            }
        }
        
        // Stokları düş
        for (CartItem item : cart.getItems()) {
            Product product = item.getProduct();
            if (product.getQuantity() != null) {
                product.setQuantity(product.getQuantity() - item.getQuantity());
                productRepository.save(product);
            }
        }
        
        cart.setStatus(CartStatus.ONAYLANMIS);
        cart.calculateTotal();
        return cartRepository.save(cart);
    }

    /**
     * Kullanıcının sepetini getir
     */
    public Optional<Cart> getCartByUser(Long userId, String guestUserId) {
        // Validation: En az bir tanesi olmalı
        if (userId == null && (guestUserId == null || guestUserId.trim().isEmpty())) {
            throw new CartException("Kullanıcı ID'si veya guest kullanıcı ID'si zorunludur");
        }
        
        // Hem userId hem guestUserId verilmişse, userId öncelikli
        if (userId != null) {
            return cartRepository.findByUser_IdAndStatus(userId, CartStatus.AKTIF);
        } else {
            return cartRepository.findByGuestUserIdAndStatus(guestUserId.trim(), CartStatus.AKTIF);
        }
    }

    /**
     * 1 gün önce oluşturulmuş ve aktif olan sepetleri getir (mail gönderilmemiş)
     */
    public List<Cart> getCartsForReminderEmail() {
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
        LocalDateTime twoDaysAgo = LocalDateTime.now().minusDays(2);
        
        // 1-2 gün önce oluşturulmuş, aktif ve onaylanmamış sepetler
        return cartRepository.findAll().stream()
                .filter(cart -> cart.getStatus() == CartStatus.AKTIF)
                .filter(cart -> !cart.isEmpty())
                .filter(cart -> {
                    LocalDateTime createdAt = cart.getCreatedAt();
                    return createdAt.isAfter(twoDaysAgo) && createdAt.isBefore(oneDayAgo);
                })
                .filter(cart -> cart.getUser() != null || cart.getGuestUserId() != null) // Kullanıcı veya guest bilgisi olmalı
                .toList();
    }

    /**
     * Sepete kupon uygula
     */
    @Transactional
    public Cart applyCoupon(Long cartId, String couponCode, Long userId, String guestUserId, String userEmail) {
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new eticaret.demo.exception.CartException("Sepet bulunamadı"));
        
        // Sepet boş kontrolü
        if (cart.isEmpty()) {
            throw eticaret.demo.exception.CouponException.emptyCart();
        }
        
        // Sepette zaten bir kupon var mı kontrolü
        if (cart.hasCoupon()) {
            throw eticaret.demo.exception.CouponException.cartAlreadyHasCoupon();
        }
        
        // Sepet toplamını hesapla (kupon uygulanmadan önce)
        // Önce mevcut kupon indirimini sıfırla, sonra toplamı hesapla
        cart.setDiscountAmount(BigDecimal.ZERO);
        cart.calculateTotal();
        BigDecimal cartTotal = cart.getTotalAmount();
        
        // Kuponu sepete uygula (tüm kontroller CouponService'de yapılıyor)
        CouponUsage couponUsage = couponService.applyCouponToCart(
                couponCode, cartTotal, userId, guestUserId, userEmail);
        
        // Sepete kupon bilgilerini ekle ve indirimi uygula
        cart.applyCouponDiscount(
                couponUsage.getDiscountAmount(),
                couponUsage.getCoupon().getCode(),
                couponUsage.getId());
        
        log.info("Kupon sepete uygulandı - CartId: {}, CouponCode: {}, Discount: {} ₺", 
                cartId, couponCode, couponUsage.getDiscountAmount());
        
        return cartRepository.save(cart);
    }

    /**
     * Sepetten kuponu kaldır
     */
    @Transactional
    public Cart removeCoupon(Long cartId) {
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new eticaret.demo.exception.CartException("Sepet bulunamadı"));
        
        if (cart.getCouponUsageId() != null) {
            // Kupon kullanımını iptal et
            couponService.removeCouponFromCart(cart.getCouponUsageId());
            
            // Sepetten kupon bilgilerini kaldır
            cart.removeCouponDiscount();
            
            log.info("Kupon sepetten kaldırıldı - CartId: {}, CouponUsageId: {}", 
                    cartId, cart.getCouponUsageId());
        }
        
        return cartRepository.save(cart);
    }
}


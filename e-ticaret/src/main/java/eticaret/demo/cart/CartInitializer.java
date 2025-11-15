package eticaret.demo.cart;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(5) // Diğer initializer'lardan sonra çalışsın
public class CartInitializer implements CommandLineRunner {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final AppUserRepository userRepository;

    @Override
    public void run(String... args) {
        // Eğer sepetler varsa atla
        if (cartRepository.count() > 0) {
            log.info("Örnek sepetler zaten mevcut, atlanıyor.");
            return;
        }

        log.info("Örnek sepetler oluşturuluyor...");

        List<Product> products = productRepository.findAll();
        List<AppUser> users = userRepository.findAll().stream()
                .filter(user -> !user.getRole().name().equals("ADMIN"))
                .toList();

        if (products.isEmpty() || users.isEmpty()) {
            log.warn("Ürün veya kullanıcı bulunamadı, sepetler oluşturulamadı.");
            return;
        }

        Random random = new Random();
        int cartCount = 0;

        // Her kullanıcı için 1-3 arası sepet oluştur
        for (AppUser user : users) {
            int userCartCount = random.nextInt(3) + 1; // 1-3 arası
            
            for (int i = 0; i < userCartCount; i++) {
                Cart cart = createSampleCart(user, products, random, i);
                cartRepository.save(cart);
                cartCount++;
            }
        }

        log.info("{} adet örnek sepet başarıyla oluşturuldu.", cartCount);
    }

    private Cart createSampleCart(AppUser user, List<Product> products, Random random, int index) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime createdAt = now.minusDays(random.nextInt(30)) // Son 30 gün içinde
                .minusHours(random.nextInt(24))
                .minusMinutes(random.nextInt(60));

        // Sepet durumunu belirle
        CartStatus status;
        if (index == 0) {
            // İlk sepet aktif olsun
            status = CartStatus.AKTIF;
        } else if (random.nextBoolean()) {
            // %50 ihtimalle onaylanmış
            status = CartStatus.ONAYLANMIS;
        } else {
            // %50 ihtimalle terk edilmiş
            status = CartStatus.TERK_EDILMIS;
        }

        Cart cart = Cart.builder()
                .user(user)
                .status(status)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .totalAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .build();

        // Sepete 1-4 arası ürün ekle
        int itemCount = random.nextInt(4) + 1;
        for (int i = 0; i < itemCount && i < products.size(); i++) {
            Product product = products.get(random.nextInt(products.size()));
            CartItem item = createCartItem(cart, product, random);
            cart.getItems().add(item);
        }

        // Toplam tutarı hesapla
        cart.calculateTotal();

        // Önce cart'ı kaydet (ID almak için)
        cart = cartRepository.save(cart);

        // CartItem'ları kaydet
        for (CartItem item : cart.getItems()) {
            item.setCart(cart);
            cartItemRepository.save(item);
        }

        return cart;
    }

    private CartItem createCartItem(Cart cart, Product product, Random random) {
        double[] widths = {120.0, 150.0, 180.0, 200.0, 250.0, 300.0};
        double[] heights = {200.0, 250.0, 280.0, 300.0};
        String[] pleatTypes = {"1x2", "1x2.5", "1x3"};

        double width = widths[random.nextInt(widths.length)];
        double height = heights[random.nextInt(heights.length)];
        String pleatType = pleatTypes[random.nextInt(pleatTypes.length)];
        int quantity = random.nextInt(2) + 1; // 1-2 arası

        CartItem item = CartItem.builder()
                .cart(cart)
                .product(product)
                .quantity(quantity)
                .width(width)
                .height(height)
                .pleatType(pleatType)
                .unitPrice(product.getPrice())
                .createdAt(cart.getCreatedAt())
                .build();

        // Ara toplamı hesapla
        item.calculateSubtotal();

        return item;
    }
}


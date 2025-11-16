package eticaret.demo.order;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import eticaret.demo.address.Address;
import eticaret.demo.address.AdresRepository;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;


import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(6) // Diğer initializer'lardan sonra çalışsın
public class OrderInitializer implements CommandLineRunner {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final AdresRepository addressRepository;
    private final ProductRepository productRepository;
    private final AppUserRepository userRepository;

    @Override
    public void run(String... args) {
        // Eğer siparişler varsa atla
        if (orderRepository.count() > 0) {
            log.info("Örnek siparişler zaten mevcut, atlanıyor.");
            return;
        }

        log.info("Örnek siparişler oluşturuluyor...");

        List<Product> products = productRepository.findAll();
        List<AppUser> users = userRepository.findAll().stream()
                .filter(user -> !user.getRole().name().equals("ADMIN"))
                .toList();

        if (products.isEmpty() || users.isEmpty()) {
            log.warn("Ürün veya kullanıcı bulunamadı, siparişler oluşturulamadı.");
            return;
        }

        Random random = new Random();
        int orderCount = 0;

        // Her kullanıcı için 2-5 arası sipariş oluştur
        for (AppUser user : users) {
            int userOrderCount = random.nextInt(4) + 2; // 2-5 arası
            
            for (int i = 0; i < userOrderCount; i++) {
                eticaret.demo.order.Order order = createSampleOrder(user, products, random, i);
                orderRepository.save(order);
                orderCount++;
            }
        }

        log.info("{} adet örnek sipariş başarıyla oluşturuldu.", orderCount);
    }

    private eticaret.demo.order.Order createSampleOrder(AppUser user, List<Product> products, Random random, int index) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime createdAt = now.minusDays(random.nextInt(120)) // Son 120 gün içinde
                .minusHours(random.nextInt(24))
                .minusMinutes(random.nextInt(60));

        // Sipariş numarası oluştur
        String orderNumber = "ORD-" + createdAt.format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                + "-" + String.format("%04d", random.nextInt(10000));

        // Sipariş durumunu belirle (çeşitli durumlar)
        OrderStatus[] statuses = {
            OrderStatus.ODEME_BEKLIYOR,
            OrderStatus.ODENDI,
            OrderStatus.ISLEME_ALINDI,
            OrderStatus.KARGOYA_VERILDI,
            OrderStatus.TESLIM_EDILDI,
            OrderStatus.TAMAMLANDI
        };
        OrderStatus status = statuses[random.nextInt(statuses.length)];

        // Sipariş oluştur
        eticaret.demo.order.Order order = eticaret.demo.order.Order.builder()
                .orderNumber(orderNumber)
                .totalAmount(BigDecimal.ZERO) // Önce sıfır, sonra hesaplanacak
                .status(status)
                .customerName(user.getFullName())
                .customerEmail(user.getEmail())
                .customerPhone(user.getPhone() != null && !user.getPhone().isBlank() ? user.getPhone() : "Bilinmiyor")
                .user(user)
                .createdAt(createdAt)
                .addresses(new ArrayList<>())
                .orderItems(new ArrayList<>())
                .build();

        // Önce order'ı kaydet (ID almak için)
        order = orderRepository.save(order);

        // Sipariş kalemleri oluştur (1-3 arası ürün)
        int itemCount = random.nextInt(3) + 1;
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (int i = 0; i < itemCount && i < products.size(); i++) {
            Product product = products.get(random.nextInt(products.size()));
            OrderItem orderItem = createOrderItem(order, product, random);
            orderItemRepository.save(orderItem);
            order.getOrderItems().add(orderItem);
            totalAmount = totalAmount.add(orderItem.getTotalPrice());
        }

        // Toplam tutarı güncelle
        order.setTotalAmount(totalAmount);
        order = orderRepository.save(order);

        // Sipariş adresi oluştur
        Address orderAddress = createOrderAddress(order, user, random);
        addressRepository.save(orderAddress);
        order.getAddresses().add(orderAddress);

        // Duruma göre ek bilgiler ekle
        if (status == OrderStatus.IPTAL_EDILDI || status == OrderStatus.IADE_YAPILDI) {
            order.setCancelledAt(createdAt.plusDays(random.nextInt(5)));
            order.setCancelReason("Müşteri talebi");
        }

        if (status == OrderStatus.IADE_YAPILDI) {
            order.setRefundedAt(createdAt.plusDays(random.nextInt(10)));
        }

        return orderRepository.save(order);
    }

    private OrderItem createOrderItem(eticaret.demo.order.Order order, Product product, Random random) {
        double[] widths = {120.0, 150.0, 180.0, 200.0, 250.0, 300.0};
        double[] heights = {200.0, 250.0, 280.0, 300.0};
        String[] pleatTypes = {"1x2", "1x2.5", "1x3"};

        double width = widths[random.nextInt(widths.length)];
        double height = heights[random.nextInt(heights.length)];
        String pleatType = pleatTypes[random.nextInt(pleatTypes.length)];
        int quantity = random.nextInt(2) + 1; // 1-2 arası

        // Fiyat hesapla (basit hesaplama)
        BigDecimal basePrice = product.getPrice();
        double metreCinsindenEn = width / 100.0;
        double pileCarpani = 1.0;
        
        try {
            String[] parts = pleatType.split("x");
            if (parts.length == 2) {
                pileCarpani = Double.parseDouble(parts[1]);
            }
        } catch (Exception e) {
            // Hata durumunda varsayılan değer
        }
        
        double toplam = metreCinsindenEn * pileCarpani * basePrice.doubleValue() * quantity;
        BigDecimal totalPrice = BigDecimal.valueOf(toplam).setScale(2, java.math.RoundingMode.HALF_UP);

        OrderItem item = OrderItem.builder()
                .order(order)
                .productName(product.getName())
                .width(width)
                .height(height)
                .pleatType(pleatType)
                .quantity(quantity)
                .unitPrice(basePrice)
                .totalPrice(totalPrice)
                .productId(product.getId())
                .build();
        
        return item;
    }

    private Address createOrderAddress(eticaret.demo.order.Order order, AppUser user, Random random) {
        String[][] cities = {
            {"İstanbul", "Kadıköy", "Bağdat Caddesi No:123", "Daire 5", "34710"},
            {"Ankara", "Çankaya", "Atatürk Bulvarı No:45", "Kat 3", "06100"},
            {"İzmir", "Konak", "Kordon Boyu No:78", null, "35210"},
            {"Bursa", "Osmangazi", "Atatürk Caddesi No:12", "Daire 2", "16000"},
            {"Antalya", "Muratpaşa", "Lara Caddesi No:56", "Kat 4", "07100"}
        };

        String[] address = cities[random.nextInt(cities.length)];

        return Address.builder()
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .addressLine(address[2])
                .addressDetail(address[3])
                .city(address[0])
                .district(address[1])
                .order(order)
                .isDefault(false)
                .createdAt(order.getCreatedAt())
                .build();
    }
}


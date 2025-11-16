package eticaret.demo.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.address.Address;
import eticaret.demo.address.AdresRepository;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.order.OrderItem;
import eticaret.demo.order.OrderItemRepository;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.product.ProductReview;
import eticaret.demo.product.ProductReviewRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(2) // AdminInitializer'dan sonra çalışsın
public class UserInitializer implements CommandLineRunner {

    private final AppUserRepository appUserRepository;
    private final AdresRepository addressRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final ProductReviewRepository reviewRepository;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            // Sadece kullanıcı yoksa örnek veriler oluştur
            long userCount = appUserRepository.count();
            long adminCount = appUserRepository.countByRole(UserRole.ADMIN);
            long regularUserCount = userCount - adminCount;
            
            if (regularUserCount >= 5) { // En az 5 örnek kullanıcı varsa atla
                log.info("Örnek kullanıcılar zaten mevcut ({} kullanıcı), atlanıyor.", regularUserCount);
                return;
            }

            log.info("Örnek kullanıcı verileri oluşturuluyor... (Mevcut kullanıcı sayısı: {})", regularUserCount);

            // Örnek kullanıcılar oluştur
            List<AppUser> users = createSampleUsers();
            
            if (users.isEmpty()) {
                log.warn("Örnek kullanıcı oluşturulamadı.");
                return;
            }
            
            // Her kullanıcı için adresler oluştur
            for (AppUser user : users) {
                createSampleAddresses(user);
            }

            // Ürünler varsa siparişler ve yorumlar oluştur
            List<Product> products = productRepository.findAll();
            if (!products.isEmpty()) {
                Random random = new Random();
                for (AppUser user : users) {
                    createSampleOrders(user, products, random);
                    createSampleReviews(user, products, random);
                }
            } else {
                log.warn("Ürün bulunamadı, sipariş ve yorum oluşturulamadı.");
            }

            log.info("Örnek kullanıcı verileri başarıyla oluşturuldu. Toplam {} kullanıcı, {} adres, {} sipariş, {} yorum", 
                    users.size(), 
                    addressRepository.count(),
                    orderRepository.count(),
                    reviewRepository.count());
        } catch (Exception e) {
            log.error("Örnek kullanıcı verileri oluşturulurken hata: {}", e.getMessage(), e);
        }
    }

    private List<AppUser> createSampleUsers() {
        List<AppUser> users = new ArrayList<>();

        String[] emails = {
            "ahmet.yilmaz@example.com",
            "ayse.demir@example.com",
            "mehmet.kaya@example.com",
            "fatma.oz@example.com",
            "ali.celik@example.com"
        };

        String[] names = {
            "Ahmet Yılmaz",
            "Ayşe Demir",
            "Mehmet Kaya",
            "Fatma Öz",
            "Ali Çelik"
        };

        String[] phones = {
            "05551234567",
            "05552345678",
            "05553456789",
            "05554567890",
            "05555678901"
        };

        for (int i = 0; i < emails.length; i++) {
            Optional<AppUser> existingUser = appUserRepository.findByEmailIgnoreCase(emails[i]);
            if (existingUser.isEmpty()) {
                AppUser user = AppUser.builder()
                        .email(emails[i])
                        .fullName(names[i])
                        .phone(phones[i])
                        .role(UserRole.USER)
                        .emailVerified(true)
                        .active(true)
                        .build();
                users.add(appUserRepository.save(user));
                log.info("Örnek kullanıcı oluşturuldu: {}", emails[i]);
            } else {
                users.add(existingUser.get());
            }
        }

        return users;
    }

    private void createSampleAddresses(AppUser user) {
        // Kullanıcının zaten adresi varsa atla
        if (addressRepository.existsByUser_Id(user.getId())) {
            return;
        }

        String[][] addresses = {
            {"İstanbul", "Kadıköy", "Bağdat Caddesi No:123", "Daire 5", "34710"},
            {"Ankara", "Çankaya", "Atatürk Bulvarı No:45", "Kat 3", "06100"},
            {"İzmir", "Konak", "Kordon Boyu No:78", null, "35210"}
        };

        for (int i = 0; i < addresses.length; i++) {
            Address address = Address.builder()
                    .user(user)
                    .fullName(user.getFullName())
                    .phone(user.getPhone())
                    .addressLine(addresses[i][2])
                    .addressDetail(addresses[i][3])
                    .city(addresses[i][0])
                    .district(addresses[i][1])
                    .isDefault(i == 0) // İlk adres varsayılan
                    .build();
            addressRepository.save(address);
        }
        log.info("{} için {} adres oluşturuldu", user.getEmail(), addresses.length);
    }

    private void createSampleOrders(AppUser user, List<Product> products, Random random) {
        // Kullanıcının zaten siparişi varsa atla
        List<eticaret.demo.order.Order> existingOrders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(user.getEmail());
        if (!existingOrders.isEmpty()) {
            log.debug("{} için zaten {} sipariş mevcut, atlanıyor", user.getEmail(), existingOrders.size());
            return;
        }

        // Her kullanıcı için 1-3 arası sipariş oluştur
        int orderCount = random.nextInt(3) + 1;
        double[] widths = {120.0, 150.0, 180.0, 200.0, 250.0, 300.0};
        double[] heights = {200.0, 250.0, 280.0, 300.0};
        String[] pleatTypes = {"1x2", "1x2.5", "1x3"};

        for (int i = 0; i < orderCount; i++) {
            try {
                Product product = products.get(random.nextInt(products.size()));
                
                // Sipariş numarası oluştur
                String orderNumber = generateOrderNumber();
                
                // Sipariş detayları
                double width = widths[random.nextInt(widths.length)];
                double height = heights[random.nextInt(heights.length)];
                String pleatType = pleatTypes[random.nextInt(pleatTypes.length)];
                int quantity = random.nextInt(2) + 1; // 1-2 arası
                
                // Fiyat hesaplama
                double pleatMultiplier = getPleatMultiplier(pleatType);
                double widthInMeters = width / 100.0;
                double totalSquareMeters = widthInMeters * height / 100.0 * quantity * pleatMultiplier;
                BigDecimal unitPrice = product.getPrice();
                BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(totalSquareMeters))
                        .setScale(2, RoundingMode.HALF_UP);
                BigDecimal shippingCost = BigDecimal.valueOf(50.0); // Sabit kargo ücreti
                BigDecimal taxAmount = subtotal.multiply(BigDecimal.valueOf(0.20)) // %20 KDV
                        .setScale(2, RoundingMode.HALF_UP);
                BigDecimal totalAmount = subtotal.add(shippingCost).add(taxAmount)
                        .setScale(2, RoundingMode.HALF_UP);
                
                // Sipariş durumu (rastgele ama mantıklı)
                OrderStatus[] validStatuses = {
                    OrderStatus.ODENDI,
                    OrderStatus.ISLEME_ALINDI,
                    OrderStatus.KARGOYA_VERILDI,
                    OrderStatus.TESLIM_EDILDI,
                    OrderStatus.TAMAMLANDI
                };
                OrderStatus status = validStatuses[random.nextInt(validStatuses.length)];
                
                // Sipariş oluştur
                eticaret.demo.order.Order order = eticaret.demo.order.Order.builder()
                        .orderNumber(orderNumber)
                        .totalAmount(totalAmount)
                        .subtotal(subtotal)
                        .shippingCost(shippingCost)
                        .taxAmount(taxAmount)
                        .discountAmount(BigDecimal.ZERO)
                        .status(status)
                        .customerName(user.getFullName())
                        .customerEmail(user.getEmail())
                        .customerPhone(user.getPhone() != null && !user.getPhone().isBlank() ? user.getPhone() : "Bilinmiyor")
                        .user(user)
                        .createdAt(LocalDateTime.now().minusDays(random.nextInt(30)))
                        .orderSource("WEB")
                        .build();
                
                // Duruma göre tarihleri ayarla
                order.updateStatus(status);
                
                // Order'ı kaydet
                order = orderRepository.save(order);

                // Sipariş adresi oluştur (kullanıcının varsayılan adresini kullan veya yeni oluştur)
                Address userAddress = addressRepository.findByUser_IdAndIsDefaultTrue(user.getId())
                        .stream()
                        .findFirst()
                        .orElse(null);
                
                Address orderAddress;
                if (userAddress != null) {
                    // Kullanıcının varsayılan adresini kopyala
                    orderAddress = Address.builder()
                            .fullName(userAddress.getFullName())
                            .phone(userAddress.getPhone())
                            .addressLine(userAddress.getAddressLine())
                            .addressDetail(userAddress.getAddressDetail())
                            .city(userAddress.getCity())
                            .district(userAddress.getDistrict())
                            .order(order)
                            .isDefault(false)
                            .createdAt(order.getCreatedAt())
                            .build();
                } else {
                    // Varsayılan adres oluştur
                    orderAddress = Address.builder()
                            .fullName(user.getFullName())
                            .phone(user.getPhone())
                            .addressLine("Örnek Sipariş Adresi " + (i + 1))
                            .city("İstanbul")
                            .district("Kadıköy")
                            .order(order)
                            .isDefault(false)
                            .createdAt(order.getCreatedAt())
                            .build();
                }

                // Sipariş kalemi oluştur
                BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(totalSquareMeters))
                        .setScale(2, RoundingMode.HALF_UP);
                
                OrderItem orderItem = OrderItem.builder()
                        .productName(product.getName())
                        .width(width)
                        .height(height)
                        .pleatType(pleatType)
                        .quantity(quantity)
                        .unitPrice(unitPrice)
                        .totalPrice(totalPrice)
                        .productId(product.getId())
                        .productImageUrl(product.getCoverImageUrl())
                        .order(order)
                        .build();

                // Address ve OrderItem'ları kaydet
                addressRepository.save(orderAddress);
                orderItemRepository.save(orderItem);

                // Order'ın listelerini güncelle
                if (order.getAddresses() == null) {
                    order.setAddresses(new ArrayList<>());
                }
                if (order.getOrderItems() == null) {
                    order.setOrderItems(new ArrayList<>());
                }
                order.getAddresses().add(orderAddress);
                order.getOrderItems().add(orderItem);
                orderRepository.save(order);
                
                log.debug("Sipariş oluşturuldu: {} - {} TL", orderNumber, totalAmount);
            } catch (Exception e) {
                log.error("Sipariş oluşturulurken hata (kullanıcı: {}): {}", user.getEmail(), e.getMessage(), e);
            }
        }
        log.info("{} için {} sipariş oluşturuldu", user.getEmail(), orderCount);
    }
    
    /**
     * Sipariş numarası oluştur
     */
    private String generateOrderNumber() {
        String datePart = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        int randomPart = (int) (Math.random() * 9000) + 1000;
        return "ORD-" + datePart + "-" + randomPart;
    }
    
    /**
     * Pilaj çarpanını hesapla
     */
    private double getPleatMultiplier(String pleatType) {
        if (pleatType == null) {
            return 1.0;
        }
        
        return switch (pleatType.toUpperCase()) {
            case "1X2" -> 2.0;
            case "1X2.5" -> 2.5;
            case "1X3" -> 3.0;
            default -> 1.0;
        };
    }

    private void createSampleReviews(AppUser user, List<Product> products, Random random) {
        // Her kullanıcı için bazı ürünlere yorum yap (1-3 arası)
        int reviewCount = Math.min(random.nextInt(3) + 1, products.size());
        int createdCount = 0;

        String[] positiveComments = {
            "Çok kaliteli bir ürün, memnun kaldım!",
            "Hızlı kargo ve güzel paketleme. Teşekkürler.",
            "Beklentilerimi karşıladı, tavsiye ederim.",
            "Fiyat performans açısından çok iyi.",
            "Ürün tam istediğim gibi geldi.",
            "Mükemmel kalite, kesinlikle tavsiye ederim.",
            "Çok beğendim, tekrar alacağım.",
            "Paketleme çok özenliydi, teşekkürler."
        };
        
        String[] neutralComments = {
            "Ürün iyi, beklentilerimi karşıladı.",
            "Normal bir ürün, fiyatına göre uygun.",
            "Kullanışlı, memnun kaldım."
        };

        // Rastgele ürünler seç
        List<Product> shuffledProducts = new ArrayList<>(products);
        java.util.Collections.shuffle(shuffledProducts, random);

        for (int i = 0; i < reviewCount && i < shuffledProducts.size(); i++) {
            try {
                Product product = shuffledProducts.get(i);
                
                // Kullanıcının bu ürüne zaten yorumu varsa atla
                if (reviewRepository.findByProductIdAndUserId(product.getId(), user.getId()).isPresent()) {
                    continue;
                }

                // Rating belirle (çoğunlukla pozitif)
                int rating;
                double ratingChance = random.nextDouble();
                if (ratingChance < 0.7) { // %70 ihtimalle 4-5 yıldız
                    rating = random.nextInt(2) + 4; // 4-5
                } else if (ratingChance < 0.9) { // %20 ihtimalle 3 yıldız
                    rating = 3;
                } else { // %10 ihtimalle 1-2 yıldız
                    rating = random.nextInt(2) + 1; // 1-2
                }

                // Yorum seç
                String comment;
                if (rating >= 4) {
                    comment = positiveComments[random.nextInt(positiveComments.length)];
                } else {
                    comment = neutralComments[random.nextInt(neutralComments.length)];
                }

                ProductReview review = ProductReview.builder()
                        .product(product)
                        .user(user)
                        .rating(rating)
                        .comment(comment)
                        .active(true)
                        .build();

                reviewRepository.save(review);
                createdCount++;
                
                log.debug("Yorum oluşturuldu: {} - {} yıldız - Ürün: {}", 
                        user.getEmail(), rating, product.getName());
            } catch (Exception e) {
                log.error("Yorum oluşturulurken hata (kullanıcı: {}, ürün: {}): {}", 
                        user.getEmail(), shuffledProducts.get(i).getName(), e.getMessage());
            }
        }
        
        if (createdCount > 0) {
            log.info("{} için {} yorum oluşturuldu", user.getEmail(), createdCount);
        }
    }
}


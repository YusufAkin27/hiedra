package eticaret.demo.product;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(4) // Diğer initializer'lardan sonra çalışsın
public class ReviewInitializer implements CommandLineRunner {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final AppUserRepository userRepository;

    @Override
    public void run(String... args) {
        // Eğer yorumlar varsa atla
        if (reviewRepository.count() > 0) {
            log.info("Örnek yorumlar zaten mevcut, atlanıyor.");
            return;
        }

        log.info("Örnek yorumlar oluşturuluyor...");

        List<Product> products = productRepository.findAll();
        List<AppUser> users = userRepository.findAll().stream()
                .filter(user -> !user.getRole().name().equals("ADMIN"))
                .toList();

        if (products.isEmpty() || users.isEmpty()) {
            log.warn("Ürün veya kullanıcı bulunamadı, yorumlar oluşturulamadı.");
            return;
        }

        int reviewCount = 0;
        Random random = new Random();

        // Her ürün için 3-8 arası yorum oluştur
        for (Product product : products) {
            int reviewsForProduct = random.nextInt(6) + 3; // 3-8 arası
            
            for (int i = 0; i < reviewsForProduct && i < users.size(); i++) {
                AppUser user = users.get(random.nextInt(users.size()));
                
                // Kullanıcının bu ürüne zaten yorumu varsa atla
                if (reviewRepository.findByProductIdAndUserId(product.getId(), user.getId()).isPresent()) {
                    continue;
                }

                ProductReview review = createSampleReview(product, user, random);
                reviewRepository.save(review);
                reviewCount++;
            }
        }

        log.info("{} adet örnek yorum başarıyla oluşturuldu.", reviewCount);
    }

    private ProductReview createSampleReview(Product product, AppUser user, Random random) {
        String[] positiveComments = {
            "Harika bir ürün! Kalitesi çok iyi, kesinlikle tavsiye ederim.",
            "Çok memnun kaldım. Hızlı kargo ve güzel paketleme. Teşekkürler!",
            "Beklentilerimi fazlasıyla karşıladı. Fiyat performans açısından mükemmel.",
            "Ürün tam istediğim gibi geldi. Renk ve desen katalogdakinden farklı değil.",
            "Çok kaliteli bir perde. Evimdeki dekorasyona çok yakıştı.",
            "Montaj kolay oldu ve görünümü harika. Çok beğendim!",
            "Işık geçirgenliği tam istediğim gibi. Blackout özelliği çok iyi çalışıyor.",
            "Fiyatına göre çok kaliteli. Uzun süre kullanacağım gibi görünüyor.",
            "Müşteri hizmetleri çok ilgiliydi. Ürün de beklentilerimi karşıladı.",
            "Çok şık ve modern görünüyor. Evime çok yakıştı, teşekkürler!"
        };

        String[] neutralComments = {
            "Ürün iyi ama beklentilerim kadar değil. Yine de kullanılabilir.",
            "Fiyatına göre ortalama bir ürün. Daha iyisini bekliyordum.",
            "Kalite fena değil ama bazı detaylarda eksiklikler var.",
            "Genel olarak memnunum ama bazı küçük sorunlar var.",
            "Ürün iyi ama kargo biraz gecikti. Yine de memnunum."
        };

        String[] negativeComments = {
            "Ürün beklentilerimi karşılamadı. Renk katalogdakinden farklı.",
            "Kalite beklentimin altında kaldı. Daha iyisini bekliyordum.",
            "Kargo sırasında küçük bir hasar oluşmuş. Yine de kullanıyorum.",
            "Ürün iyi ama montaj biraz zor oldu. Yardım almak gerekebilir.",
            "Fiyatına göre kalite yeterli değil. Daha ucuz alternatifler var."
        };

        int rating = random.nextInt(5) + 1; // 1-5 arası
        String comment;
        boolean active = true;

        if (rating >= 4) {
            comment = positiveComments[random.nextInt(positiveComments.length)];
        } else if (rating == 3) {
            comment = neutralComments[random.nextInt(neutralComments.length)];
        } else {
            comment = negativeComments[random.nextInt(negativeComments.length)];
            // Düşük puanlı yorumların %30'u pasif olsun
            active = random.nextInt(10) >= 3;
        }

        LocalDateTime createdAt = LocalDateTime.now()
                .minusDays(random.nextInt(90)) // Son 90 gün içinde
                .minusHours(random.nextInt(24))
                .minusMinutes(random.nextInt(60));

        // Builder'a tarihleri de ekle
        ProductReview review = ProductReview.builder()
                .product(product)
                .user(user)
                .rating(rating)
                .comment(comment)
                .active(active)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .build();
        
        // @PrePersist'in çalışması için emin olmak için tekrar set et
        if (review.getCreatedAt() == null) {
            review.setCreatedAt(createdAt);
        }
        if (review.getUpdatedAt() == null) {
            review.setUpdatedAt(createdAt);
        }
        
        return review;
    }
}


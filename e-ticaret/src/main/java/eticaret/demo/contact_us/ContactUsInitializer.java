package eticaret.demo.contact_us;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(3) // Diğer initializer'lardan sonra çalışsın
public class ContactUsInitializer implements CommandLineRunner {

    private static final String SAMPLE_EMAIL = "ysufakn63@gmail.com";
    private static final String SAMPLE_NAME = "Yusuf Akin";
    private static final String SAMPLE_PHONE = "05551234567";

    private final ContactUsRepository contactUsRepository;

    @Override
    public void run(String... args) {
        // Eğer bu email'den mesaj varsa atla
        if (contactUsRepository.findByEmailAndVerifiedFalse(SAMPLE_EMAIL).size() > 0 ||
            contactUsRepository.findAll().stream().anyMatch(m -> SAMPLE_EMAIL.equalsIgnoreCase(m.getEmail()))) {
            log.info("Örnek contact us mesajları zaten mevcut, atlanıyor.");
            return;
        }

        log.info("Örnek contact us mesajları oluşturuluyor...");

        List<ContactUs> sampleMessages = createSampleMessages();
        contactUsRepository.saveAll(sampleMessages);

        log.info("{} adet örnek contact us mesajı başarıyla oluşturuldu.", sampleMessages.size());
    }

    private List<ContactUs> createSampleMessages() {
        List<ContactUs> messages = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        // 1. Ürün Sorgusu - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Ürün Hakkında Bilgi")
                .message("Merhaba,\n\n" +
                        "Sitenizde gördüğüm perde modelleri hakkında bilgi almak istiyorum. Özellikle blackout perdeleriniz çok ilgimi çekti. " +
                        "Bu ürünlerin ölçüleri ve fiyatları hakkında detaylı bilgi verebilir misiniz?\n\n" +
                        "Ayrıca montaj hizmeti de sunuyor musunuz? Evimdeki pencereler standart ölçülerde değil, özel ölçü alınması gerekiyor.\n\n" +
                        "Teşekkürler.")
                .verified(true)
                .createdAt(now.minusDays(2))
                .isResponded(false)
                .build());

        // 2. Sipariş Takibi - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Sipariş Durumu Sorgusu")
                .message("İyi günler,\n\n" +
                        "Geçen hafta bir sipariş verdim (Sipariş No: #12345) ancak henüz kargo bilgisi gelmedi. " +
                        "Siparişimin durumunu öğrenebilir miyim? Ne zaman kargoya verilecek?\n\n" +
                        "Acil bir ihtiyacım var, bu yüzden mümkün olan en kısa sürede teslim edilmesini istiyorum.\n\n" +
                        "Bilgilendirme için şimdiden teşekkür ederim.")
                .verified(true)
                .createdAt(now.minusDays(5))
                .isResponded(false)
                .build());

        // 3. İade Talebi - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("İade İşlemi")
                .message("Merhaba,\n\n" +
                        "Aldığım perde ürünü beklentilerimi karşılamadı. Renk ve desen katalogdakinden farklı görünüyor. " +
                        "İade işlemi yapmak istiyorum.\n\n" +
                        "Ürün hiç kullanılmadı, orijinal ambalajında. İade süreci nasıl işliyor? " +
                        "Kargo ücreti bana mı ait olacak?\n\n" +
                        "En kısa sürede geri dönüş yaparsanız sevinirim.")
                .verified(true)
                .createdAt(now.minusDays(1))
                .isResponded(false)
                .build());

        // 4. Özel Ölçü Talebi - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Özel Ölçü Perde Talebi")
                .message("Sayın Yetkililer,\n\n" +
                        "Salonum için özel ölçüde bir perde istiyorum. Pencerenin genişliği 3.5 metre, yüksekliği ise 2.8 metre. " +
                        "Blackout özellikli, koyu gri renkte bir perde arıyorum.\n\n" +
                        "Bu özel ölçü için fiyat teklifi alabilir miyim? Ayrıca montaj hizmeti de dahil mi?\n\n" +
                        "Teşekkürler.")
                .verified(true)
                .createdAt(now.minusDays(10))
                .isResponded(false)
                .build());

        // 5. Kargo Sorunu - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Kargo Gecikmesi")
                .message("Merhaba,\n\n" +
                        "Siparişim 5 gün önce kargoya verildi ancak henüz elime ulaşmadı. Kargo takip numarası ile kontrol ettiğimde " +
                        "ürünün dağıtım merkezinde olduğunu görüyorum ama teslimat yapılmamış.\n\n" +
                        "Bu konuda yardımcı olabilir misiniz? Acil bir durum var.")
                .verified(true)
                .createdAt(now.minusDays(7))
                .isResponded(false)
                .build());

        // 6. Ürün Önerisi - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Yatak Odası İçin Perde Önerisi")
                .message("İyi günler,\n\n" +
                        "Yatak odam için perde arıyorum. Odam güneye baktığı için sabahları çok güneş alıyor. " +
                        "Uyku kalitemi etkilememesi için blackout özellikli bir perde istiyorum.\n\n" +
                        "Odanın genişliği 4 metre, yüksekliği 2.5 metre. Hangi modeli önerirsiniz? " +
                        "Ayrıca renk seçenekleri nelerdir?\n\n" +
                        "Teşekkürler.")
                .verified(true)
                .createdAt(now.minusHours(12))
                .isResponded(false)
                .build());

        // 7. Fiyat Sorgusu - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Toplu Alım İndirimi")
                .message("Merhaba,\n\n" +
                        "Yeni evime taşınıyorum ve tüm odalar için perde almak istiyorum. " +
                        "Toplamda 8 pencere için perde gerekiyor. Toplu alım için özel bir indirim yapabilir misiniz?\n\n" +
                        "Ürünlerin tamamı blackout olacak ve aynı modelden seçeceğim. " +
                        "Fiyat teklifi alabilir miyim?\n\n" +
                        "Teşekkürler.")
                .verified(true)
                .createdAt(now.minusHours(6))
                .isResponded(false)
                .build());

        // 8. Montaj Hizmeti - Cevaplanmış
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Montaj Hizmeti Hakkında")
                .message("Sayın Yetkililer,\n\n" +
                        "Perdelerinizi satın aldım ancak montaj konusunda yardıma ihtiyacım var. " +
                        "Montaj hizmeti sunuyor musunuz? Eğer sunuyorsanız ücreti nedir?\n\n" +
                        "Ayrıca montaj için randevu nasıl alınır?")
                .verified(true)
                .createdAt(now.minusDays(8))
                .isResponded(true)
                .adminResponse("Sayın " + SAMPLE_NAME + ",\n\n" +
                        "Evet, montaj hizmeti sunuyoruz. İstanbul içi montaj ücretimiz pencere başına 150 TL'dir. " +
                        "Montaj için randevu almak için lütfen 0212 123 45 67 numaralı telefonu arayın.\n\n" +
                        "Montaj ekibimiz hafta içi ve cumartesi günleri hizmet vermektedir. " +
                        "Randevu alındıktan sonra size en uygun tarih ve saat için planlama yapılacaktır.\n\n" +
                        "Başka sorularınız varsa çekinmeden sorabilirsiniz.\n\n" +
                        "Saygılarımızla,\n" +
                        "Hiedra Collection Home Müşteri Hizmetleri")
                .respondedAt(now.minusDays(7))
                .respondedBy("admin@hiedra.com")
                .build());

        // 9. Ürün Hasarı - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Ürün Hasarı Bildirimi")
                .message("Merhaba,\n\n" +
                        "Aldığım perde ürünü kargo sırasında hasar görmüş. Paketi açtığımda perdenin bir köşesinde yırtık olduğunu gördüm. " +
                        "Ürünü kullanmadan geri gönderdim.\n\n" +
                        "Bu durumda ne yapmam gerekiyor? Yeni bir ürün gönderilecek mi yoksa iade mi yapılacak?\n\n" +
                        "Acil dönüş bekliyorum.")
                .verified(true)
                .createdAt(now.minusHours(3))
                .isResponded(false)
                .build());

        // 10. Genel Bilgi - Cevap bekliyor
        messages.add(ContactUs.builder()
                .name(SAMPLE_NAME)
                .email(SAMPLE_EMAIL)
                .phone(SAMPLE_PHONE)
                .subject("Genel Bilgi")
                .message("Merhaba,\n\n" +
                        "Sitenizi yeni keşfettim ve ürünleriniz çok beğendim. " +
                        "Ancak birkaç sorum var:\n\n" +
                        "1. Ürünleriniz Türkiye'nin her yerine kargo yapılıyor mu?\n" +
                        "2. Ödeme seçenekleri nelerdir?\n" +
                        "3. Garanti süresi var mı?\n\n" +
                        "Teşekkürler.")
                .verified(true)
                .createdAt(now.minusDays(12))
                .isResponded(false)
                .build());

        return messages;
    }
}


package eticaret.demo.contract;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Default sözleşmeleri oluşturan initializer
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(10) // Diğer initializer'lardan sonra çalışsın
public class ContractInitializer implements CommandLineRunner {

    private final ContractRepository contractRepository;

    @Override
    public void run(String... args) {
        // Eğer sözleşmeler varsa atla
        if (contractRepository.count() > 0) {
            log.info("Default sözleşmeler zaten mevcut, atlanıyor.");
            return;
        }

        log.info("Default sözleşmeler oluşturuluyor...");

        createDefaultContracts();

        log.info("Default sözleşmeler başarıyla oluşturuldu.");
    }

    private void createDefaultContracts() {
        // Satış Sözleşmesi
        createContractIfNotExists(
                ContractType.SATIS,
                "Satış Sözleşmesi",
                getSalesContractContent(),
                true
        );

        // Gizlilik Politikası
        createContractIfNotExists(
                ContractType.GIZLILIK,
                "Gizlilik Politikası",
                getPrivacyPolicyContent(),
                true
        );

        // Kullanım Koşulları
        createContractIfNotExists(
                ContractType.KULLANIM,
                "Kullanım Koşulları",
                getTermsOfUseContent(),
                true
        );

        // KVKK Aydınlatma Metni
        createContractIfNotExists(
                ContractType.KVKK,
                "KVKK Aydınlatma Metni",
                getKvkkContent(),
                true
        );

        // İade ve Değişim Koşulları
        createContractIfNotExists(
                ContractType.IADE,
                "İade ve Değişim Koşulları",
                getReturnPolicyContent(),
                true
        );

        // Kargo ve Teslimat Koşulları
        createContractIfNotExists(
                ContractType.KARGO,
                "Kargo ve Teslimat Koşulları",
                getShippingPolicyContent(),
                true
        );
    }

    private void createContractIfNotExists(ContractType type, String title, String content, Boolean requiredApproval) {
        if (!contractRepository.existsByType(type)) {
            Contract contract = Contract.builder()
                    .type(type)
                    .title(title)
                    .content(content)
                    .version(1)
                    .active(true)
                    .requiredApproval(requiredApproval)
                    .build();
            contractRepository.save(contract);
            log.info("Sözleşme oluşturuldu: {}", title);
        }
    }

    private String getSalesContractContent() {
        return """
                <h2>SATIŞ SÖZLEŞMESİ</h2>
                
                <h3>1. TARAFLAR</h3>
                <p>Bu sözleşme, aşağıda kimlik bilgileri belirtilen taraflar arasında aşağıdaki şartlar ve koşullar çerçevesinde imzalanmıştır.</p>
                
                <h3>2. KONU</h3>
                <p>Bu sözleşmenin konusu, satıcının internet sitesi üzerinden alıcıya satışa sunulan ürünlerin satışı ve teslimi ile ilgili tarafların hak ve yükümlülüklerinin belirlenmesidir.</p>
                
                <h3>3. SİPARİŞ VE ÖDEME</h3>
                <p>Alıcı, internet sitesi üzerinden sipariş vererek ürünü satın almayı kabul eder. Ödeme, sipariş sırasında belirtilen ödeme yöntemleri ile yapılır.</p>
                
                <h3>4. TESLİMAT</h3>
                <p>Ürünler, sipariş sırasında belirtilen adrese teslim edilir. Teslimat süresi, ürün ve bölgeye göre değişiklik gösterebilir.</p>
                
                <h3>5. CAYMA HAKKI</h3>
                <p>Alıcı, 14 gün içinde cayma hakkını kullanabilir. Cayma hakkı, ürünün kullanılmamış ve hasarsız olması koşuluyla geçerlidir.</p>
                
                <h3>6. SORUMLULUK</h3>
                <p>Satıcı, ürünün ayıplı olması durumunda sorumludur. Alıcı, ürünü teslim aldıktan sonra 2 gün içinde kontrol etmeli ve ayıplı ürün tespit edilirse bildirmelidir.</p>
                
                <h3>7. UYUŞMAZLIKLARIN ÇÖZÜMÜ</h3>
                <p>Bu sözleşmeden doğan uyuşmazlıkların çözümünde Türkiye Cumhuriyeti yasaları geçerlidir.</p>
                """;
    }

    private String getPrivacyPolicyContent() {
        return """
                <h2>GİZLİLİK POLİTİKASI</h2>
                
                <h3>1. KİŞİSEL VERİLERİN KORUNMASI</h3>
                <p>Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında işlenmektedir.</p>
                
                <h3>2. TOPLANAN VERİLER</h3>
                <p>İsim, e-posta adresi, telefon numarası, adres bilgileri, IP adresi, çerez bilgileri ve sipariş bilgileri toplanmaktadır.</p>
                
                <h3>3. VERİLERİN KULLANIM AMACI</h3>
                <p>Toplanan veriler, sipariş işlemlerinin gerçekleştirilmesi, müşteri hizmetleri sağlanması, yasal yükümlülüklerin yerine getirilmesi ve pazarlama faaliyetleri için kullanılmaktadır.</p>
                
                <h3>4. VERİLERİN PAYLAŞIMI</h3>
                <p>Kişisel verileriniz, yasal zorunluluklar dışında üçüncü kişilerle paylaşılmamaktadır. Kargo ve ödeme işlemleri için gerekli olan veriler ilgili firmalarla paylaşılabilir.</p>
                
                <h3>5. VERİ GÜVENLİĞİ</h3>
                <p>Kişisel verileriniz, teknik ve idari güvenlik önlemleri ile korunmaktadır.</p>
                
                <h3>6. HAKLARINIZ</h3>
                <p>KVKK kapsamında, kişisel verilerinize erişim, düzeltme, silme, itiraz etme ve veri taşınabilirliği haklarınız bulunmaktadır.</p>
                """;
    }

    private String getTermsOfUseContent() {
        return """
                <h2>KULLANIM KOŞULLARI</h2>
                
                <h3>1. GENEL HÜKÜMLER</h3>
                <p>Bu siteyi kullanarak, aşağıdaki kullanım koşullarını kabul etmiş sayılırsınız.</p>
                
                <h3>2. SİTE KULLANIMI</h3>
                <p>Site, yasalara uygun şekilde kullanılmalıdır. Site içeriği, telif hakkı yasaları ile korunmaktadır.</p>
                
                <h3>3. KULLANICI HESAPLARI</h3>
                <p>Hesap bilgilerinizin güvenliğinden siz sorumlusunuz. Şifrenizi kimseyle paylaşmayın.</p>
                
                <h3>4. SİPARİŞ VE ÖDEME</h3>
                <p>Siparişleriniz, stok durumuna göre işleme alınır. Ödeme işlemleri güvenli ödeme sistemleri üzerinden gerçekleştirilir.</p>
                
                <h3>5. SORUMLULUK SINIRLAMALARI</h3>
                <p>Site, kesintisiz ve hatasız hizmet verme garantisi vermemektedir. Teknik sorunlar nedeniyle oluşabilecek zararlardan sorumlu değildir.</p>
                
                <h3>6. DEĞİŞİKLİKLER</h3>
                <p>Bu kullanım koşulları, önceden haber verilmeksizin değiştirilebilir.</p>
                """;
    }

    private String getKvkkContent() {
        return """
                <h2>KVKK AYDINLATMA METNİ</h2>
                
                <h3>1. VERİ SORUMLUSU</h3>
                <p>Kişisel verileriniz, veri sorumlusu sıfatıyla tarafımızca işlenmektedir.</p>
                
                <h3>2. İŞLENEN KİŞİSEL VERİLER</h3>
                <p>Kimlik, iletişim, müşteri işlem, işlem güvenliği, pazarlama ve risk yönetimi verileri işlenmektedir.</p>
                
                <h3>3. KİŞİSEL VERİLERİN İŞLENME AMACI</h3>
                <p>Kişisel verileriniz, hukuka uygun olarak işlenmekte ve aşağıdaki amaçlarla kullanılmaktadır:</p>
                <ul>
                    <li>Sipariş işlemlerinin gerçekleştirilmesi</li>
                    <li>Müşteri hizmetleri sağlanması</li>
                    <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                    <li>Pazarlama ve tanıtım faaliyetleri</li>
                </ul>
                
                <h3>4. KİŞİSEL VERİLERİN AKTARILMASI</h3>
                <p>Kişisel verileriniz, yasal zorunluluklar ve hizmet sağlanması amacıyla sınırlı olarak üçüncü kişilerle paylaşılabilir.</p>
                
                <h3>5. KİŞİSEL VERİLERİNİZİN KORUNMASI</h3>
                <p>Kişisel verileriniz, teknik ve idari güvenlik önlemleri ile korunmaktadır.</p>
                
                <h3>6. HAKLARINIZ</h3>
                <p>KVKK'nın 11. maddesi uyarınca, kişisel verilerinizle ilgili olarak aşağıdaki haklara sahipsiniz:</p>
                <ul>
                    <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                    <li>İşlenmişse bilgi talep etme</li>
                    <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                    <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                    <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
                    <li>Silinmesini veya yok edilmesini isteme</li>
                    <li>Düzeltme, silme, yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
                    <li>İşlenen verilerin münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                    <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
                </ul>
                """;
    }

    private String getReturnPolicyContent() {
        return """
                <h2>İADE VE DEĞİŞİM KOŞULLARI</h2>
                
                <h3>1. CAYMA HAKKI</h3>
                <p>6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca, mesafeli satış sözleşmelerinde tüketici, sözleşmeden cayma hakkına sahiptir.</p>
                
                <h3>2. CAYMA SÜRESİ</h3>
                <p>Cayma hakkı, malın tüketiciye veya tüketici tarafından gösterilen adresteki kişiye teslim edildiği tarihten itibaren 14 gün içinde kullanılabilir.</p>
                
                <h3>3. CAYMA HAKKININ KULLANILMASI</h3>
                <p>Cayma hakkını kullanmak için, müşteri hizmetlerimiz ile iletişime geçmeniz gerekmektedir. Ürün, kullanılmamış, hasarsız ve orijinal ambalajında olmalıdır.</p>
                
                <h3>4. İADE İŞLEMİ</h3>
                <p>İade edilecek ürün, kargo firması aracılığıyla bize ulaştırılmalıdır. İade kargo ücreti müşteriye aittir.</p>
                
                <h3>5. İADE ÖDEMESİ</h3>
                <p>İade işlemi onaylandıktan sonra, ödeme aynı yöntemle 14 iş günü içinde iade edilir.</p>
                
                <h3>6. İADE EDİLEMEYECEK ÜRÜNLER</h3>
                <p>Kişiye özel üretilen, kullanılmış veya hasar görmüş ürünler iade edilemez.</p>
                """;
    }

    private String getShippingPolicyContent() {
        return """
                <h2>KARGO VE TESLİMAT KOŞULLARI</h2>
                
                <h3>1. TESLİMAT BÖLGELERİ</h3>
                <p>Türkiye'nin tüm illerine kargo ile teslimat yapılmaktadır.</p>
                
                <h3>2. TESLİMAT SÜRESİ</h3>
                <p>Ürünler, sipariş onayından sonra 1-3 iş günü içinde kargoya verilir. Teslimat süresi, bölgeye göre 1-5 iş günü arasında değişmektedir.</p>
                
                <h3>3. KARGO ÜCRETİ</h3>
                <p>Kargo ücreti, sipariş tutarına ve bölgeye göre değişiklik gösterebilir. Belirli tutarın üzerindeki siparişlerde kargo ücretsizdir.</p>
                
                <h3>4. TESLİMAT KONTROLÜ</h3>
                <p>Ürünü teslim alırken, paketin hasar görmemiş olduğunu kontrol edin. Hasarlı paketleri kabul etmeyin ve kargo firmasına tutanak tutturarak bildirin.</p>
                
                <h3>5. TESLİMAT ADRESİ</h3>
                <p>Teslimat, sipariş sırasında belirttiğiniz adrese yapılır. Adres değişikliği için sipariş onayından önce müşteri hizmetlerimiz ile iletişime geçin.</p>
                
                <h3>6. TESLİMAT SORUMLULUĞU</h3>
                <p>Ürün, kargo firmasına teslim edildikten sonra sorumluluk kargo firmasına geçer.</p>
                """;
    }
}


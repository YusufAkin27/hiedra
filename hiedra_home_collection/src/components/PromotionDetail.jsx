import React from 'react'
import { useParams, Link } from 'react-router-dom'
import SEO from './SEO'
import './PromotionDetail.css'

const PromotionDetail = () => {
  const { slug } = useParams()

  const promotionData = {
    'kargo-ucretsiz': {
      title: 'Kargo Ücretsiz',
      description: 'Tüm siparişlerinizde kargo ücretsizdir. Herhangi bir minimum tutar şartı yoktur.',
      details: [
        'Tüm siparişlerde kargo ücretsizdir',
        'Minimum tutar şartı yoktur',
        'Türkiye\'nin her yerine ücretsiz kargo',
        'Kargo ücreti sipariş tutarına eklenmez',
        'Kapıda ödeme seçeneğinde de kargo ücretsizdir'
      ],
      seoTitle: 'Kargo Ücretsiz - HIEDRA HOME COLLECTION',
      seoDescription: 'Tüm siparişlerinizde kargo ücretsiz. Minimum tutar şartı yok. Türkiye\'nin her yerine ücretsiz kargo.',
      seoUrl: '/kampanya/kargo-ucretsiz'
    },
    'hizli-teslimat': {
      title: 'Hızlı Teslimat',
      description: 'Siparişleriniz en kısa sürede hazırlanır ve size ulaştırılır.',
      details: [
        'Siparişleriniz 1-3 iş günü içinde hazırlanır',
        'Kargo firmasına teslim edildikten sonra 1-3 iş günü içinde adresinize ulaşır',
        'Toplam teslimat süresi: 2-6 iş günü',
        'Acil siparişler için özel hızlı teslimat seçeneği mevcuttur',
        'Büyük şehirlerde daha hızlı teslimat yapılabilir'
      ],
      seoTitle: 'Hızlı Teslimat - HIEDRA HOME COLLECTION',
      seoDescription: 'Siparişleriniz 2-6 iş günü içinde adresinize ulaşır. Hızlı ve güvenli teslimat.',
      seoUrl: '/kampanya/hizli-teslimat'
    },
    'guvenli-odeme': {
      title: 'Güvenli Ödeme',
      description: 'Tüm ödemeleriniz SSL sertifikası ile korunur. Güvenli ödeme seçenekleri.',
      details: [
        '256-bit SSL şifreleme ile güvenli ödeme',
        'Kredi kartı bilgileriniz saklanmaz',
        '3D Secure ile ekstra güvenlik',
        'Kapıda ödeme seçeneği mevcuttur',
        'Havale/EFT ile ödeme seçeneği',
        'Tüm ödemeler banka güvencesi altındadır'
      ],
      seoTitle: 'Güvenli Ödeme - HIEDRA HOME COLLECTION',
      seoDescription: 'SSL sertifikası ile korumalı ödeme. Kredi kartı, kapıda ödeme ve havale seçenekleri.',
      seoUrl: '/kampanya/guvenli-odeme'
    },
    '14-gun-kosulsuz-iade': {
      title: '14 Gün Koşulsuz İade',
      description: 'Ürünlerinizi 14 gün içinde koşulsuz iade edebilirsiniz.',
      details: [
        '14 gün içinde iade hakkınız vardır',
        'Ürün kullanılmamış ve etiketli olmalıdır',
        'İade kargo ücreti müşteriye aittir',
        'İade işlemi 3-5 iş günü içinde tamamlanır',
        'Ödeme iade yönteminize göre geri yapılır',
        'Özel üretim ürünlerde iade geçerli değildir'
      ],
      seoTitle: '14 Gün Koşulsuz İade - HIEDRA HOME COLLECTION',
      seoDescription: '14 gün içinde koşulsuz iade hakkı. Ürünlerinizi güvenle iade edebilirsiniz.',
      seoUrl: '/kampanya/14-gun-kosulsuz-iade'
    },
    'kaliteli-urunler': {
      title: 'Kaliteli Ürünler',
      description: 'Tüm ürünlerimiz kalite standartlarına uygun olarak üretilir.',
      details: [
        'Tüm ürünler kalite kontrolünden geçer',
        'Premium kumaşlar kullanılır',
        'Uzun ömürlü ve dayanıklı ürünler',
        'CE belgeli ve standartlara uygun üretim',
        'Müşteri memnuniyeti garantisi'
      ],
      seoTitle: 'Kaliteli Ürünler - HIEDRA HOME COLLECTION',
      seoDescription: 'Premium kalitede perde ve tekstil ürünleri. Kalite garantisi ile.',
      seoUrl: '/kampanya/kaliteli-urunler'
    },
    'indirim-uygulandi': {
      title: 'İndirim Uygulandı',
      description: 'Seçili ürünlerde özel indirimler ve kampanyalar.',
      details: [
        'Sezon sonu indirimleri',
        'Yeni ürünlerde özel fiyatlar',
        'Toplu alımlarda ekstra indirim',
        'Kupon kodları ile ekstra avantajlar',
        'Düzenli kampanya ve fırsatlar'
      ],
      seoTitle: 'İndirim ve Kampanyalar - HIEDRA HOME COLLECTION',
      seoDescription: 'Özel indirimler ve kampanyalar. Seçili ürünlerde özel fiyatlar.',
      seoUrl: '/kampanya/indirim-uygulandi'
    },
    'ozel-firsatlar': {
      title: 'Özel Fırsatlar',
      description: 'Özel müşterilerimize özel fırsatlar ve avantajlar.',
      details: [
        'Üyelere özel indirimler',
        'Doğum günü hediyeleri',
        'Özel koleksiyon erişimi',
        'Erken erişim fırsatları',
        'Özel tasarım hizmetleri'
      ],
      seoTitle: 'Özel Fırsatlar - HIEDRA HOME COLLECTION',
      seoDescription: 'Üyelere özel fırsatlar ve avantajlar. Özel koleksiyon erişimi.',
      seoUrl: '/kampanya/ozel-firsatlar'
    },
    'premium-koleksiyon': {
      title: 'Premium Koleksiyon',
      description: 'Özel tasarımlı premium perde koleksiyonları.',
      details: [
        'Özel tasarım perdeler',
        'Premium kumaş seçenekleri',
        'Kişiye özel ölçü ve tasarım',
        'Lüks ve şık koleksiyonlar',
        'Uzman tasarım desteği'
      ],
      seoTitle: 'Premium Koleksiyon - HIEDRA HOME COLLECTION',
      seoDescription: 'Özel tasarım premium perde koleksiyonları. Lüks ve şık seçenekler.',
      seoUrl: '/kampanya/premium-koleksiyon'
    }
  }

  const data = promotionData[slug]

  if (!data) {
    return (
      <div className="promotion-detail-container">
        <div className="promotion-detail-content">
          <h1>Kampanya Bulunamadı</h1>
          <p>Aradığınız kampanya bulunamadı.</p>
          <Link to="/" className="back-home-btn">Ana Sayfaya Dön</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title={data.seoTitle}
        description={data.seoDescription}
        url={data.seoUrl}
      />
      <div className="promotion-detail-container">
        <div className="promotion-detail-content">
          <div className="promotion-header">
            <h1 className="promotion-title">{data.title}</h1>
            <p className="promotion-description">{data.description}</p>
          </div>

          <div className="promotion-details-section">
            <h2 className="details-title">Detaylar</h2>
            <ul className="details-list">
              {data.details.map((detail, index) => (
                <li key={index} className="detail-item">
                  <span className="detail-text">{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="promotion-actions">
            <Link to="/" className="back-home-btn">Ana Sayfaya Dön</Link>
            <Link to="/" className="shop-now-btn">Alışverişe Başla</Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default PromotionDetail


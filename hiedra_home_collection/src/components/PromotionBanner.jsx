import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './PromotionBanner.css'

const PromotionBanner = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Sadece ana sayfada göster
  if (location.pathname !== '/') {
    return null
  }

  const promotions = [
    { text: 'İndirim Uygulandı', slug: 'indirim-uygulandi' },
    { text: 'Kargo Ücretsiz', slug: 'kargo-ucretsiz' },
    { text: 'Güvenli Ödeme', slug: 'guvenli-odeme' },
    { text: '14 Gün Koşulsuz İade', slug: '14-gun-kosulsuz-iade' },
    { text: 'Kaliteli Ürünler', slug: 'kaliteli-urunler' },
    { text: 'Hızlı Teslimat', slug: 'hizli-teslimat' },
    { text: 'Özel Fırsatlar', slug: 'ozel-firsatlar' },
    { text: 'Premium Koleksiyon', slug: 'premium-koleksiyon' }
  ]

  const handlePromotionClick = (slug) => {
    navigate(`/kampanya/${slug}`)
  }

  return (
    <div className="promotion-banner-wrapper">
      <div className="promotion-banner" role="region" aria-label="Kampanya ve avantajlar">
        <div className="promotion-banner-content">
          {promotions.map((promo, index) => (
            <div 
              key={index} 
              className="promotion-item"
              onClick={() => handlePromotionClick(promo.slug)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handlePromotionClick(promo.slug)
                }
              }}
              aria-label={`${promo.text} detaylarına git`}
            >
              <span className="promotion-text">{promo.text}</span>
            </div>
          ))}
          {/* İkinci kopya - kesintisiz döngü için */}
          {promotions.map((promo, index) => (
            <div 
              key={`copy-${index}`} 
              className="promotion-item"
              onClick={() => handlePromotionClick(promo.slug)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handlePromotionClick(promo.slug)
                }
              }}
              aria-label={`${promo.text} detaylarına git`}
            >
              <span className="promotion-text">{promo.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PromotionBanner


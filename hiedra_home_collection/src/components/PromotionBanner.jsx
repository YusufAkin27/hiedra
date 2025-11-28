import React from 'react'
import { useLocation } from 'react-router-dom'
import './PromotionBanner.css'

const PromotionBanner = () => {
  const location = useLocation()
  
  // Sadece ana sayfada göster
  if (location.pathname !== '/') {
    return null
  }

  const promotions = [
    { text: 'İndirim Uygulandı' },
    { text: 'Kargo Ücretsiz' },
    { text: 'Güvenli Ödeme' },
    { text: '14 Gün Koşulsuz İade' },
    { text: 'Kaliteli Ürünler' },
    { text: 'Hızlı Teslimat' },
    { text: 'Özel Fırsatlar' },
    { text: 'Premium Koleksiyon' }
  ]

  return (
    <div className="promotion-banner-wrapper">
      <div className="promotion-banner" role="region" aria-label="Kampanya ve avantajlar">
        <div className="promotion-banner-content">
          {promotions.map((promo, index) => (
            <div key={index} className="promotion-item">
              <span className="promotion-text">{promo.text}</span>
            </div>
          ))}
          {/* İkinci kopya - kesintisiz döngü için */}
          {promotions.map((promo, index) => (
            <div key={`copy-${index}`} className="promotion-item">
              <span className="promotion-text">{promo.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PromotionBanner


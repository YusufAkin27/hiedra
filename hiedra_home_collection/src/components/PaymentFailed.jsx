import React from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import SEO from './SEO'
import './PaymentFailed.css'

const PaymentFailed = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Hata mesajını location state'ten veya sessionStorage'dan al
  let errorMessage = location.state?.errorMessage || ''
  
  if (!errorMessage) {
    try {
      const storedError = sessionStorage.getItem('paymentError')
      if (storedError) {
        errorMessage = storedError
        // Tek kullanımlık olduğu için sil
        sessionStorage.removeItem('paymentError')
      }
    } catch (e) {
      console.error('SessionStorage read error:', e)
    }
  }

  const handleRetry = () => {
    navigate('/checkout')
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Ödeme Başarısız',
    description: 'Ödeme işleminiz tamamlanamadı. Lütfen tekrar deneyiniz.'
  }

  return (
    <div className="payment-failed-container">
      <SEO
        title="Ödeme Başarısız"
        description="Ödeme işleminiz tamamlanamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz."
        keywords="ödeme hatası, ödeme başarısız, perde ödeme sorunu"
        url="/odeme-basarisiz"
        structuredData={structuredData}
      />
      
      <div className="failed-content">
        <div className="error-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <header className="failed-header">
          <h1>Ödeme İşlemi Başarısız</h1>
          <p className="failed-subtitle">Ödeme işleminiz tamamlanamadı</p>
        </header>

        <div className="error-details-card">
          <h2>Hata Detayları</h2>
          <div className="error-list">
            <div className="error-item">
              <span className="error-icon-small"></span>
              <div className="error-text">
                <p className="error-title">Ödeme Onaylanamadı</p>
                <p className="error-description">
                  {errorMessage || 'Kart bilgileriniz doğrulanamadı veya işlem reddedildi. Lütfen kart bilgilerinizi kontrol edip tekrar deneyiniz.'}
                </p>
              </div>
            </div>
          </div>

          <div className="possible-causes">
            <h3>Olası Nedenler:</h3>
            <ul>
              <li>Kart numarası, son kullanma tarihi veya CVV hatalı olabilir</li>
              <li>Kart limitiniz yetersiz olabilir</li>
              <li>İnternet bağlantınızda bir sorun olabilir</li>
              <li>Banka tarafından işlem reddedilmiş olabilir</li>
            </ul>
          </div>
        </div>

        <div className="failed-actions">
          <div className="action-buttons">
            <button onClick={handleRetry} className="btn-primary">
              Ödemeyi Tekrar Dene
            </button>
            <Link to="/cart" className="btn-secondary">
              Sepete Dön
            </Link>
            <Link to="/" className="btn-link">
              Ana Sayfaya Dön
            </Link>
          </div>
          <p className="help-text">
            Sorun devam ederse lütfen bizimle <Link to="/iletisim">iletişime geçin</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentFailed


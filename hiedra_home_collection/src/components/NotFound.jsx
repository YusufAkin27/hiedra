import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEO from './SEO'
import './NotFound.css'

const NotFound = () => {
  const navigate = useNavigate()

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '404 - Sayfa Bulunamadı | Hiedra Home Collection',
    description: 'Aradığınız sayfa bulunamadı. Ana sayfamıza dönmek için tıklayın.',
    url: typeof window !== 'undefined' ? window.location.href : 'https://hiedra.com/404'
  }

  return (
    <div className="not-found-container">
      <SEO
        title="404 - Sayfa Bulunamadı | Hiedra Home Collection"
        description="Aradığınız sayfa bulunamadı. Ana sayfamıza dönmek için tıklayın."
        keywords="404, sayfa bulunamadı"
        url="/404"
        structuredData={structuredData}
        noindex={true}
      />
      
      <div className="not-found-content">
        <div className="error-illustration">
          <div className="error-number">404</div>
          <div className="error-icon">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
              <path d="M40 40L80 80M80 40L40 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <header className="not-found-header">
          <h1>Sayfa Bulunamadı</h1>
          <p className="not-found-subtitle">
            Üzgünüz, aradığınız sayfa mevcut değil veya taşınmış olabilir.
            <br />
            Ana sayfaya dönerek istediğiniz sayfayı bulabilirsiniz.
          </p>
        </header>

        <div className="not-found-suggestions">
          <h2>Popüler Sayfalar</h2>
          <div className="suggestions-grid">
            <Link to="/" className="suggestion-card">
              <div className="suggestion-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="suggestion-content">
                <h3>Ana Sayfa</h3>
                <p>Ürün koleksiyonlarımızı keşfedin</p>
              </div>
            </Link>

            <Link to="/kategoriler" className="suggestion-card">
              <div className="suggestion-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="suggestion-content">
                <h3>Kategoriler</h3>
                <p>Tüm ürün kategorilerimizi görüntüleyin</p>
              </div>
            </Link>

            <Link to="/kuponlar" className="suggestion-card">
              <div className="suggestion-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div className="suggestion-content">
                <h3>Kuponlar</h3>
                <p>Geçerli indirim kuponlarını görüntüleyin</p>
              </div>
            </Link>

            <Link to="/hakkimizda" className="suggestion-card">
              <div className="suggestion-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="suggestion-content">
                <h3>Hakkımızda</h3>
                <p>Hiedra Home Collection hakkında bilgi</p>
              </div>
            </Link>

            <Link to="/iletisim" className="suggestion-card">
              <div className="suggestion-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="suggestion-content">
                <h3>İletişim</h3>
                <p>Bize ulaşın, sorularınızı yanıtlayalım</p>
              </div>
            </Link>

            <Link to="/sss" className="suggestion-card">
              <div className="suggestion-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="suggestion-content">
                <h3>Sık Sorulan Sorular</h3>
                <p>Merak ettiklerinizin cevapları</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="not-found-actions">
          <Link to="/" className="btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Ana Sayfaya Dön
          </Link>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Geri Git
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound


import React from 'react'
import { Link } from 'react-router-dom'
import SEO from './SEO'
import './NotFound.css'

const NotFound = () => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '404 - Sayfa Bulunamadı | Hiedra Perde',
    description: 'Aradığınız sayfa bulunamadı. Perde satış sayfamıza dönmek için tıklayın.',
    url: typeof window !== 'undefined' ? window.location.href : 'https://hiedra.com/404'
  }

  return (
    <div className="not-found-container">
      <SEO
        title="404 - Sayfa Bulunamadı | Hiedra Perde"
        description="Aradığınız sayfa bulunamadı. Perde satış sayfamıza dönmek için tıklayın."
        keywords="404, sayfa bulunamadı, perde satış"
        url="/404"
        structuredData={structuredData}
        noindex={true}
      />
      
      <div className="not-found-content">
        <div className="error-illustration">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="4" opacity="0.2"/>
            <path d="M70 70L130 130M130 70L70 130" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            <text x="100" y="160" textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor">404</text>
          </svg>
        </div>

        <header className="not-found-header">
          <h1>Sayfa Bulunamadı</h1>
          <p className="not-found-subtitle">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>
        </header>

        <div className="not-found-suggestions">
          <h2>İşte bazı yararlı linkler:</h2>
          <ul className="suggestions-list">
            <li>
              <Link to="/">Ana Sayfa - Perde Satış</Link>
              <span>Modern ve şık perde koleksiyonlarımızı keşfedin</span>
            </li>
            <li>
              <Link to="/product/1">Klasik Perde Satış</Link>
              <span>Zarif klasik perde modelleri</span>
            </li>
            <li>
              <Link to="/product/2">Dikey Stor Perde</Link>
              <span>Pratik ve modern stor perde</span>
            </li>
            <li>
              <Link to="/product/3">Zebra Perde</Link>
              <span>Modern ve şık zebra perde</span>
            </li>
            <li>
              <Link to="/product/4">Jaluzi Perde</Link>
              <span>Doğal ahşap jaluzi perde</span>
            </li>
            <li>
              <Link to="/hakkimizda">Hakkımızda</Link>
              <span>Hiedra Perde hakkında bilgi</span>
            </li>
            <li>
              <Link to="/iletisim">İletişim</Link>
              <span>Bize ulaşın</span>
            </li>
          </ul>
        </div>

        <div className="not-found-actions">
          <Link to="/" className="btn-primary">
            Ana Sayfaya Dön
          </Link>
          <button onClick={() => window.history.back()} className="btn-secondary">
            Geri Git
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound


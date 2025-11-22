import './NotFound.css'
import type { AdminPage } from '../types/navigation'

type NotFoundPageProps = {
  onNavigate?: (page: AdminPage) => void
}

function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('home')
    } else {
      window.location.href = '/'
    }
  }

  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <main className="page dashboard">
      <section className="not-found-section">
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
            <h2>Yararlı Linkler:</h2>
            <ul className="suggestions-list">
              <li>
                <button onClick={() => onNavigate?.('home')} className="suggestion-link">
                  Ana Sayfa
                </button>
                <span>Dashboard ve genel bakış</span>
              </li>
              <li>
                <button onClick={() => onNavigate?.('users')} className="suggestion-link">
                  Kullanıcılar
                </button>
                <span>Kullanıcı yönetimi</span>
              </li>
              <li>
                <button onClick={() => onNavigate?.('orders')} className="suggestion-link">
                  Siparişler
                </button>
                <span>Sipariş yönetimi</span>
              </li>
              <li>
                <button onClick={() => onNavigate?.('products')} className="suggestion-link">
                  Ürünler
                </button>
                <span>Ürün yönetimi</span>
              </li>
              <li>
                <button onClick={() => onNavigate?.('coupons')} className="suggestion-link">
                  Kuponlar
                </button>
                <span>Kupon yönetimi</span>
              </li>
            </ul>
          </div>

          <div className="not-found-actions">
            <button onClick={handleGoHome} className="btn-primary">
              Ana Sayfaya Dön
            </button>
            <button onClick={handleGoBack} className="btn-secondary">
              Geri Git
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage


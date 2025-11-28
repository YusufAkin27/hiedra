import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-content">
          {/* Logo ve Açıklama */}
          <div className="footer-section footer-about">
            <Link to="/" className="footer-logo">
              <img src="/logo.png" alt="Hiedra Home Collection" className="footer-logo-img" />
              <div className="footer-logo-text">
                <h2>HIEDRA HOME COLLECTION</h2>
              </div>
            </Link>
            <p className="footer-description">
              Modern ve şık perde koleksiyonları ile evinize değer katın.
              Kaliteli ürünler, uygun fiyatlar ve müşteri memnuniyeti odaklı hizmet.
            </p>
          </div>

          {/* Hızlı Linkler */}
          <div className="footer-section">
            <h3 className="footer-title">Hızlı Linkler</h3>
            <ul className="footer-links">
              <li>
                <Link to="/">Ana Sayfa</Link>
              </li>
              <li>
                <Link to="/hakkimizda">Hakkımızda</Link>
              </li>
              <li>
                <Link to="/iletisim">İletişim</Link>
              </li>
              <li>
                <Link to="/sss">SSS</Link>
              </li>
            </ul>
          </div>

          {/* Müşteri Hizmetleri */}
          <div className="footer-section">
            <h3 className="footer-title">Müşteri Hizmetleri</h3>
            <ul className="footer-links">
              <li>
                <Link to="/siparis-sorgula">Sipariş Sorgula</Link>
              </li>
              <li>
                <Link to="/giris">Giriş Yap</Link>
              </li>
              <li>
                <Link to="/kargo-teslimat">Kargo ve Teslimat</Link>
              </li>
              <li>
                <Link to="/iade-degisim">İade ve Değişim</Link>
              </li>
            </ul>
          </div>

          {/* Yasal Bilgiler */}
          <div className="footer-section">
            <h3 className="footer-title">Yasal Bilgiler</h3>
            <ul className="footer-links">
              <li>
                <Link to="/gizlilik-politikasi">Gizlilik Politikası</Link>
              </li>
              <li>
                <Link to="/kullanim-kosullari">Kullanım Koşulları</Link>
              </li>
              <li>
                <Link to="/kvkk">KVKK</Link>
              </li>
              <li>
                <Link to="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</Link>
              </li>
              <li>
                <Link to="/cerez-politikasi">Çerez Politikası</Link>
              </li>
              <li>
                <Link to="/sozlesmeler">Tüm Sözleşmeler</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Sosyal Medya ve Ödeme Yöntemleri */}
        <div className="footer-middle">
          <div className="footer-social">
            <h4 className="footer-middle-title">Bizi Takip Edin</h4>
            <div className="social-icons">
              <a
                href="https://www.facebook.com/HiedraHome/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon social-icon-facebook"
                aria-label="Facebook"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/hiedrahomecollection/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon social-icon-instagram"
                aria-label="Instagram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://tr.pinterest.com/hiedrahomecollection/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon social-icon-pinterest"
                aria-label="Pinterest"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.72 8.18 6.57 9.72-.09-.79-.17-2.01.03-2.87.18-.78 1.18-5.03 1.18-5.03s-.3-.6-.3-1.48c0-1.38.8-2.41 1.8-2.41.85 0 1.26.64 1.26 1.4 0 .85-.54 2.12-.82 3.3-.23.99.5 1.8 1.48 1.8 1.78 0 3.15-1.88 3.15-4.59 0-2.4-1.72-4.08-4.18-4.08-2.85 0-4.52 2.14-4.52 4.35 0 .85.33 1.76.74 2.26.08.1.09.19.07.29-.07.3-.24.95-.27 1.08-.04.18-.13.22-.3.13-1.12-.52-1.82-2.15-1.82-3.46 0-2.82 2.05-5.41 5.93-5.41 3.12 0 5.54 2.22 5.54 5.18 0 3.1-1.95 5.59-4.66 5.59-.91 0-1.77-.47-2.06-1.08l-.56 2.14c-.2.78-.74 1.76-1.1 2.36.83.26 1.71.4 2.62.4 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-payment">
            <h4 className="footer-middle-title">Güvenli Ödeme</h4>
            <div className="payment-logos">
              <div className="payment-logo-wrapper">
                <img src="/images/visa.png" alt="Visa" className="payment-logo" />
              </div>
              <div className="payment-logo-wrapper">
                <img src="/images/master.png" alt="Mastercard" className="payment-logo" />
              </div>
              <div className="payment-logo-wrapper">
                <img src="/images/troy.png" alt="Troy" className="payment-logo" />
              </div>
            </div>
          </div>
        </div>

        {/* Alt Kısım - Copyright */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} HIEDRA HOME COLLECTION. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer


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

          {/* İletişim Bilgileri */}
          <div className="footer-section">
            <h3 className="footer-title">İletişim</h3>
            <ul className="footer-contact">
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Adres Bilgileri</span>
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Telefon: +90 (XXX) XXX XX XX</span>
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>E-posta: info@hiedra.com</span>
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
                href="https://www.facebook.com"
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
                href="https://www.instagram.com"
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
                href="https://www.twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon social-icon-twitter"
                aria-label="Twitter"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon social-icon-youtube"
                aria-label="YouTube"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
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


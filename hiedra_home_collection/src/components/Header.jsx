import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const Header = () => {
  const navigate = useNavigate()
  const { getCartItemsCount } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)
  const scrollThreshold = 10 // Minimum scroll miktarı (piksel)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setShowUserMenu(false)
    setShowMoreMenu(false)
  }

  // Dışarı tıklandığında dropdown menüleri kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-wrapper')) {
        setShowUserMenu(false)
      }
      if (showMoreMenu && !event.target.closest('.more-menu-wrapper')) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu, showMoreMenu])

  // Scroll ile header'ı gizle/göster
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Sayfa en üstteyse header'ı göster
      if (currentScrollY < scrollThreshold) {
        setIsHeaderVisible(true)
        lastScrollY.current = currentScrollY
        return
      }

      // Scroll direction'ı belirle
      const scrollDifference = currentScrollY - lastScrollY.current

      // Aşağı kaydırıyorsa (scroll down) - header'ı gizle
      if (scrollDifference > scrollThreshold) {
        setIsHeaderVisible(false)
      }
      // Yukarı kaydırıyorsa (scroll up) - header'ı göster
      else if (scrollDifference < -scrollThreshold) {
        setIsHeaderVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    // Throttle ile scroll event'ini optimize et
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [])

  return (
    <>
      {/* Promosyon Barı */}
      <div className="promotion-bar">
        <div className="promotion-bar-container">
          <div className="promotion-text">
            <span>2000 TL ve üzeri alışverişlerinizde ÜCRETSİZ kargo</span>
          </div>
          <div className="promotion-phone">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>(507) 205-4460</span>
          </div>
        </div>
      </div>
      <header className={`header ${isHeaderVisible ? 'header-visible' : 'header-hidden'}`} role="banner">
        <div className="header-container">
        {/* Sol Navigasyon Linkleri */}
        <div className="nav-left">
          <Link to="/kategoriler" className="nav-link" onClick={closeMenu}>
            Tül Perde
          </Link>
          <Link to="/kategoriler" className="nav-link" onClick={closeMenu}>
            Fon Perde
          </Link>
          <Link to="/kategoriler" className="nav-link" onClick={closeMenu}>
            Mekanik Perde
          </Link>
        </div>

        {/* Logo Ortada */}
        <Link to="/" className="logo logo-center" onClick={closeMenu}>
          <div className="logo-wrapper">
            <h1 className="logo-title-center">HIEDRA</h1>
          </div>
        </Link>

        {/* Sağ Navigasyon Linkleri */}
        <div className="nav-right">
          <Link to="/kategoriler" className="nav-link" onClick={closeMenu}>
            Aksesuar
          </Link>
          <Link to="/kategoriler" className="nav-link" onClick={closeMenu}>
            Ev Tekstili
          </Link>
          <Link to="/kategoriler" className="nav-link" onClick={closeMenu}>
            Kumaş
          </Link>
        </div>

        {/* Masaüstü Navigasyon - Sağ Taraf İkonlar */}
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`} role="navigation" aria-label="Ana navigasyon">
          {/* Arama İkonu */}
          <button className="nav-icon-btn" onClick={() => navigate('/?search=')} aria-label="Ara">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          
          {/* Favori İkonu */}
          <button className="nav-icon-btn" onClick={() => navigate('/kuponlar')} aria-label="Favoriler">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="icon-badge">0</span>
          </button>
          
          {/* Daha Fazla Menüsü */}
          <div className="more-menu-wrapper">
            <button
              className={`nav-link more-link ${showMoreMenu ? 'active' : ''}`}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-label="Daha fazla menü"
            >
              Daha Fazla
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showMoreMenu && (
              <div className="more-dropdown">
                <Link
                  to="/hakkimizda"
                  className="more-dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false)
                    closeMenu()
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Hakkımızda
                </Link>
                <Link
                  to="/iletisim"
                  className="more-dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false)
                    closeMenu()
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  İletişim
                </Link>
                <Link
                  to="/sss"
                  className="more-dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false)
                    closeMenu()
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  SSS
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/siparis-sorgula"
                    className="more-dropdown-item"
                    onClick={() => {
                      setShowMoreMenu(false)
                      closeMenu()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Sipariş Sorgula
                  </Link>
                )}
                {isAuthenticated && (
                  <Link
                    to="/siparislerim"
                    className="more-dropdown-item"
                    onClick={() => {
                      setShowMoreMenu(false)
                      closeMenu()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
                      <circle cx="7" cy="20" r="2" />
                      <circle cx="17" cy="20" r="2" />
                    </svg>
                    Siparişlerim
                  </Link>
                )}
              </div>
            )}
          </div>
          {isAuthenticated ? (
            <div className="user-menu-wrapper">
              <button
                className="nav-link user-link"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="Kullanıcı menüsü"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="user-email">{user?.email || 'Kullanıcı'}</span>
              </button>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-avatar">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user?.email || 'Kullanıcı'}</div>
                    </div>
                  </div>
                  <div className="user-dropdown-divider"></div>
                  <Link
                    to="/siparislerim"
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      closeMenu()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
                      <circle cx="7" cy="20" r="2" />
                      <circle cx="17" cy="20" r="2" />
                    </svg>
                    Siparişlerim
                  </Link>
                  <Link
                    to="/profil"
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      closeMenu()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profilim
                  </Link>
                  <Link
                    to="/adreslerim"
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      closeMenu()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Adreslerim
                  </Link>
                  <Link
                    to="/yorumlarim"
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      closeMenu()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Yorumlarım
                  </Link>
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      logout()
                      setShowUserMenu(false)
                      closeMenu()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/giris"
              className="nav-link login-link"
              onClick={closeMenu}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Giriş Yap
            </Link>
          )}
          <Link to="/cart" className="nav-link cart-link" onClick={closeMenu}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
              <circle cx="7" cy="20" r="2" />
              <circle cx="17" cy="20" r="2" />
            </svg>
            {getCartItemsCount() > 0 && (
              <span className="cart-count">{getCartItemsCount()}</span>
            )}
          </Link>
        </nav>

        {/* Mobil Menü Butonu */}
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Menü">
          <span className={isMenuOpen ? 'active' : ''}></span>
          <span className={isMenuOpen ? 'active' : ''}></span>
          <span className={isMenuOpen ? 'active' : ''}></span>
        </button>
      </div>
    </header>
    </>
  )
}

export default Header

import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const Header = () => {
  const { getCartItemsCount } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)
  const scrollThreshold = 10 // Minimum scroll miktarı (piksel)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setShowUserMenu(false)
  }

  // Dışarı tıklandığında user menu'yu kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-wrapper')) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

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
    <header className={`header ${isHeaderVisible ? 'header-visible' : 'header-hidden'}`} role="banner">
      <div className="header-container">
        <Link to="/" className="logo" onClick={closeMenu}>
          <img src="/logo.png" alt="Hiedra Home Collection" className="logo-img" />
          <div className="logo-text">
            <h1>HIEDRA HOME COLLECTION</h1>
          </div>
        </Link>

        {/* Masaüstü Navigasyon */}
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`} role="navigation" aria-label="Ana navigasyon">
          <Link to="/" className="nav-link" onClick={closeMenu}>
            Ana Sayfa
          </Link>
          <Link to="/kategoriler" className="nav-link" onClick={closeMenu}>
            Kategorilerimiz
          </Link>
          <Link to="/hakkimizda" className="nav-link" onClick={closeMenu}>
            Hakkımızda
          </Link>
          <Link to="/iletisim" className="nav-link" onClick={closeMenu}>
            İletişim
          </Link>
          <Link to="/sss" className="nav-link" onClick={closeMenu}>
            SSS
          </Link>
          {!isAuthenticated && (
            <Link to="/siparis-sorgula" className="nav-link" onClick={closeMenu}>
              Sipariş Sorgula
            </Link>
          )}
          {isAuthenticated && (
            <Link to="/siparislerim" className="nav-link" onClick={closeMenu}>
              Siparişlerim
            </Link>
          )}
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
  )
}

export default Header

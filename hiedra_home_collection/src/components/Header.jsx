import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartItemsCount } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollY = useRef(0)
  const scrollThreshold = 5 // Minimum scroll miktarı (piksel) - daha hassas algılama
  const guestQuickLinks = [
    { path: '/', label: 'Ana Sayfa' },
    { path: '/iletisim', label: 'İletişim' },
    { path: '/sss', label: 'SSS' },
    { path: '/kuponlar', label: 'Kuponlar' },
    { path: '/hakkimizda', label: 'Hakkımızda' },
    { path: '/siparis-sorgula', label: 'Sipariş Sorgula' }
  ]

  const authQuickLinks = [
    { path: '/', label: 'Ana Sayfa' },
    { path: '/iletisim', label: 'İletişim' },
    { path: '/sss', label: 'SSS' },
    { path: '/kuponlar', label: 'Kuponlar' },
    { path: '/hakkimizda', label: 'Hakkımızda' }
  ]

  const quickLinks = isAuthenticated ? authQuickLinks : guestQuickLinks

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setShowUserMenu(false)
    setShowMobileUserMenu(false)
  }

  // Dışarı tıklandığında dropdown menüleri kapat
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

  // Mobil menü açıldığında body'ye class ekle
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('menu-open')
    } else {
      document.body.classList.remove('menu-open')
    }
    return () => {
      document.body.classList.remove('menu-open')
    }
  }, [isMenuOpen])

  // Scroll ile header'ı gizle/göster - sadece ana sayfada aktif
  useEffect(() => {
    // Sadece ana sayfada scroll davranışını aktif et
    const isHomePage = location.pathname === '/'
    
    if (!isHomePage) {
      setIsHeaderVisible(true)
      return
    }

    let rafId = null

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      const isScrolledNow = currentScrollY > 50
      if (isScrolledNow !== isScrolled) {
        setIsScrolled(isScrolledNow)
      }

      // Sayfa en üstteyse header'ı göster
      if (currentScrollY <= 0) {
        setIsHeaderVisible(true)
        lastScrollY.current = 0
        return
      }

      const scrollDifference = currentScrollY - lastScrollY.current

      // Aşağı kaydır = gizle, yukarı kaydır = göster
      // Daha hassas algılama için threshold düşük
      if (scrollDifference > scrollThreshold && isHeaderVisible && currentScrollY > 100) {
        setIsHeaderVisible(false)
      } else if (scrollDifference < -scrollThreshold && !isHeaderVisible) {
        setIsHeaderVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          handleScroll()
          rafId = null
        })
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [isScrolled, isHeaderVisible, scrollThreshold, location.pathname])

  // Keyboard navigation handlers
  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }


  const handleUserMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowUserMenu(false)
    }
  }

  return (
    <>
      
      <header className={`header ${isHeaderVisible ? 'header-visible' : 'header-hidden'} ${isScrolled ? 'scrolled' : ''}`} role="banner">
        <div className="header-main">
          <div className="header-container">
            <div className="logo-area">
              <button 
                className="menu-toggle" 
                onClick={toggleMenu} 
                onKeyDown={(e) => handleKeyDown(e, toggleMenu)}
                aria-label={isMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-navigation"
              >
                <span className={isMenuOpen ? 'active' : ''} aria-hidden="true"></span>
                <span className={isMenuOpen ? 'active' : ''} aria-hidden="true"></span>
                <span className={isMenuOpen ? 'active' : ''} aria-hidden="true"></span>
              </button>
              <Link 
                to="/" 
                className="logo" 
                onClick={closeMenu}
                aria-label="Hiedra ana sayfaya git"
              >
                <div className="logo-wrapper">
                  <img 
                    src="/logo.png" 
                    alt="Hiedra Home Collection Logo" 
                    className="logo-img"
                    width="50"
                    height="50"
                    loading="eager"
                  />
                  <div className="logo-text">
                    <h1 className="logo-title">HIEDRA</h1>
                    <span className="logo-subtitle">HOME COLLECTION</span>
                  </div>
                </div>
              </Link>
              {/* Mobil görünümde giriş yap butonu */}
              {!isAuthenticated && (
                <Link
                  to="/giris"
                  className="nav-link login-link mobile-login-link"
                  onClick={closeMenu}
                  aria-label="Giriş yap sayfasına git"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>Giriş Yap</span>
                </Link>
              )}
            </div>

            <div className="nav-center" aria-label="Site navigasyonu">
              <div className="desktop-quick-links">
                {quickLinks.map((link) => (
                  <Link key={link.path} to={link.path}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="nav-actions">
              {isAuthenticated ? (
                <div className="user-menu-wrapper">
                  <button
                    className="nav-link user-link"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    onKeyDown={(e) => handleKeyDown(e, () => setShowUserMenu(!showUserMenu))}
                    aria-label={`Kullanıcı menüsü, ${user?.email || 'Kullanıcı'}`}
                    aria-expanded={showUserMenu}
                    aria-haspopup="true"
                    aria-controls="user-menu"
                    id="user-menu-button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className="user-email desktop-user-email" aria-hidden="true">{user?.email || 'Kullanıcı'}</span>
                  </button>
                  {showUserMenu && (
                    <div 
                      className="user-dropdown"
                      id="user-menu"
                      role="menu"
                      aria-labelledby="user-menu-button"
                      onKeyDown={handleUserMenuKeyDown}
                    >
                      <div className="user-dropdown-header" role="presentation">
                        <div className="user-avatar" aria-hidden="true">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="user-info">
                          <div className="user-name" aria-label={`Giriş yapan kullanıcı: ${user?.email || 'Kullanıcı'}`}>
                            {user?.email || 'Kullanıcı'}
                          </div>
                        </div>
                      </div>
                      <div className="user-dropdown-divider" aria-hidden="true"></div>
                      <Link
                        to="/profil"
                        className="user-dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          setShowUserMenu(false)
                          closeMenu()
                        }}
                        aria-label="Profil sayfasına git"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Profilim</span>
                      </Link>
                      <Link
                        to="/siparislerim"
                        className="user-dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          setShowUserMenu(false)
                          closeMenu()
                        }}
                        aria-label="Siparişlerim sayfasına git"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
                          <circle cx="7" cy="20" r="2" />
                          <circle cx="17" cy="20" r="2" />
                        </svg>
                        <span>Siparişlerim</span>
                      </Link>
                      <Link
                        to="/adreslerim"
                        className="user-dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          setShowUserMenu(false)
                          closeMenu()
                        }}
                        aria-label="Adreslerim sayfasına git"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Adreslerim</span>
                      </Link>
                      <button
                        className="user-dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          logout()
                          setShowUserMenu(false)
                          closeMenu()
                        }}
                        aria-label="Hesaptan çıkış yap"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/giris"
                  className="nav-link login-link desktop-login-link"
                  onClick={closeMenu}
                  aria-label="Giriş yap sayfasına git"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>Giriş Yap</span>
                </Link>
              )}

              <Link 
                to="/cart" 
                className="nav-link cart-link" 
                onClick={closeMenu}
                aria-label={`Sepet, ${cartItemsCount > 0 ? `${cartItemsCount} ürün var` : 'Sepet boş'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
                  <circle cx="7" cy="20" r="2" />
                  <circle cx="17" cy="20" r="2" />
                </svg>
                {cartItemsCount > 0 && (
                  <span className="cart-count" aria-label={`${cartItemsCount} ürün`}>
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <nav className={`header-nav ${isMenuOpen ? 'nav-open' : ''}`} role="navigation" aria-label="Mobil navigasyon" id="mobile-navigation">
            <div className="mobile-section">
              <p className="mobile-section-title">Menü</p>
              {quickLinks.map((link) => (
                <Link key={link.path} to={link.path} onClick={closeMenu} className="nav-link mobile-nav-link">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mobile-section">
              {isAuthenticated ? (
                <>
                  <button
                    className="mobile-section-title-button"
                    onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
                    aria-expanded={showMobileUserMenu}
                    aria-label={showMobileUserMenu ? 'Hesap menüsünü kapat' : 'Hesap menüsünü aç'}
                  >
                    <span className="mobile-section-title">Hesap</span>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      className={`mobile-categories-arrow ${showMobileUserMenu ? 'active' : ''}`}
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showMobileUserMenu && (
                    <div className="mobile-user-panel">
                      <div className="mobile-user-info">
                        <span className="mobile-user-email">{user?.email}</span>
                      </div>
                      <div className="mobile-user-links">
                        <Link to="/profil" onClick={closeMenu}>Profilim</Link>
                        <Link to="/siparislerim" onClick={closeMenu}>Siparişlerim</Link>
                        <Link to="/adreslerim" onClick={closeMenu}>Adreslerim</Link>
                        <button
                          type="button"
                          onClick={() => {
                            logout()
                            closeMenu()
                          }}
                        >
                          Çıkış Yap
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/giris"
                  className="nav-link login-link mobile-nav-link"
                  onClick={closeMenu}
                  aria-label="Giriş yap sayfasına git"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>Giriş Yap</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>
    </>
  )
}

export default Header


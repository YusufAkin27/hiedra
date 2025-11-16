import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartItemsCount } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false)
  const [categories, setCategories] = useState([])
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollY = useRef(0)
  const scrollThreshold = 10 // Minimum scroll miktarı (piksel)
  
  // Sadece ana sayfada promotion bar göster
  const isHomePage = location.pathname === '/' || location.pathname === '/home'

  // Kategorileri çek
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`)
        if (response.ok) {
          const data = await response.json()
          if (data.isSuccess || data.success) {
            const categoriesList = data.data || []
            setCategories(categoriesList)
          }
        }
      } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error)
      }
    }
    fetchCategories()
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setShowUserMenu(false)
    setShowCategoriesMenu(false)
  }

  const handleCategoryClick = (categoryId, categoryName) => {
    const slug = categoryName.toLowerCase().replace(/\s+/g, '-')
    navigate(`/kategori/${categoryId}/${slug}`)
    setShowCategoriesMenu(false)
    closeMenu()
  }

  // Dışarı tıklandığında dropdown menüleri kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-wrapper')) {
        setShowUserMenu(false)
      }
      if (showCategoriesMenu && !event.target.closest('.categories-menu-wrapper')) {
        setShowCategoriesMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu, showCategoriesMenu])

  // Scroll ile header'ı gizle/göster ve blur ekle - optimize edilmiş
  useEffect(() => {
    let rafId = null
    let lastKnownScrollY = 0
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Scroll durumunu kontrol et - sadece değiştiğinde state güncelle
      const isScrolledNow = currentScrollY > 50
      if (isScrolledNow !== isScrolled) {
        setIsScrolled(isScrolledNow)
      }

      // Sayfa en üstteyse header'ı göster
      if (currentScrollY < scrollThreshold) {
        if (!isHeaderVisible) {
          setIsHeaderVisible(true)
        }
        lastScrollY.current = currentScrollY
        lastKnownScrollY = currentScrollY
        return
      }

      // Scroll direction'ı belirle - sadece önemli değişikliklerde güncelle
      const scrollDifference = currentScrollY - lastScrollY.current

      // Aşağı kaydırıyorsa (scroll down) - header'ı gizle
      if (scrollDifference > scrollThreshold && isHeaderVisible) {
        setIsHeaderVisible(false)
        lastScrollY.current = currentScrollY
      }
      // Yukarı kaydırıyorsa (scroll up) - header'ı göster
      else if (scrollDifference < -scrollThreshold && !isHeaderVisible) {
        setIsHeaderVisible(true)
        lastScrollY.current = currentScrollY
      }
      
      lastKnownScrollY = currentScrollY
    }

    // requestAnimationFrame ile optimize et - daha az main-thread work
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
  }, [isScrolled, isHeaderVisible, scrollThreshold])

  // Keyboard navigation handlers
  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  const handleCategoryKeyDown = (e, categoryId, categoryName) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCategoryClick(categoryId, categoryName)
    } else if (e.key === 'Escape') {
      setShowCategoriesMenu(false)
    }
  }

  const handleUserMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowUserMenu(false)
    }
  }

  return (
    <>
      {/* Skip to Content Link - Erişilebilirlik için */}
      <a href="#main-content" className="skip-to-content" aria-label="Ana içeriğe geç">
        Ana İçeriğe Geç
      </a>
      
      {/* Promosyon Barı - Sadece Ana Sayfada */}
      {isHomePage && (
        <div className="promotion-bar" role="banner" aria-label="Kampanya bilgileri">
          <div className="promotion-bar-container">
            <ul className="promotion-content" role="list">
              <li className="promotion-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span className="promotion-text-highlight">ÜCRETSİZ KARGO</span>
              </li>
              <li className="promotion-divider" aria-hidden="true"></li>
              <li className="promotion-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="promotion-text-highlight">14 GÜNDE KOŞULSUZ İADE</span>
              </li>
            </ul>
          </div>
        </div>
      )}
      <header className={`header ${isHeaderVisible ? 'header-visible' : 'header-hidden'} ${isScrolled ? 'scrolled' : ''} ${isHomePage ? 'header-on-home' : 'header-on-other'}`} role="banner">
        <div className="header-container">
          {/* Sol Taraf - Kategoriler */}
          <nav className="nav-left" aria-label="Kategori navigasyonu">
            <div className="categories-menu-wrapper">
              <button
                className="nav-link categories-link"
                onClick={() => setShowCategoriesMenu(!showCategoriesMenu)}
                onKeyDown={(e) => handleKeyDown(e, () => setShowCategoriesMenu(!showCategoriesMenu))}
                aria-label="Ürün kategorilerini göster"
                aria-expanded={showCategoriesMenu}
                aria-haspopup="true"
                aria-controls="categories-menu"
                id="categories-button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                <span>Kategoriler</span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={`categories-arrow ${showCategoriesMenu ? 'active' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showCategoriesMenu && categories.length > 0 && (
                <div 
                  className="categories-dropdown"
                  id="categories-menu"
                  role="menu"
                  aria-labelledby="categories-button"
                  onKeyDown={handleUserMenuKeyDown}
                >
                  {categories.map(category => (
                    <button
                      key={category.id}
                      className="category-dropdown-item"
                      role="menuitem"
                      onClick={() => handleCategoryClick(category.id, category.name)}
                      onKeyDown={(e) => handleCategoryKeyDown(e, category.id, category.name)}
                      aria-label={`${category.name} kategorisine git`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Logo Ortada */}
          <Link 
            to="/" 
            className="logo logo-center" 
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
              <h1 className="logo-title-center">HIEDRA</h1>
            </div>
          </Link>

          {/* Sağ Taraf - Giriş/Profil, Sepet */}
          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`} role="navigation" aria-label="Kullanıcı ve sepet navigasyonu">
            {/* Giriş Yap / Profil */}
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
                  <span className="user-email" aria-hidden="true">{user?.email || 'Kullanıcı'}</span>
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
                className="nav-link login-link"
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

            {/* Sepet */}
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
          </nav>

        {/* Mobil Menü Butonu */}
        <button 
          className="menu-toggle" 
          onClick={toggleMenu} 
          onKeyDown={(e) => handleKeyDown(e, toggleMenu)}
          aria-label={isMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={isMenuOpen}
          aria-controls="main-navigation"
        >
          <span className={isMenuOpen ? 'active' : ''} aria-hidden="true"></span>
          <span className={isMenuOpen ? 'active' : ''} aria-hidden="true"></span>
          <span className={isMenuOpen ? 'active' : ''} aria-hidden="true"></span>
        </button>
      </div>
    </header>
    </>
  )
}

export default Header

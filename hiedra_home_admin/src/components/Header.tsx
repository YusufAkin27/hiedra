import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { FaBars, FaSearch, FaTimes, FaUser, FaSignOutAlt, FaChevronDown } from 'react-icons/fa'
import type { AuthUser } from '../services/authService'
import type { AdminPage } from '../types/navigation'

type SearchUser = {
  id: number
  email: string
  role: string
  emailVerified: boolean
  active: boolean
  lastLoginAt?: string | null
  createdAt: string
}

type HeaderProps = {
  user: AuthUser
  onLogout: () => void
  onSidebarToggle: () => void
  accessToken: string
  onViewUser?: (userId: number) => void
  onNavigate?: (page: AdminPage) => void
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function Header({ user, onLogout, onSidebarToggle, accessToken, onViewUser, onNavigate }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const lastScrollY = useRef(0)
  const searchTimeout = useRef<number | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) {
      setSearchResults([])
      setSearchError(null)
      setShowSearchResults(false)
    } else if (value.trim().length >= 1) {
      if (searchTimeout.current) {
        window.clearTimeout(searchTimeout.current)
      }
      searchTimeout.current = window.setTimeout(() => {
        void executeSearch(value)
      }, 400)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchError(null)
    setShowSearchResults(false)
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length >= 1) {
      await executeSearch(searchQuery.trim())
    } else {
      handleClearSearch()
    }
  }

  const executeSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchError(null)
      setShowSearchResults(false)
      return
    }

    if (searchTimeout.current) {
      window.clearTimeout(searchTimeout.current)
      searchTimeout.current = null
    }

    try {
      setIsSearching(true)
      setSearchError(null)
      setShowSearchResults(true)

      const response = await fetch(`${apiBaseUrl}/admin/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Arama yapılamadı.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: SearchUser[]
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Arama yapılamadı.')
      }

      setSearchResults(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arama yapılırken bir hata oluştu.'
      setSearchError(message)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleUserClick = (userId: number) => {
    if (onViewUser) {
      onViewUser(userId)
    }
    setShowSearchResults(false)
    setSearchQuery('')
  }

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY > lastScrollY.current + 10 && currentY > 80) {
        setIsHeaderVisible(false)
      } else if (currentY < lastScrollY.current - 10) {
        setIsHeaderVisible(true)
      }
      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (searchTimeout.current) {
        window.clearTimeout(searchTimeout.current)
      }
    }
  }, [])

  // User menu dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <header className={`admin-header ${isHeaderVisible ? 'admin-header--visible' : 'admin-header--hidden'}`}>
      <div className="admin-header__content">
        <button
          type="button"
          className="admin-header__menu-toggle"
          onClick={onSidebarToggle}
          aria-label="Menüyü aç/kapat"
        >
          <FaBars />
        </button>

        <div className="admin-header__logo">
          <img 
            src="/photos/logo.png" 
            alt="Hiedra Home Logo" 
            className="admin-header__logo-img"
            style={{
              height: '40px',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        <div className="admin-header__search">
          <form onSubmit={handleSearch} className="admin-header__search-form">
            <span className="admin-header__search-icon" aria-hidden="true">
              <FaSearch />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0 || searchError) {
                  setShowSearchResults(true)
                }
              }}
              placeholder="Kullanıcı ara (e-posta, ID, rol)..."
              className="admin-header__search-input"
              aria-label="Kullanıcı ara"
            />
            {searchQuery && !isSearching && (
              <button
                type="button"
                className="admin-header__search-clear"
                onClick={handleClearSearch}
                aria-label="Arama alanını temizle"
              >
                <FaTimes />
              </button>
            )}
          </form>

          {showSearchResults && (
            <div className="admin-header__search-results">
              <div className="admin-header__search-results-header">
                <div>
                  <strong>Arama sonuçları</strong>
                  {searchQuery && (
                    <span className="admin-header__search-results-count">
                      {searchResults.length} kayıt bulundu
                    </span>
                  )}
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    className="admin-header__search-results-clear"
                    onClick={handleClearSearch}
                  >
                    Temizle
                  </button>
                )}
              </div>

              {isSearching ? (
                <div className="admin-header__search-state">Aranıyor...</div>
              ) : searchError ? (
                <div className="admin-header__search-empty">{searchError}</div>
              ) : searchResults.length === 0 ? (
                <div className="admin-header__search-empty">Sonuç bulunamadı.</div>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="admin-header__search-result-item"
                    onClick={() => handleUserClick(result.id)}
                  >
                    <div className="admin-header__search-result-info">
                      <span className="admin-header__search-result-email">{result.email}</span>
                      <div className="admin-header__search-result-meta">
                        <span className="admin-header__search-result-id">ID: {result.id}</span>
                        <span className="admin-header__search-result-role">{result.role}</span>
                      </div>
                    </div>
                    <span className={`admin-header__search-result-status ${result.active ? 'active' : 'inactive'}`}>
                      {result.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

        </div>

        <div className="admin-header__user" ref={userMenuRef}>
          <button
            type="button"
            className="admin-header__user-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="Kullanıcı menüsü"
          >
            <div className="admin-header__user-avatar">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <span className="admin-header__user-email">{user.email}</span>
            <FaChevronDown className={`admin-header__user-chevron ${showUserMenu ? 'admin-header__user-chevron--open' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="admin-header__user-menu">
              <div className="admin-header__user-menu-header">
                <div className="admin-header__user-menu-avatar">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="admin-header__user-menu-info">
                  <div className="admin-header__user-menu-email">{user.email}</div>
                  <div className="admin-header__user-menu-role">{user.role}</div>
                </div>
              </div>
              <div className="admin-header__user-menu-divider"></div>
              <button
                type="button"
                className="admin-header__user-menu-item"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('profile' as any)
                  }
                  setShowUserMenu(false)
                }}
              >
                <FaUser />
                <span>Profilim</span>
              </button>
              <div className="admin-header__user-menu-divider"></div>
              <button
                type="button"
                className="admin-header__user-menu-item admin-header__user-menu-item--danger"
                onClick={() => {
                  setShowUserMenu(false)
                  onLogout()
                }}
              >
                <FaSignOutAlt />
                <span>Çıkış Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header


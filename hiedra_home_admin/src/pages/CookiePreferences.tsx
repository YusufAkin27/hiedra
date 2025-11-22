import { useEffect, useState } from 'react'
import { FaCheckCircle, FaChartBar, FaBullhorn, FaLock, FaGlobe, FaClipboard, FaTable, FaEye, FaTrash, FaTimes, FaCalendar, FaUser } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type CookiePreferencesPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
}

type CookiePreference = {
  id: number
  userId?: number | null
  userEmail?: string | null
  sessionId?: string | null
  ipAddress?: string | null
  necessary: boolean
  analytics: boolean
  marketing: boolean
  consentGiven: boolean
  consentDate: string
  updatedAt: string
  userAgent?: string | null
}

type ViewMode = 'table' | 'cards'

type CookieStats = {
  total: number
  withUser: number
  withSession: number
  withIpOnly: number
  analyticsEnabled: number
  marketingEnabled: number
  consentGiven: number
  analyticsPercentage: number
  marketingPercentage: number
  consentPercentage: number
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function CookiePreferencesPage({ session, toast }: CookiePreferencesPageProps) {
  const [cookies, setCookies] = useState<CookiePreference[]>([])
  const [stats, setStats] = useState<CookieStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const pageSize = 20
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [search, setSearch] = useState('')
  const [analyticsFilter, setAnalyticsFilter] = useState<boolean | null>(null)
  const [marketingFilter, setMarketingFilter] = useState<boolean | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedCookie, setSelectedCookie] = useState<CookiePreference | null>(null)

  useEffect(() => {
    fetchCookies()
    fetchStats()
  }, [session.accessToken, page, search, analyticsFilter, marketingFilter])

  const fetchCookies = async () => {
    try {
      setIsLoading(true)

      let url = `${apiBaseUrl}/admin/cookies?page=${page}&size=${pageSize}&sort=updatedAt,DESC`
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }
      if (analyticsFilter !== null) {
        url += `&analytics=${analyticsFilter}`
      }
      if (marketingFilter !== null) {
        url += `&marketing=${marketingFilter}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Çerez tercihleri yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: {
          cookies: CookiePreference[]
          totalElements: number
          totalPages: number
          currentPage: number
          size: number
        }
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Çerez tercihleri yüklenemedi.')
      }

      setCookies(payload.data.cookies)
      setTotalPages(payload.data.totalPages)
      setTotalElements(payload.data.totalElements)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/cookies/stats`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('İstatistikler yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: CookieStats
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'İstatistikler yüklenemedi.')
      }

      setStats(payload.data)
    } catch (err) {
      console.error('Stats fetch error:', err)
    } finally {
      // no-op
    }
  }

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; cookieId: number | null }>({
    isOpen: false,
    cookieId: null,
  })

  const handleDeleteClick = (id: number) => {
    setDeleteModal({ isOpen: true, cookieId: id })
  }

  const handleDelete = async () => {
    if (!deleteModal.cookieId) {
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/cookies/${deleteModal.cookieId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Çerez tercihi silinemedi.')
      }

      toast.success('Çerez tercihi başarıyla silindi.')
      setDeleteModal({ isOpen: false, cookieId: null })
      fetchCookies()
      fetchStats()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(message)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Panoya kopyalandı')
    })
  }

  // Time ago utility
  const getTimeAgo = (date: string): string => {
    const now = new Date()
    const cookieDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - cookieDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Az önce'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`
    return cookieDate.toLocaleDateString('tr-TR')
  }

  // Get browser name
  const getBrowserName = (userAgent?: string | null): string => {
    if (!userAgent) return 'Bilinmiyor'
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    if (userAgent.includes('Opera')) return 'Opera'
    return 'Diğer'
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  if (isLoading && cookies.length === 0) {
    return (
      <main className="page dashboard">
        <p>Yükleniyor...</p>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Çerez Yönetimi</p>
          <h1>Çerez Tercihleri</h1>
          <p>Kullanıcıların çerez tercihlerini görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      {stats && (
        <section className="dashboard__grid cookie-preferences-stats" style={{ marginBottom: '2rem' }}>
          <article className="dashboard-card">
            <h3 className="cookie-preferences-stats__title">Genel İstatistikler</h3>
            <div className="cookie-preferences-stats__grid">
              <div className="cookie-preferences-stat-card cookie-preferences-stat-card--primary">
                <div className="cookie-preferences-stat-card__icon">🍪</div>
                <div className="cookie-preferences-stat-card__value">{stats.total}</div>
                <div className="cookie-preferences-stat-card__label">Toplam Tercih</div>
                <div className="cookie-preferences-stat-card__subtitle">Tüm kayıtlar</div>
              </div>
              <div className="cookie-preferences-stat-card cookie-preferences-stat-card--success">
                <div className="cookie-preferences-stat-card__icon"><FaCheckCircle /></div>
                <div className="cookie-preferences-stat-card__value">{stats.consentGiven}</div>
                <div className="cookie-preferences-stat-card__label">Onay Veren</div>
                <div className="cookie-preferences-stat-card__subtitle">{stats.consentPercentage.toFixed(1)}%</div>
              </div>
              <div className="cookie-preferences-stat-card cookie-preferences-stat-card--info">
                <div className="cookie-preferences-stat-card__icon"><FaChartBar /></div>
                <div className="cookie-preferences-stat-card__value">{stats.analyticsEnabled}</div>
                <div className="cookie-preferences-stat-card__label">Analytics Aktif</div>
                <div className="cookie-preferences-stat-card__subtitle">{stats.analyticsPercentage.toFixed(1)}%</div>
              </div>
              <div className="cookie-preferences-stat-card cookie-preferences-stat-card--warning">
                <div className="cookie-preferences-stat-card__icon"><FaBullhorn /></div>
                <div className="cookie-preferences-stat-card__value">{stats.marketingEnabled}</div>
                <div className="cookie-preferences-stat-card__label">Marketing Aktif</div>
                <div className="cookie-preferences-stat-card__subtitle">{stats.marketingPercentage.toFixed(1)}%</div>
              </div>
              <div className="cookie-preferences-stat-card cookie-preferences-stat-card--info">
                <div className="cookie-preferences-stat-card__icon"><FaUser /></div>
                <div className="cookie-preferences-stat-card__value">{stats.withUser}</div>
                <div className="cookie-preferences-stat-card__label">Giriş Yapmış</div>
                <div className="cookie-preferences-stat-card__subtitle">Kullanıcılar</div>
              </div>
              <div className="cookie-preferences-stat-card cookie-preferences-stat-card--info">
                <div className="cookie-preferences-stat-card__icon"><FaLock /></div>
                <div className="cookie-preferences-stat-card__value">{stats.withSession}</div>
                <div className="cookie-preferences-stat-card__label">Session ID</div>
                <div className="cookie-preferences-stat-card__subtitle">Oturumlar</div>
              </div>
              <div className="cookie-preferences-stat-card cookie-preferences-stat-card--info">
                <div className="cookie-preferences-stat-card__icon"><FaGlobe /></div>
                <div className="cookie-preferences-stat-card__value">{stats.withIpOnly}</div>
                <div className="cookie-preferences-stat-card__label">Sadece IP</div>
                <div className="cookie-preferences-stat-card__subtitle">Anonim</div>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Filtreler */}
      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <div className="cookie-preferences-filters">
            <div className="cookie-preferences-filters__row">
              <div className="cookie-preferences-filters__search">
                <input
                  type="text"
                  className="cookie-preferences-filters__input"
                  placeholder="IP, Session ID veya Email ara..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(0)
                  }}
                />
              </div>
              <div className="cookie-preferences-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary cookie-preferences-view-toggle cookie-preferences-view-toggle--desktop"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                >
                  {viewMode === 'table' ? <><FaTable style={{ marginRight: '0.5rem' }} /> Kart</> : <><FaClipboard style={{ marginRight: '0.5rem' }} /> Tablo</>}
                </button>
                {search && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setSearch('')
                      setPage(0)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
            <div className="cookie-preferences-filters__row">
              <div className="cookie-preferences-filters__field">
                <label className="cookie-preferences-filters__label">Analytics</label>
                <select
                  className="cookie-preferences-filters__select"
                  value={analyticsFilter === null ? 'all' : analyticsFilter ? 'true' : 'false'}
                  onChange={(e) => {
                    setAnalyticsFilter(e.target.value === 'all' ? null : e.target.value === 'true')
                    setPage(0)
                  }}
                >
                  <option value="all">Tümü</option>
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>
              <div className="cookie-preferences-filters__field">
                <label className="cookie-preferences-filters__label">Marketing</label>
                <select
                  className="cookie-preferences-filters__select"
                  value={marketingFilter === null ? 'all' : marketingFilter ? 'true' : 'false'}
                  onChange={(e) => {
                    setMarketingFilter(e.target.value === 'all' ? null : e.target.value === 'true')
                    setPage(0)
                  }}
                >
                  <option value="all">Tümü</option>
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="cookie-preferences-header">
            <div className="cookie-preferences-header__info">
              <span className="cookie-preferences-header__count">
                Toplam: <strong>{totalElements}</strong> kayıt
              </span>
            </div>
            <div className="cookie-preferences-header__pagination">
              Sayfa {page + 1} / {totalPages || 1}
            </div>
          </div>

          {isLoading ? (
            <p className="dashboard-card__empty">Yükleniyor...</p>
          ) : cookies.length === 0 ? (
            <p className="dashboard-card__empty">Çerez tercihi bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table cookie-preferences-table-desktop ${viewMode === 'table' ? '' : 'cookie-preferences-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Kullanıcı</th>
                      <th>Session ID</th>
                      <th>IP Adresi</th>
                      <th>Analytics</th>
                      <th>Marketing</th>
                      <th>Onay Tarihi</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookies.map((cookie) => (
                      <tr key={cookie.id}>
                        <td>
                          <div className="cookie-preferences-table__id">#{cookie.id}</div>
                        </td>
                        <td>
                          <div className="cookie-preferences-table__user">
                            {cookie.userEmail ? (
                              <div className="cookie-preferences-table__user-email">{cookie.userEmail}</div>
                            ) : (
                              <div className="cookie-preferences-table__user-anonymous">Anonim</div>
                            )}
                            {cookie.userId && (
                              <div className="cookie-preferences-table__user-id">ID: {cookie.userId}</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="cookie-preferences-table__session">
                            {cookie.sessionId ? (
                              <>
                                <span className="cookie-preferences-table__session-value" title={cookie.sessionId}>
                                  {cookie.sessionId.length > 20 ? cookie.sessionId.substring(0, 20) + '...' : cookie.sessionId}
                                </span>
                                <button
                                  type="button"
                                  className="cookie-preferences-table__copy-btn"
                                  onClick={() => copyToClipboard(cookie.sessionId!)}
                                  title="Kopyala"
                                >
                                  <FaClipboard />
                                </button>
                              </>
                            ) : (
                              <span className="cookie-preferences-table__session-empty">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="cookie-preferences-table__ip">
                            {cookie.ipAddress ? (
                              <>
                                <span className="cookie-preferences-table__ip-value">{cookie.ipAddress}</span>
                                <button
                                  type="button"
                                  className="cookie-preferences-table__copy-btn"
                                  onClick={() => copyToClipboard(cookie.ipAddress!)}
                                  title="Kopyala"
                                >
                                  <FaClipboard />
                                </button>
                              </>
                            ) : (
                              <span className="cookie-preferences-table__ip-empty">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`cookie-preferences-table__badge ${cookie.analytics ? 'cookie-preferences-table__badge--success' : 'cookie-preferences-table__badge--disabled'}`}>
                            {cookie.analytics ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> Pasif</>}
                          </span>
                        </td>
                        <td>
                          <span className={`cookie-preferences-table__badge ${cookie.marketing ? 'cookie-preferences-table__badge--success' : 'cookie-preferences-table__badge--disabled'}`}>
                            {cookie.marketing ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> Pasif</>}
                          </span>
                        </td>
                        <td>
                          <div className="cookie-preferences-table__date">
                            {formatDate(cookie.consentDate)}
                          </div>
                        </td>
                        <td>
                          <div className="cookie-preferences-table__actions">
                            <button
                              type="button"
                              className="cookie-preferences-table__btn cookie-preferences-table__btn--info"
                              onClick={() => setSelectedCookie(cookie)}
                              title="Detayları Gör"
                            >
                              <FaEye />
                            </button>
                            <button
                              type="button"
                              className="cookie-preferences-table__btn cookie-preferences-table__btn--danger"
                              onClick={() => handleDeleteClick(cookie.id)}
                              title="Sil"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`cookie-preferences-cards ${viewMode === 'cards' ? '' : 'cookie-preferences-cards--hidden'}`}>
                {cookies.map((cookie) => (
                  <div key={cookie.id} className="cookie-preference-card">
                    <div className="cookie-preference-card__header">
                      <div className="cookie-preference-card__header-left">
                        <div className="cookie-preference-card__id">#{cookie.id}</div>
                        {cookie.userEmail && (
                          <div className="cookie-preference-card__user">{cookie.userEmail}</div>
                        )}
                      </div>
                      <div className="cookie-preference-card__header-right">
                        {cookie.consentGiven && (
                          <span className="cookie-preference-card__consent-badge"><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Onaylı</span>
                        )}
                      </div>
                    </div>
                    <div className="cookie-preference-card__body">
                      {cookie.userId && (
                        <div className="cookie-preference-card__row">
                          <div className="cookie-preference-card__icon"><FaUser /></div>
                          <div className="cookie-preference-card__content">
                            <div className="cookie-preference-card__label">Kullanıcı ID</div>
                            <div className="cookie-preference-card__value">{cookie.userId}</div>
                          </div>
                        </div>
                      )}
                      {cookie.sessionId && (
                        <div className="cookie-preference-card__row">
                          <div className="cookie-preference-card__icon"><FaLock /></div>
                          <div className="cookie-preference-card__content">
                            <div className="cookie-preference-card__label">Session ID</div>
                            <div className="cookie-preference-card__value-group">
                              <span className="cookie-preference-card__value cookie-preference-card__value--session" title={cookie.sessionId}>
                                {cookie.sessionId.length > 30 ? cookie.sessionId.substring(0, 30) + '...' : cookie.sessionId}
                              </span>
                              <button
                                type="button"
                                className="cookie-preference-card__copy-btn"
                                onClick={() => copyToClipboard(cookie.sessionId!)}
                                title="Kopyala"
                              >
                                <FaClipboard />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {cookie.ipAddress && (
                        <div className="cookie-preference-card__row">
                          <div className="cookie-preference-card__icon"><FaGlobe /></div>
                          <div className="cookie-preference-card__content">
                            <div className="cookie-preference-card__label">IP Adresi</div>
                            <div className="cookie-preference-card__value-group">
                              <span className="cookie-preference-card__value cookie-preference-card__value--ip">{cookie.ipAddress}</span>
                              <button
                                type="button"
                                className="cookie-preference-card__copy-btn"
                                onClick={() => copyToClipboard(cookie.ipAddress!)}
                                title="Kopyala"
                              >
                                <FaClipboard />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="cookie-preference-card__row">
                        <div className="cookie-preference-card__icon"><FaChartBar /></div>
                        <div className="cookie-preference-card__content">
                          <div className="cookie-preference-card__label">Tercihler</div>
                          <div className="cookie-preference-card__preferences">
                            <span className={`cookie-preference-card__preference-badge ${cookie.necessary ? 'cookie-preference-card__preference-badge--success' : 'cookie-preference-card__preference-badge--disabled'}`}>
                              {cookie.necessary ? <FaCheckCircle style={{ marginRight: '0.25rem' }} /> : <FaTimes style={{ marginRight: '0.25rem' }} />} Gerekli
                            </span>
                            <span className={`cookie-preference-card__preference-badge ${cookie.analytics ? 'cookie-preference-card__preference-badge--success' : 'cookie-preference-card__preference-badge--disabled'}`}>
                              {cookie.analytics ? <FaCheckCircle style={{ marginRight: '0.25rem' }} /> : <FaTimes style={{ marginRight: '0.25rem' }} />} Analytics
                            </span>
                            <span className={`cookie-preference-card__preference-badge ${cookie.marketing ? 'cookie-preference-card__preference-badge--success' : 'cookie-preference-card__preference-badge--disabled'}`}>
                              {cookie.marketing ? <FaCheckCircle style={{ marginRight: '0.25rem' }} /> : <FaTimes style={{ marginRight: '0.25rem' }} />} Marketing
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="cookie-preference-card__row">
                        <div className="cookie-preference-card__icon"><FaCalendar /></div>
                        <div className="cookie-preference-card__content">
                          <div className="cookie-preference-card__label">Onay Tarihi</div>
                          <div className="cookie-preference-card__value">
                            {formatDate(cookie.consentDate)}
                          </div>
                          <div className="cookie-preference-card__subvalue">{getTimeAgo(cookie.consentDate)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="cookie-preference-card__actions">
                      <button
                        type="button"
                        className="cookie-preference-card__btn cookie-preference-card__btn--info"
                        onClick={() => setSelectedCookie(cookie)}
                      >
                        <FaEye style={{ marginRight: '0.25rem' }} /> Detay
                      </button>
                      <button
                        type="button"
                        className="cookie-preference-card__btn cookie-preference-card__btn--danger"
                        onClick={() => handleDeleteClick(cookie.id)}
                      >
                        <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="cookie-preferences-pagination">
                  <button
                    type="button"
                    className="cookie-preferences-pagination__btn"
                    onClick={() => setPage(0)}
                    disabled={page === 0}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="cookie-preferences-pagination__btn"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    Önceki
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i
                    } else if (page <= 2) {
                      pageNum = i
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 5 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={`cookie-preferences-pagination__btn cookie-preferences-pagination__btn--number ${
                          page === pageNum ? 'cookie-preferences-pagination__btn--active' : ''
                        }`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="cookie-preferences-pagination__btn"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="cookie-preferences-pagination__btn"
                    onClick={() => setPage(totalPages - 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Son
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </section>

      {/* Çerez Detay Modal */}
      {selectedCookie && (
        <div
          className="cookie-preference-modal-overlay"
          onClick={() => setSelectedCookie(null)}
        >
          <div
            className="cookie-preference-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cookie-preference-modal__header">
              <h2 className="cookie-preference-modal__title">🍪 Çerez Tercihi Detayı</h2>
              <button
                type="button"
                className="cookie-preference-modal__close"
                onClick={() => setSelectedCookie(null)}
              >
                ✕
              </button>
            </div>
            <div className="cookie-preference-modal__content">
              <div className="cookie-preference-modal__info-grid">
                <div className="cookie-preference-modal__info-item">
                  <div className="cookie-preference-modal__info-label">Çerez ID</div>
                  <div className="cookie-preference-modal__info-value">#{selectedCookie.id}</div>
                </div>
                {selectedCookie.userEmail && (
                  <div className="cookie-preference-modal__info-item">
                    <div className="cookie-preference-modal__info-label">Kullanıcı</div>
                    <div className="cookie-preference-modal__info-value-group">
                      <span className="cookie-preference-modal__info-value cookie-preference-modal__info-value--email">{selectedCookie.userEmail}</span>
                      <button
                        type="button"
                        className="cookie-preference-modal__copy-btn"
                        onClick={() => copyToClipboard(selectedCookie.userEmail!)}
                        title="Kopyala"
                      >
                        <FaClipboard />
                      </button>
                    </div>
                    {selectedCookie.userId && (
                      <div className="cookie-preference-modal__info-subvalue">ID: {selectedCookie.userId}</div>
                    )}
                  </div>
                )}
                {selectedCookie.sessionId && (
                  <div className="cookie-preference-modal__info-item">
                    <div className="cookie-preference-modal__info-label">Session ID</div>
                    <div className="cookie-preference-modal__info-value-group">
                      <span className="cookie-preference-modal__info-value cookie-preference-modal__info-value--session" title={selectedCookie.sessionId}>
                        {selectedCookie.sessionId.length > 40 ? selectedCookie.sessionId.substring(0, 40) + '...' : selectedCookie.sessionId}
                      </span>
                      <button
                        type="button"
                        className="cookie-preference-modal__copy-btn"
                        onClick={() => copyToClipboard(selectedCookie.sessionId!)}
                        title="Kopyala"
                      >
                        <FaClipboard />
                      </button>
                    </div>
                  </div>
                )}
                {selectedCookie.ipAddress && (
                  <div className="cookie-preference-modal__info-item">
                    <div className="cookie-preference-modal__info-label">IP Adresi</div>
                    <div className="cookie-preference-modal__info-value-group">
                      <span className="cookie-preference-modal__info-value cookie-preference-modal__info-value--ip">{selectedCookie.ipAddress}</span>
                      <button
                        type="button"
                        className="cookie-preference-modal__copy-btn"
                        onClick={() => copyToClipboard(selectedCookie.ipAddress!)}
                        title="Kopyala"
                      >
                        <FaClipboard />
                      </button>
                    </div>
                  </div>
                )}
                {selectedCookie.userAgent && (
                  <div className="cookie-preference-modal__info-item">
                    <div className="cookie-preference-modal__info-label">Tarayıcı</div>
                    <div className="cookie-preference-modal__info-value">
                      <div className="cookie-preference-modal__browser-name">{getBrowserName(selectedCookie.userAgent)}</div>
                      <div className="cookie-preference-modal__browser-ua" title={selectedCookie.userAgent}>
                        {selectedCookie.userAgent.length > 60 ? selectedCookie.userAgent.substring(0, 60) + '...' : selectedCookie.userAgent}
                      </div>
                    </div>
                  </div>
                )}
                <div className="cookie-preference-modal__info-item">
                  <div className="cookie-preference-modal__info-label">Onay Durumu</div>
                  <div className="cookie-preference-modal__info-value">
                    <span className={`cookie-preference-modal__consent-badge ${selectedCookie.consentGiven ? 'cookie-preference-modal__consent-badge--success' : 'cookie-preference-modal__consent-badge--error'}`}>
                      {selectedCookie.consentGiven ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Onay Verildi</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> Onay Verilmedi</>}
                    </span>
                  </div>
                </div>
                <div className="cookie-preference-modal__info-item">
                  <div className="cookie-preference-modal__info-label">Onay Tarihi</div>
                  <div className="cookie-preference-modal__info-value cookie-preference-modal__info-value--date">
                    {new Date(selectedCookie.consentDate).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="cookie-preference-modal__info-subvalue">{getTimeAgo(selectedCookie.consentDate)}</div>
                </div>
                <div className="cookie-preference-modal__info-item">
                  <div className="cookie-preference-modal__info-label">Güncelleme Tarihi</div>
                  <div className="cookie-preference-modal__info-value cookie-preference-modal__info-value--date">
                    {new Date(selectedCookie.updatedAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="cookie-preference-modal__info-subvalue">{getTimeAgo(selectedCookie.updatedAt)}</div>
                </div>
              </div>

              <div className="cookie-preference-modal__section">
                <div className="cookie-preference-modal__section-label">ÇEREZ TERCİHLERİ</div>
                <div className="cookie-preference-modal__preferences">
                  <div className="cookie-preference-modal__preference-item">
                    <div className="cookie-preference-modal__preference-label">Gerekli Çerezler</div>
                    <span className={`cookie-preference-modal__preference-badge ${selectedCookie.necessary ? 'cookie-preference-modal__preference-badge--success' : 'cookie-preference-modal__preference-badge--disabled'}`}>
                      {selectedCookie.necessary ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> Pasif</>}
                    </span>
                  </div>
                  <div className="cookie-preference-modal__preference-item">
                    <div className="cookie-preference-modal__preference-label">Analytics Çerezleri</div>
                    <span className={`cookie-preference-modal__preference-badge ${selectedCookie.analytics ? 'cookie-preference-modal__preference-badge--success' : 'cookie-preference-modal__preference-badge--disabled'}`}>
                      {selectedCookie.analytics ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> Pasif</>}
                    </span>
                  </div>
                  <div className="cookie-preference-modal__preference-item">
                    <div className="cookie-preference-modal__preference-label">Marketing Çerezleri</div>
                    <span className={`cookie-preference-modal__preference-badge ${selectedCookie.marketing ? 'cookie-preference-modal__preference-badge--success' : 'cookie-preference-modal__preference-badge--disabled'}`}>
                      {selectedCookie.marketing ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> Pasif</>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="cookie-preference-modal__actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    handleDeleteClick(selectedCookie.id)
                    setSelectedCookie(null)
                  }}
                >
                  <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedCookie(null)}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        message="Bu çerez tercihini silmek istediğinizden emin misiniz?"
        type="confirm"
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, cookieId: null })}
      />
    </main>
  )
}

export default CookiePreferencesPage


import { useEffect, useState } from 'react'
import { FaGlobe, FaEye, FaChartBar, FaClipboard, FaTable, FaCalendar, FaBolt, FaUsers, FaFileAlt } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'

type VisitorsPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
}

type ActiveVisitor = {
  id: number
  ipAddress: string
  userAgent?: string
  sessionId: string
  firstSeenAt: string
  lastActivityAt: string
  pageViews: number
  currentPage?: string
}

type VisitorStats = {
  activeVisitorsNow: number
  activeVisitorsLastHour: number
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function VisitorsPage({ session, toast }: VisitorsPageProps) {
  const [visitors, setVisitors] = useState<ActiveVisitor[]>([])
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedVisitor, setSelectedVisitor] = useState<ActiveVisitor | null>(null)

  useEffect(() => {
    fetchVisitors()
    fetchStats()
    
    // Her 30 saniyede bir güncelle
    const interval = setInterval(() => {
      fetchVisitors()
      fetchStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [session.accessToken])

  const fetchVisitors = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/visitors/active`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: ActiveVisitor[]
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setVisitors(payload.data)
        }
      }
    } catch (err) {
      console.error('Ziyaretçiler yüklenemedi:', err)
      toast.error('Ziyaretçiler yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/visitors/stats`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: VisitorStats
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setStats(payload.data)
        }
      }
    } catch (err) {
      console.error('İstatistikler yüklenemedi:', err)
      toast.error('İstatistikler yüklenemedi')
    }
  }

  // Filtreleme ve sayfalama
  const filteredVisitors = visitors.filter((visitor) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        visitor.ipAddress.includes(search) ||
        (visitor.userAgent && visitor.userAgent.toLowerCase().includes(search)) ||
        (visitor.currentPage && visitor.currentPage.toLowerCase().includes(search)) ||
        visitor.sessionId.includes(search) ||
        visitor.id.toString().includes(search)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredVisitors.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedVisitors = filteredVisitors.slice(startIndex, endIndex)

  // İstatistikler
  const extendedStats = {
    ...stats,
    total: visitors.length,
    totalPageViews: visitors.reduce((sum, v) => sum + v.pageViews, 0),
    averagePageViews: visitors.length > 0 ? (visitors.reduce((sum, v) => sum + v.pageViews, 0) / visitors.length).toFixed(1) : '0',
    uniqueIPs: new Set(visitors.map((v) => v.ipAddress)).size,
  }

  // User Agent'dan tarayıcı adını çıkarma
  const getBrowserName = (userAgent?: string) => {
    if (!userAgent) return 'Bilinmiyor'
    const ua = userAgent.toLowerCase()
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome'
    if (ua.includes('firefox')) return 'Firefox'
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
    if (ua.includes('edg')) return 'Edge'
    if (ua.includes('opera') || ua.includes('opr')) return 'Opera'
    return 'Diğer'
  }

  // IP adresini kopyalama
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Kopyalandı!')
    })
  }

  // Son aktivite zamanını hesaplama
  const getTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffSecs = Math.floor((diffMs % 60000) / 1000)

    if (diffMins < 1) {
      return `${diffSecs} saniye önce`
    } else if (diffMins < 60) {
      return `${diffMins} dakika önce`
    } else {
      const diffHours = Math.floor(diffMins / 60)
      return `${diffHours} saat önce`
    }
  }

  if (isLoading) {
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
          <p className="dashboard__eyebrow">Ziyaretçi Takibi</p>
          <h1>Anlık Ziyaretçiler</h1>
          <p>Web sitesini şu anda ziyaret eden kullanıcıları görüntüleyin ve analiz edin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid visitors-stats" style={{ marginBottom: '2rem' }}>
        {extendedStats && (
          <>
            <article className="dashboard-card">
              <h3 className="visitors-stats__title">Genel İstatistikler</h3>
              <div className="visitors-stats__grid">
                <div className="visitors-stat-card visitors-stat-card--danger">
                  <div className="visitors-stat-card__icon"><FaBolt /></div>
                  <div className="visitors-stat-card__value">{extendedStats.activeVisitorsNow}</div>
                  <div className="visitors-stat-card__label">Anlık Ziyaretçi</div>
                  <div className="visitors-stat-card__subtitle">Son 5 dakika</div>
                </div>
                <div className="visitors-stat-card visitors-stat-card--warning">
                  <div className="visitors-stat-card__icon">🕐</div>
                  <div className="visitors-stat-card__value">{extendedStats.activeVisitorsLastHour}</div>
                  <div className="visitors-stat-card__label">Son 1 Saat</div>
                  <div className="visitors-stat-card__subtitle">Aktif ziyaretçi</div>
                </div>
                <div className="visitors-stat-card visitors-stat-card--primary">
                  <div className="visitors-stat-card__icon"><FaUsers /></div>
                  <div className="visitors-stat-card__value">{extendedStats.total}</div>
                  <div className="visitors-stat-card__label">Toplam Aktif</div>
                  <div className="visitors-stat-card__subtitle">Şu anda</div>
                </div>
                <div className="visitors-stat-card visitors-stat-card--success">
                  <div className="visitors-stat-card__icon"><FaGlobe /></div>
                  <div className="visitors-stat-card__value">{extendedStats.uniqueIPs}</div>
                  <div className="visitors-stat-card__label">Farklı IP</div>
                  <div className="visitors-stat-card__subtitle">Benzersiz</div>
                </div>
                <div className="visitors-stat-card visitors-stat-card--info">
                  <div className="visitors-stat-card__icon"><FaEye /></div>
                  <div className="visitors-stat-card__value">{extendedStats.totalPageViews}</div>
                  <div className="visitors-stat-card__label">Toplam Görüntüleme</div>
                  <div className="visitors-stat-card__subtitle">Sayfa görüntüleme</div>
                </div>
                <div className="visitors-stat-card visitors-stat-card--purple">
                  <div className="visitors-stat-card__icon"><FaChartBar /></div>
                  <div className="visitors-stat-card__value">{extendedStats.averagePageViews}</div>
                  <div className="visitors-stat-card__label">Ort. Görüntüleme</div>
                  <div className="visitors-stat-card__subtitle">Ziyaretçi başına</div>
                </div>
              </div>
            </article>
          </>
        )}
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <div className="visitors-filters">
            <div className="visitors-filters__row visitors-filters__row--search-only">
              <div className="visitors-filters__search">
                <input
                  type="text"
                  className="visitors-filters__input"
                  placeholder="Ziyaretçi ara (IP adresi, tarayıcı, sayfa, session ID...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="visitors-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary visitors-view-toggle visitors-view-toggle--desktop"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                >
                  {viewMode === 'table' ? <><FaTable style={{ marginRight: '0.5rem' }} /> Kart</> : <><FaChartBar style={{ marginRight: '0.5rem' }} /> Tablo</>}
                </button>
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setSearchTerm('')
                      setCurrentPage(1)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="visitors-header">
            <div className="visitors-header__info">
              <span className="visitors-header__count">
                Toplam: <strong>{filteredVisitors.length}</strong> ziyaretçi
              </span>
              {filteredVisitors.length !== visitors.length && (
                <span className="visitors-header__filtered">
                  (Filtrelenmiş: {filteredVisitors.length} / {visitors.length})
                </span>
              )}
            </div>
            <div className="visitors-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {filteredVisitors.length === 0 ? (
            <p className="dashboard-card__empty">Aktif ziyaretçi bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table visitors-table-desktop ${viewMode === 'table' ? '' : 'visitors-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>IP Adresi</th>
                      <th>Tarayıcı</th>
                      <th>Sayfa Görüntüleme</th>
                      <th>Şu Anki Sayfa</th>
                      <th>İlk Görülme</th>
                      <th>Son Aktivite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVisitors.map((visitor) => (
                      <tr key={visitor.id}>
                        <td>
                          <div className="visitors-table__ip">
                            <span>{visitor.ipAddress}</span>
                            <button
                              className="visitors-table__ip-copy"
                              onClick={() => copyToClipboard(visitor.ipAddress)}
                              title="IP'yi kopyala"
                            >
                              <FaClipboard />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="visitors-table__browser">
                            <span className="visitors-table__browser-name">{getBrowserName(visitor.userAgent)}</span>
                            {visitor.userAgent && (
                              <span className="visitors-table__browser-ua" title={visitor.userAgent}>
                                {visitor.userAgent.length > 50 ? visitor.userAgent.substring(0, 50) + '...' : visitor.userAgent}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="dashboard-card__chip dashboard-card__chip--success">
                            {visitor.pageViews}
                          </span>
                        </td>
                        <td>
                          {visitor.currentPage ? (
                            <span className="visitors-table__page">{visitor.currentPage}</span>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td>
                          <div className="visitors-table__date">
                            {new Date(visitor.firstSeenAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="visitors-table__activity">
                            <div className="visitors-table__activity-time">
                              {new Date(visitor.lastActivityAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="visitors-table__activity-ago">
                              {getTimeAgo(visitor.lastActivityAt)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`visitors-cards ${viewMode === 'cards' ? '' : 'visitors-cards--hidden'}`}>
                {paginatedVisitors.map((visitor) => (
                  <div key={visitor.id} className="visitor-card" onClick={() => setSelectedVisitor(visitor)}>
                    <div className="visitor-card__header">
                      <div className="visitor-card__header-left">
                        <div className="visitor-card__ip">
                          <FaGlobe style={{ marginRight: '0.25rem' }} /> {visitor.ipAddress}
                        </div>
                        <div className="visitor-card__meta">
                          <span className="visitor-card__badge visitor-card__badge--views">
                            <FaEye style={{ marginRight: '0.25rem' }} /> {visitor.pageViews} Görüntüleme
                          </span>
                          <span className="visitor-card__id">#{visitor.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="visitor-card__body">
                      <div className="visitor-card__row">
                        <div className="visitor-card__icon"><FaGlobe /></div>
                        <div className="visitor-card__content">
                          <div className="visitor-card__label">IP Adresi</div>
                          <div className="visitor-card__value-group">
                            <span className="visitor-card__value visitor-card__value--ip">{visitor.ipAddress}</span>
                            <button
                              type="button"
                              className="visitor-card__copy-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(visitor.ipAddress)
                              }}
                              title="Kopyala"
                            >
                              <FaClipboard />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="visitor-card__row">
                        <div className="visitor-card__icon">🌍</div>
                        <div className="visitor-card__content">
                          <div className="visitor-card__label">Tarayıcı</div>
                          <div className="visitor-card__value visitor-card__value--browser">
                            {getBrowserName(visitor.userAgent)}
                          </div>
                          {visitor.userAgent && (
                            <div className="visitor-card__user-agent" title={visitor.userAgent}>
                              {visitor.userAgent.length > 60 ? visitor.userAgent.substring(0, 60) + '...' : visitor.userAgent}
                            </div>
                          )}
                        </div>
                      </div>
                      {visitor.currentPage && (
                        <div className="visitor-card__row">
                          <div className="visitor-card__icon"><FaFileAlt /></div>
                          <div className="visitor-card__content">
                            <div className="visitor-card__label">Şu Anki Sayfa</div>
                            <div className="visitor-card__value visitor-card__value--page">{visitor.currentPage}</div>
                          </div>
                        </div>
                      )}
                      <div className="visitor-card__row">
                        <div className="visitor-card__icon"><FaCalendar /></div>
                        <div className="visitor-card__content">
                          <div className="visitor-card__label">İlk Görülme</div>
                          <div className="visitor-card__value visitor-card__value--date">
                            {new Date(visitor.firstSeenAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="visitor-card__row">
                        <div className="visitor-card__icon">🕐</div>
                        <div className="visitor-card__content">
                          <div className="visitor-card__label">Son Aktivite</div>
                          <div className="visitor-card__value visitor-card__value--date">
                            {new Date(visitor.lastActivityAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="visitor-card__time-ago">
                            {getTimeAgo(visitor.lastActivityAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="visitors-pagination">
                  <button
                    type="button"
                    className="visitors-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="visitors-pagination__btn"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={`visitors-pagination__btn visitors-pagination__btn--number ${
                          currentPage === pageNum ? 'visitors-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="visitors-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="visitors-pagination__btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Son
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </section>

      {/* Detay Modal */}
      {selectedVisitor && (
        <div
          className="visitor-modal-overlay"
          onClick={() => setSelectedVisitor(null)}
        >
          <div
            className="visitor-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="visitor-modal__header">
              <h2 className="visitor-modal__title">Ziyaretçi Detayları</h2>
              <button
                type="button"
                className="visitor-modal__close"
                onClick={() => setSelectedVisitor(null)}
              >
                ✕
              </button>
            </div>
            <div className="visitor-modal__content">
              <div className="visitor-modal__item">
                <div className="visitor-modal__label">ID</div>
                <div className="visitor-modal__value">#{selectedVisitor.id}</div>
              </div>
              <div className="visitor-modal__item">
                <div className="visitor-modal__label">IP Adresi</div>
                <div className="visitor-modal__value-group">
                  <span className="visitor-modal__value visitor-modal__value--ip">{selectedVisitor.ipAddress}</span>
                  <button
                    type="button"
                    className="visitor-modal__copy-btn"
                    onClick={() => copyToClipboard(selectedVisitor.ipAddress)}
                    title="Kopyala"
                  >
                    <FaClipboard />
                  </button>
                </div>
              </div>
              <div className="visitor-modal__item">
                <div className="visitor-modal__label">Session ID</div>
                <div className="visitor-modal__value-group">
                  <span className="visitor-modal__value visitor-modal__value--session">{selectedVisitor.sessionId}</span>
                  <button
                    type="button"
                    className="visitor-modal__copy-btn"
                    onClick={() => copyToClipboard(selectedVisitor.sessionId)}
                    title="Kopyala"
                  >
                    <FaClipboard />
                  </button>
                </div>
              </div>
              <div className="visitor-modal__item">
                <div className="visitor-modal__label">Tarayıcı</div>
                <div className="visitor-modal__value visitor-modal__value--browser">
                  {getBrowserName(selectedVisitor.userAgent)}
                </div>
              </div>
              {selectedVisitor.userAgent && (
                <div className="visitor-modal__item">
                  <div className="visitor-modal__label">User Agent</div>
                  <div className="visitor-modal__value visitor-modal__value--multiline">{selectedVisitor.userAgent}</div>
                </div>
              )}
              <div className="visitor-modal__item">
                <div className="visitor-modal__label">Sayfa Görüntüleme</div>
                <div className="visitor-modal__value">
                  <span className="dashboard-card__chip dashboard-card__chip--success">
                    {selectedVisitor.pageViews}
                  </span>
                </div>
              </div>
              {selectedVisitor.currentPage && (
                <div className="visitor-modal__item">
                  <div className="visitor-modal__label">Şu Anki Sayfa</div>
                  <div className="visitor-modal__value visitor-modal__value--page">{selectedVisitor.currentPage}</div>
                </div>
              )}
              <div className="visitor-modal__item">
                <div className="visitor-modal__label">İlk Görülme</div>
                <div className="visitor-modal__value">
                  {new Date(selectedVisitor.firstSeenAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
              <div className="visitor-modal__item">
                <div className="visitor-modal__label">Son Aktivite</div>
                <div className="visitor-modal__value">
                  {new Date(selectedVisitor.lastActivityAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
                <div className="visitor-modal__time-ago">
                  {getTimeAgo(selectedVisitor.lastActivityAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default VisitorsPage


import { useEffect, useState } from 'react'
import { FaClipboard, FaChartBar, FaCalendar, FaTable, FaEye, FaTrash, FaPlus, FaFileAlt, FaLock, FaSignOutAlt, FaEdit, FaUsers, FaCalendarAlt, FaBolt, FaUser, FaChevronDown, FaChevronRight } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'

type UserLogsPageProps = {
  session: AuthResponse
}

type UserLog = {
  userId: number
  email: string
  action: string
  timestamp: string
  details: Record<string, string>
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function UserLogsPage({ session }: UserLogsPageProps) {
  const [logs, setLogs] = useState<UserLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/admin/users/logs`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Kullanıcı işlem kayıtları yüklenemedi.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: UserLog[]
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Kullanıcı işlem kayıtları yüklenemedi.')
        }

        setLogs(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [session.accessToken])

  // Filtreleme ve sayfalama
  const filteredLogs = logs.filter((log) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        log.email.toLowerCase().includes(search) ||
        log.userId.toString().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        Object.values(log.details).some((value) => value.toLowerCase().includes(search))
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: logs.length,
    uniqueUsers: new Set(logs.map((l) => l.userId)).size,
    today: logs.filter((l) => {
      const logDate = new Date(l.timestamp)
      const today = new Date()
      return logDate.toDateString() === today.toDateString()
    }).length,
    thisWeek: logs.filter((l) => {
      const logDate = new Date(l.timestamp)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return logDate >= weekAgo
    }).length,
    uniqueActions: new Set(logs.map((l) => l.action)).size,
  }

  // Action icon mapping
  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('login') || actionLower.includes('giriş')) return <FaLock />
    if (actionLower.includes('logout') || actionLower.includes('çıkış')) return <FaSignOutAlt />
    if (actionLower.includes('register') || actionLower.includes('kayıt')) return <FaFileAlt />
    if (actionLower.includes('update') || actionLower.includes('güncelle')) return <FaEdit />
    if (actionLower.includes('delete') || actionLower.includes('sil')) return <FaTrash />
    if (actionLower.includes('create') || actionLower.includes('oluştur')) return <FaPlus />
    if (actionLower.includes('view') || actionLower.includes('görüntüle')) return <FaEye />
    return <FaClipboard />
  }

  // Action color mapping
  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('login') || actionLower.includes('giriş')) return 'success'
    if (actionLower.includes('logout') || actionLower.includes('çıkış')) return 'info'
    if (actionLower.includes('register') || actionLower.includes('kayıt')) return 'primary'
    if (actionLower.includes('update') || actionLower.includes('güncelle')) return 'warning'
    if (actionLower.includes('delete') || actionLower.includes('sil')) return 'danger'
    if (actionLower.includes('create') || actionLower.includes('oluştur')) return 'success'
    return 'secondary'
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedLogs(newExpanded)
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <p>Yükleniyor...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page dashboard">
        <p className="dashboard-card__feedback dashboard-card__feedback--error">{error}</p>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Kullanıcı İşlem Kayıtları</p>
          <h1>Kullanıcı Aktivite Kayıtları</h1>
          <p>Kullanıcı aktivitelerini ve giriş kayıtlarını görüntüleyin ve analiz edin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid user-logs-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="user-logs-stats__title">Genel İstatistikler</h3>
          <div className="user-logs-stats__grid">
            <div className="user-logs-stat-card user-logs-stat-card--primary">
              <div className="user-logs-stat-card__icon"><FaChartBar /></div>
              <div className="user-logs-stat-card__value">{stats.total}</div>
              <div className="user-logs-stat-card__label">Toplam Kayıt</div>
            </div>
            <div className="user-logs-stat-card user-logs-stat-card--success">
              <div className="user-logs-stat-card__icon"><FaUsers /></div>
              <div className="user-logs-stat-card__value">{stats.uniqueUsers}</div>
              <div className="user-logs-stat-card__label">Farklı Kullanıcı</div>
            </div>
            <div className="user-logs-stat-card user-logs-stat-card--warning">
              <div className="user-logs-stat-card__icon"><FaCalendar /></div>
              <div className="user-logs-stat-card__value">{stats.today}</div>
              <div className="user-logs-stat-card__label">Bugün</div>
            </div>
            <div className="user-logs-stat-card user-logs-stat-card--info">
              <div className="user-logs-stat-card__icon"><FaCalendarAlt /></div>
              <div className="user-logs-stat-card__value">{stats.thisWeek}</div>
              <div className="user-logs-stat-card__label">Bu Hafta</div>
            </div>
            <div className="user-logs-stat-card user-logs-stat-card--purple">
              <div className="user-logs-stat-card__icon"><FaBolt /></div>
              <div className="user-logs-stat-card__value">{stats.uniqueActions}</div>
              <div className="user-logs-stat-card__label">Farklı İşlem</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <div className="user-logs-filters">
            <div className="user-logs-filters__row user-logs-filters__row--search-only">
              <div className="user-logs-filters__search">
                <input
                  type="text"
                  className="user-logs-filters__input"
                  placeholder="Kayıt ara (e-posta, kullanıcı ID, işlem, detay...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="user-logs-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary user-logs-view-toggle user-logs-view-toggle--desktop"
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

          <div className="user-logs-header">
            <div className="user-logs-header__info">
              <span className="user-logs-header__count">
                Toplam: <strong>{filteredLogs.length}</strong> kayıt
              </span>
              {filteredLogs.length !== logs.length && (
                <span className="user-logs-header__filtered">
                  (Filtrelenmiş: {filteredLogs.length} / {logs.length})
                </span>
              )}
            </div>
            <div className="user-logs-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="dashboard-card__empty">Kayıt bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table user-logs-table-desktop ${viewMode === 'table' ? '' : 'user-logs-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Kullanıcı</th>
                      <th>İşlem</th>
                      <th>Detaylar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log, index) => (
                      <tr key={`${log.userId}-${index}`}>
                        <td>
                          <div className="user-logs-table__date">
                            {new Date(log.timestamp).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="user-logs-table__user">
                            <div className="user-logs-table__user-id">#{log.userId}</div>
                            <div className="user-logs-table__user-email">{log.email}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`user-logs-badge user-logs-badge--${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)} {log.action}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm user-logs-details-btn"
                            onClick={() => toggleExpanded(index)}
                          >
                            {expandedLogs.has(index) ? <><FaChevronDown style={{ marginRight: '0.25rem' }} /> Gizle</> : <><FaChevronRight style={{ marginRight: '0.25rem' }} /> Göster</>}
                          </button>
                          {expandedLogs.has(index) && (
                            <div className="user-logs-details">
                              {Object.entries(log.details).map(([key, value]) => (
                                <div key={key} className="user-logs-details__item">
                                  <strong>{key}:</strong> <span>{value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`user-logs-cards ${viewMode === 'cards' ? '' : 'user-logs-cards--hidden'}`}>
                {paginatedLogs.map((log, index) => (
                  <div key={`${log.userId}-${index}`} className="user-log-card">
                    <div className="user-log-card__header">
                      <div className="user-log-card__header-left">
                        <div className="user-log-card__action">
                          <span className={`user-logs-badge user-logs-badge--${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)} {log.action}
                          </span>
                        </div>
                        <div className="user-log-card__date">
                          {new Date(log.timestamp).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="user-log-card__body">
                      <div className="user-log-card__row">
                        <div className="user-log-card__icon"><FaUser /></div>
                        <div className="user-log-card__content">
                          <div className="user-log-card__label">Kullanıcı</div>
                          <div className="user-log-card__value">
                            <span className="user-log-card__user-id">#{log.userId}</span>
                            <span className="user-log-card__user-email">{log.email}</span>
                          </div>
                        </div>
                      </div>
                      {Object.keys(log.details).length > 0 && (
                        <div className="user-log-card__row">
                          <div className="user-log-card__icon"><FaClipboard /></div>
                          <div className="user-log-card__content">
                            <div className="user-log-card__label">Detaylar</div>
                            <div className="user-log-card__details">
                              {Object.entries(log.details).map(([key, value]) => (
                                <div key={key} className="user-log-card__detail-item">
                                  <strong>{key}:</strong> <span>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="user-logs-pagination">
                  <button
                    type="button"
                    className="user-logs-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="user-logs-pagination__btn"
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
                        className={`user-logs-pagination__btn user-logs-pagination__btn--number ${
                          currentPage === pageNum ? 'user-logs-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="user-logs-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="user-logs-pagination__btn"
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
    </main>
  )
}

export default UserLogsPage


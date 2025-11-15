import { useEffect, useState } from 'react'
import { FaPlus, FaEdit, FaTrash, FaLock, FaEye, FaClipboard, FaCheckCircle, FaTimes, FaExclamationTriangle, FaCalendar, FaGlobe, FaTable, FaChartBar, FaUser, FaCalendarAlt, FaFileAlt, FaBox } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'

type AuditLogsPageProps = {
  session: AuthResponse
}

type AuditLog = {
  id: number
  action: string
  entityType: string
  entityId?: number | null
  description?: string | null
  userId?: string | null
  userEmail?: string | null
  userRole?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  requestData?: string | null
  responseData?: string | null
  createdAt: string
  status?: string | null
  errorMessage?: string | null
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function AuditLogsPage({ session }: AuditLogsPageProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteType, setDeleteType] = useState<'all' | 'beforeDate' | 'user' | 'email' | 'dateRange' | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteParams, setDeleteParams] = useState({
    date: '',
    userId: '',
    email: '',
    startDate: '',
    endDate: '',
  })
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    status: '',
    userEmail: '',
  })

  useEffect(() => {
    fetchLogs()
  }, [session.accessToken, page, pageSize, filters])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/audit-logs?page=${page}&size=${pageSize}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Denetim kayıtları yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: {
          logs: AuditLog[]
          totalElements: number
          totalPages: number
          currentPage: number
          size: number
        }
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Denetim kayıtları yüklenemedi.')
      }

      let filteredLogs = payload.data.logs

      // Filtreleme
      if (filters.entityType) {
        filteredLogs = filteredLogs.filter((log) => log.entityType === filters.entityType)
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter((log) => log.action === filters.action)
      }
      if (filters.status) {
        filteredLogs = filteredLogs.filter((log) => log.status === filters.status)
      }
      if (filters.userEmail) {
        filteredLogs = filteredLogs.filter(
          (log) => log.userEmail && log.userEmail.toLowerCase().includes(filters.userEmail.toLowerCase())
        )
      }

      setLogs(filteredLogs)
      setTotalPages(payload.data.totalPages)
      setTotalElements(payload.data.totalElements)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      let url = ''
      let method = 'DELETE'

      switch (deleteType) {
        case 'all':
          url = `${apiBaseUrl}/admin/audit-logs/all`
          break
        case 'beforeDate':
          if (!deleteParams.date) {
            setError('Lütfen bir tarih seçin')
            setIsLoading(false)
            return
          }
          url = `${apiBaseUrl}/admin/audit-logs/before-date?date=${encodeURIComponent(deleteParams.date)}`
          break
        case 'user':
          if (!deleteParams.userId) {
            setError('Lütfen bir kullanıcı ID girin')
            setIsLoading(false)
            return
          }
          url = `${apiBaseUrl}/admin/audit-logs/user/${encodeURIComponent(deleteParams.userId)}`
          break
        case 'email':
          if (!deleteParams.email) {
            setError('Lütfen bir e-posta adresi girin')
            setIsLoading(false)
            return
          }
          url = `${apiBaseUrl}/admin/audit-logs/email/${encodeURIComponent(deleteParams.email)}`
          break
        case 'dateRange':
          if (!deleteParams.startDate || !deleteParams.endDate) {
            setError('Lütfen başlangıç ve bitiş tarihlerini seçin')
            setIsLoading(false)
            return
          }
          url = `${apiBaseUrl}/admin/audit-logs/date-range?start=${encodeURIComponent(deleteParams.startDate)}&end=${encodeURIComponent(deleteParams.endDate)}`
          break
        default:
          return
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: {
          deletedCount: number
        }
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Kayıtlar silinemedi')
      }

      setSuccess(`${payload.data?.deletedCount || 0} adet kayıt silindi`)
      setShowDeleteModal(false)
      setDeleteType(null)
      setDeleteParams({ date: '', userId: '', email: '', startDate: '', endDate: '' })
      fetchLogs()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Toast mesajı gösterilebilir
    })
  }

  // Time ago utility
  const getTimeAgo = (date: string): string => {
    const now = new Date()
    const logDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - logDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Az önce'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`
    return logDate.toLocaleDateString('tr-TR')
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

  // Get action icon
  const getActionIcon = (action: string) => {
    const actionUpper = action.toUpperCase()
    if (actionUpper.includes('CREATE') || actionUpper.includes('ADD')) return <FaPlus />
    if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT')) return <FaEdit />
    if (actionUpper.includes('DELETE') || actionUpper.includes('REMOVE')) return <FaTrash />
    if (actionUpper.includes('LOGIN') || actionUpper.includes('AUTH')) return <FaLock />
    if (actionUpper.includes('LOGOUT')) return <FaLock />
    if (actionUpper.includes('VIEW') || actionUpper.includes('GET')) return <FaEye />
    return <FaClipboard />
  }

  // Get action color
  const getActionColor = (action: string): string => {
    const actionUpper = action.toUpperCase()
    if (actionUpper.includes('CREATE') || actionUpper.includes('ADD')) return 'success'
    if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT')) return 'info'
    if (actionUpper.includes('DELETE') || actionUpper.includes('REMOVE')) return 'error'
    if (actionUpper.includes('LOGIN') || actionUpper.includes('AUTH')) return 'success'
    if (actionUpper.includes('LOGOUT')) return 'warning'
    return 'info'
  }

  // Client-side filtering
  const filteredLogs = logs.filter((log) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        log.action.toLowerCase().includes(search) ||
        log.entityType.toLowerCase().includes(search) ||
        (log.entityId && log.entityId.toString().includes(search)) ||
        (log.userEmail && log.userEmail.toLowerCase().includes(search)) ||
        (log.userId && log.userId.toString().includes(search)) ||
        (log.userRole && log.userRole.toLowerCase().includes(search)) ||
        (log.ipAddress && log.ipAddress.includes(search)) ||
        (log.description && log.description.toLowerCase().includes(search)) ||
        log.id.toString().includes(search)
      )
    }
    return true
  })

  // İstatistikler
  const stats = {
    total: totalElements,
    success: logs.filter((l) => l.status === 'SUCCESS').length,
    failed: logs.filter((l) => l.status === 'FAILED' || l.status === 'ERROR').length,
    uniqueUsers: new Set(logs.map((l) => l.userEmail).filter(Boolean)).size,
    uniqueActions: new Set(logs.map((l) => l.action)).size,
    uniqueEntities: new Set(logs.map((l) => l.entityType)).size,
    today: logs.filter((l) => {
      const logDate = new Date(l.createdAt)
      const today = new Date()
      return logDate.toDateString() === today.toDateString()
    }).length,
    thisWeek: logs.filter((l) => {
      const logDate = new Date(l.createdAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return logDate >= weekAgo
    }).length,
  }

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'SUCCESS':
        return 'dashboard-card__chip--success'
      case 'FAILED':
      case 'ERROR':
        return 'dashboard-card__chip--error'
      default:
        return 'dashboard-card__chip--info'
    }
  }

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'SUCCESS':
        return <><FaCheckCircle /> Başarılı</>
      case 'FAILED':
        return <><FaTimes /> Başarısız</>
      case 'ERROR':
        return <><FaExclamationTriangle /> Hata</>
      default:
        return <><FaClipboard /> Bilinmiyor</>
    }
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
          <p className="dashboard__eyebrow">Sistem Kayıtları</p>
          <h1>Denetim Kayıtları</h1>
          <p>Sistemdeki tüm işlem kayıtlarını görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {error && (
        <div className="audit-logs-alert audit-logs-alert--error">
          {error}
        </div>
      )}

      {success && (
        <div className="audit-logs-alert audit-logs-alert--success">
          {success}
        </div>
      )}

      {/* İstatistikler */}
      <section className="dashboard__grid audit-logs-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="audit-logs-stats__title">Genel İstatistikler</h3>
          <div className="audit-logs-stats__grid">
            <div className="audit-logs-stat-card audit-logs-stat-card--primary">
              <div className="audit-logs-stat-card__icon"><FaClipboard /></div>
              <div className="audit-logs-stat-card__value">{stats.total}</div>
              <div className="audit-logs-stat-card__label">Toplam Kayıt</div>
              <div className="audit-logs-stat-card__subtitle">Tüm kayıtlar</div>
            </div>
            <div className="audit-logs-stat-card audit-logs-stat-card--success">
              <div className="audit-logs-stat-card__icon"><FaCheckCircle /></div>
              <div className="audit-logs-stat-card__value">{stats.success}</div>
              <div className="audit-logs-stat-card__label">Başarılı</div>
              <div className="audit-logs-stat-card__subtitle">SUCCESS</div>
            </div>
            <div className="audit-logs-stat-card audit-logs-stat-card--error">
              <div className="audit-logs-stat-card__icon"><FaTimes /></div>
              <div className="audit-logs-stat-card__value">{stats.failed}</div>
              <div className="audit-logs-stat-card__label">Başarısız</div>
              <div className="audit-logs-stat-card__subtitle">FAILED/ERROR</div>
            </div>
            <div className="audit-logs-stat-card audit-logs-stat-card--info">
              <div className="audit-logs-stat-card__icon"><FaUser /></div>
              <div className="audit-logs-stat-card__value">{stats.uniqueUsers}</div>
              <div className="audit-logs-stat-card__label">Farklı Kullanıcı</div>
              <div className="audit-logs-stat-card__subtitle">Unique users</div>
            </div>
            <div className="audit-logs-stat-card audit-logs-stat-card--info">
              <div className="audit-logs-stat-card__icon"><FaFileAlt /></div>
              <div className="audit-logs-stat-card__value">{stats.uniqueActions}</div>
              <div className="audit-logs-stat-card__label">Farklı İşlem</div>
              <div className="audit-logs-stat-card__subtitle">Unique actions</div>
            </div>
            <div className="audit-logs-stat-card audit-logs-stat-card--info">
              <div className="audit-logs-stat-card__icon"><FaBox /></div>
              <div className="audit-logs-stat-card__value">{stats.uniqueEntities}</div>
              <div className="audit-logs-stat-card__label">Farklı Entity</div>
              <div className="audit-logs-stat-card__subtitle">Unique entities</div>
            </div>
            <div className="audit-logs-stat-card audit-logs-stat-card--info">
              <div className="audit-logs-stat-card__icon"><FaCalendar /></div>
              <div className="audit-logs-stat-card__value">{stats.today}</div>
              <div className="audit-logs-stat-card__label">Bugün</div>
              <div className="audit-logs-stat-card__subtitle">Bugün eklenen</div>
            </div>
            <div className="audit-logs-stat-card audit-logs-stat-card--info">
              <div className="audit-logs-stat-card__icon"><FaCalendarAlt /></div>
              <div className="audit-logs-stat-card__value">{stats.thisWeek}</div>
              <div className="audit-logs-stat-card__label">Bu Hafta</div>
              <div className="audit-logs-stat-card__subtitle">Son 7 gün</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="audit-logs-filters">
            <div className="audit-logs-filters__row">
              <div className="audit-logs-filters__search">
                <input
                  type="text"
                  className="audit-logs-filters__input"
                  placeholder="Kayıt ara (action, entity, kullanıcı, IP, ID...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(0)
                  }}
                />
              </div>
              <div className="audit-logs-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary audit-logs-view-toggle audit-logs-view-toggle--desktop"
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
                      setPage(0)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
            <div className="audit-logs-filters__row">
              <div className="audit-logs-filters__field">
                <label className="audit-logs-filters__label">Entity Tipi</label>
                <input
                  type="text"
                  className="audit-logs-filters__input-sm"
                  value={filters.entityType}
                  onChange={(e) => {
                    setFilters({ ...filters, entityType: e.target.value })
                    setPage(0)
                  }}
                  placeholder="ORDER, USER, PRODUCT"
                />
              </div>
              <div className="audit-logs-filters__field">
                <label className="audit-logs-filters__label">Action</label>
                <input
                  type="text"
                  className="audit-logs-filters__input-sm"
                  value={filters.action}
                  onChange={(e) => {
                    setFilters({ ...filters, action: e.target.value })
                    setPage(0)
                  }}
                  placeholder="CREATE, UPDATE, DELETE"
                />
              </div>
              <div className="audit-logs-filters__field">
                <label className="audit-logs-filters__label">Status</label>
                <select
                  className="audit-logs-filters__select"
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value })
                    setPage(0)
                  }}
                >
                  <option value="">Tümü</option>
                  <option value="SUCCESS">Başarılı</option>
                  <option value="FAILED">Başarısız</option>
                  <option value="ERROR">Hata</option>
                </select>
              </div>
              <div className="audit-logs-filters__field">
                <label className="audit-logs-filters__label">E-posta</label>
                <input
                  type="text"
                  className="audit-logs-filters__input-sm"
                  value={filters.userEmail}
                  onChange={(e) => {
                    setFilters({ ...filters, userEmail: e.target.value })
                    setPage(0)
                  }}
                  placeholder="Kullanıcı e-postası"
                />
              </div>
              <div className="audit-logs-filters__field">
                <label className="audit-logs-filters__label">Sayfa Başına</label>
                <select
                  className="audit-logs-filters__select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(0)
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="audit-logs-filters__row">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  setDeleteType('all')
                  setShowDeleteModal(true)
                }}
              >
                <FaTrash style={{ marginRight: '0.5rem' }} /> Kayıt Silme
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="audit-logs-header">
            <div className="audit-logs-header__info">
              <span className="audit-logs-header__count">
                Toplam: <strong>{totalElements}</strong> kayıt
              </span>
              {filteredLogs.length !== logs.length && (
                <span className="audit-logs-header__filtered">
                  (Filtrelenmiş: {filteredLogs.length} / {logs.length})
                </span>
              )}
            </div>
            <div className="audit-logs-header__pagination">
              Sayfa {page + 1} / {totalPages || 1}
            </div>
          </div>

          {logs.length === 0 ? (
            <p className="dashboard-card__empty">Kayıt bulunamadı.</p>
          ) : filteredLogs.length === 0 ? (
            <p className="dashboard-card__empty">Arama kriterlerinize uygun kayıt bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table audit-logs-table-desktop ${viewMode === 'table' ? '' : 'audit-logs-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Kullanıcı</th>
                      <th>Rol</th>
                      <th>IP</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div className="audit-logs-table__id">#{log.id}</div>
                        </td>
                        <td>
                          <div className="audit-logs-table__action">
                            <span className={`audit-logs-table__action-icon audit-logs-table__action-icon--${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                            </span>
                            <span className="audit-logs-table__action-text">{log.action}</span>
                          </div>
                        </td>
                        <td>
                          <div className="audit-logs-table__entity">
                            <div className="audit-logs-table__entity-type">{log.entityType}</div>
                            {log.entityId && (
                              <div className="audit-logs-table__entity-id">ID: {log.entityId}</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="audit-logs-table__user">
                            {log.userEmail ? (
                              <div className="audit-logs-table__user-email">{log.userEmail}</div>
                            ) : (
                              <div className="audit-logs-table__user-empty">-</div>
                            )}
                            {log.userId && (
                              <div className="audit-logs-table__user-id">ID: {log.userId}</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="audit-logs-table__role">{log.userRole || '-'}</div>
                        </td>
                        <td>
                          <div className="audit-logs-table__ip">
                            {log.ipAddress ? (
                              <>
                                <span className="audit-logs-table__ip-value">{log.ipAddress}</span>
                                <button
                                  type="button"
                                  className="audit-logs-table__copy-btn"
                                  onClick={() => copyToClipboard(log.ipAddress!)}
                                  title="Kopyala"
                                >
                                  <FaClipboard />
                                </button>
                              </>
                            ) : (
                              <span className="audit-logs-table__ip-empty">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span 
                            className={`dashboard-card__chip ${getStatusColor(log.status)}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {getStatusBadge(log.status)}
                          </span>
                        </td>
                        <td>
                          <div className="audit-logs-table__date">
                            {new Date(log.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="audit-logs-table__btn audit-logs-table__btn--info"
                            onClick={() => setSelectedLog(log)}
                            title="Detayları Gör"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`audit-logs-cards ${viewMode === 'cards' ? '' : 'audit-logs-cards--hidden'}`}>
                {filteredLogs.map((log) => (
                  <div key={log.id} className="audit-log-card">
                    <div className="audit-log-card__header">
                      <div className="audit-log-card__header-left">
                        <div className="audit-log-card__action">
                          <span className={`audit-log-card__action-icon audit-log-card__action-icon--${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                          </span>
                          <div className="audit-log-card__action-content">
                            <div className="audit-log-card__action-text">{log.action}</div>
                            <div className="audit-log-card__entity">
                              {log.entityType}
                              {log.entityId && ` #${log.entityId}`}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="audit-log-card__header-right">
                        <span 
                          className={`dashboard-card__chip ${getStatusColor(log.status)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getStatusBadge(log.status)}
                        </span>
                        <div className="audit-log-card__id">#{log.id}</div>
                      </div>
                    </div>
                    <div className="audit-log-card__body">
                      {log.userEmail && (
                        <div className="audit-log-card__row">
                          <div className="audit-log-card__icon"><FaUser /></div>
                          <div className="audit-log-card__content">
                            <div className="audit-log-card__label">Kullanıcı</div>
                            <div className="audit-log-card__value">{log.userEmail}</div>
                            {log.userId && (
                              <div className="audit-log-card__subvalue">ID: {log.userId}</div>
                            )}
                            {log.userRole && (
                              <div className="audit-log-card__subvalue">Rol: {log.userRole}</div>
                            )}
                          </div>
                        </div>
                      )}
                      {log.ipAddress && (
                        <div className="audit-log-card__row">
                          <div className="audit-log-card__icon"><FaGlobe /></div>
                          <div className="audit-log-card__content">
                            <div className="audit-log-card__label">IP Adresi</div>
                            <div className="audit-log-card__value-group">
                              <span className="audit-log-card__value audit-log-card__value--ip">{log.ipAddress}</span>
                              <button
                                type="button"
                                className="audit-log-card__copy-btn"
                                onClick={() => copyToClipboard(log.ipAddress!)}
                                title="Kopyala"
                              >
                                <FaClipboard />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {log.description && (
                        <div className="audit-log-card__row">
                          <div className="audit-log-card__icon"><FaFileAlt /></div>
                          <div className="audit-log-card__content">
                            <div className="audit-log-card__label">Açıklama</div>
                            <div className="audit-log-card__value">{log.description}</div>
                          </div>
                        </div>
                      )}
                      <div className="audit-log-card__row">
                        <div className="audit-log-card__icon"><FaCalendar /></div>
                        <div className="audit-log-card__content">
                          <div className="audit-log-card__label">Tarih</div>
                          <div className="audit-log-card__value">
                            {new Date(log.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="audit-log-card__subvalue">{getTimeAgo(log.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="audit-log-card__actions">
                      <button
                        type="button"
                        className="audit-log-card__btn audit-log-card__btn--info"
                        onClick={() => setSelectedLog(log)}
                      >
                        <FaEye style={{ marginRight: '0.25rem' }} /> Detay
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="audit-logs-pagination">
                  <button
                    type="button"
                    className="audit-logs-pagination__btn"
                    onClick={() => setPage(0)}
                    disabled={page === 0}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="audit-logs-pagination__btn"
                    onClick={() => setPage(Math.max(0, page - 1))}
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
                        className={`audit-logs-pagination__btn audit-logs-pagination__btn--number ${
                          page === pageNum ? 'audit-logs-pagination__btn--active' : ''
                        }`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="audit-logs-pagination__btn"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="audit-logs-pagination__btn"
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

      {/* Log Detay Modal */}
      {selectedLog && (
        <div
          className="audit-log-modal-overlay"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="audit-log-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="audit-log-modal__header">
              <h2 className="audit-log-modal__title">Kayıt Detayı</h2>
              <button
                type="button"
                className="audit-log-modal__close"
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>
            <div className="audit-log-modal__content">
              <div className="audit-log-modal__info-grid">
                <div className="audit-log-modal__info-item">
                  <div className="audit-log-modal__info-label">Kayıt ID</div>
                  <div className="audit-log-modal__info-value">#{selectedLog.id}</div>
                </div>
                <div className="audit-log-modal__info-item">
                  <div className="audit-log-modal__info-label">Action</div>
                  <div className="audit-log-modal__info-value">
                    <span className={`audit-log-modal__action-badge audit-log-modal__action-badge--${getActionColor(selectedLog.action)}`}>
                      {getActionIcon(selectedLog.action)} {selectedLog.action}
                    </span>
                  </div>
                </div>
                <div className="audit-log-modal__info-item">
                  <div className="audit-log-modal__info-label">Entity</div>
                  <div className="audit-log-modal__info-value">
                    {selectedLog.entityType}
                    {selectedLog.entityId && ` #${selectedLog.entityId}`}
                  </div>
                </div>
                <div className="audit-log-modal__info-item">
                  <div className="audit-log-modal__info-label">Durum</div>
                  <div className="audit-log-modal__info-value">
                    <span 
                      className={`dashboard-card__chip ${getStatusColor(selectedLog.status)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {getStatusBadge(selectedLog.status)}
                    </span>
                  </div>
                </div>
                {selectedLog.userEmail && (
                  <div className="audit-log-modal__info-item">
                    <div className="audit-log-modal__info-label">Kullanıcı</div>
                    <div className="audit-log-modal__info-value-group">
                      <span className="audit-log-modal__info-value audit-log-modal__info-value--email">{selectedLog.userEmail}</span>
                      <button
                        type="button"
                        className="audit-log-modal__copy-btn"
                        onClick={() => copyToClipboard(selectedLog.userEmail!)}
                        title="Kopyala"
                      >
                        <FaClipboard />
                      </button>
                    </div>
                    {selectedLog.userId && (
                      <div className="audit-log-modal__info-subvalue">ID: {selectedLog.userId}</div>
                    )}
                    {selectedLog.userRole && (
                      <div className="audit-log-modal__info-subvalue">Rol: {selectedLog.userRole}</div>
                    )}
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div className="audit-log-modal__info-item">
                    <div className="audit-log-modal__info-label">IP Adresi</div>
                    <div className="audit-log-modal__info-value-group">
                      <span className="audit-log-modal__info-value audit-log-modal__info-value--ip">{selectedLog.ipAddress}</span>
                      <button
                        type="button"
                        className="audit-log-modal__copy-btn"
                        onClick={() => copyToClipboard(selectedLog.ipAddress!)}
                        title="Kopyala"
                      >
                        <FaClipboard />
                      </button>
                    </div>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div className="audit-log-modal__info-item">
                    <div className="audit-log-modal__info-label">Tarayıcı</div>
                    <div className="audit-log-modal__info-value">
                      <div className="audit-log-modal__browser-name">{getBrowserName(selectedLog.userAgent)}</div>
                      <div className="audit-log-modal__browser-ua" title={selectedLog.userAgent}>
                        {selectedLog.userAgent.length > 60 ? selectedLog.userAgent.substring(0, 60) + '...' : selectedLog.userAgent}
                      </div>
                    </div>
                  </div>
                )}
                <div className="audit-log-modal__info-item">
                  <div className="audit-log-modal__info-label">Tarih</div>
                  <div className="audit-log-modal__info-value audit-log-modal__info-value--date">
                    {new Date(selectedLog.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="audit-log-modal__info-subvalue">{getTimeAgo(selectedLog.createdAt)}</div>
                </div>
              </div>

              {selectedLog.description && (
                <div className="audit-log-modal__section">
                  <div className="audit-log-modal__section-label">AÇIKLAMA</div>
                  <div className="audit-log-modal__description">{selectedLog.description}</div>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div className="audit-log-modal__section">
                  <div className="audit-log-modal__section-label">HATA MESAJI</div>
                  <div className="audit-log-modal__error">{selectedLog.errorMessage}</div>
                </div>
              )}

              {selectedLog.requestData && (
                <div className="audit-log-modal__section">
                  <div className="audit-log-modal__section-label">REQUEST DATA</div>
                  <div className="audit-log-modal__data">
                    <pre>{selectedLog.requestData}</pre>
                    <button
                      type="button"
                      className="audit-log-modal__copy-btn audit-log-modal__copy-btn--data"
                      onClick={() => copyToClipboard(selectedLog.requestData!)}
                      title="Kopyala"
                    >
                      <FaClipboard style={{ marginRight: '0.25rem' }} /> Kopyala
                    </button>
                  </div>
                </div>
              )}

              {selectedLog.responseData && (
                <div className="audit-log-modal__section">
                  <div className="audit-log-modal__section-label">RESPONSE DATA</div>
                  <div className="audit-log-modal__data">
                    <pre>{selectedLog.responseData}</pre>
                    <button
                      type="button"
                      className="audit-log-modal__copy-btn audit-log-modal__copy-btn--data"
                      onClick={() => copyToClipboard(selectedLog.responseData!)}
                      title="Kopyala"
                    >
                      <FaClipboard style={{ marginRight: '0.25rem' }} /> Kopyala
                    </button>
                  </div>
                </div>
              )}

              <div className="audit-log-modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedLog(null)}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Modal */}
      {showDeleteModal && (
        <div
          className="audit-log-delete-modal-overlay"
          onClick={() => {
            setShowDeleteModal(false)
            setDeleteType(null)
          }}
        >
          <div
            className="audit-log-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="audit-log-delete-modal__header">
              <h2 className="audit-log-delete-modal__title"><FaTrash style={{ marginRight: '0.5rem' }} /> Kayıt Silme</h2>
              <button
                type="button"
                className="audit-log-delete-modal__close"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteType(null)
                }}
              >
                ✕
              </button>
            </div>

            <div className="audit-log-delete-modal__content">
              <div className="audit-log-delete-modal__form-group">
                <label className="audit-log-delete-modal__label">Silme Tipi</label>
                <select
                  className="audit-log-delete-modal__select"
                  value={deleteType || ''}
                  onChange={(e) => setDeleteType(e.target.value as any)}
                >
                  <option value="">Seçiniz</option>
                  <option value="all">Tüm Kayıtları Sil</option>
                  <option value="beforeDate">Belirli Tarihten Önceki Kayıtları Sil</option>
                  <option value="user">Kullanıcı ID'ye Göre Sil</option>
                  <option value="email">E-posta'ya Göre Sil</option>
                  <option value="dateRange">Tarih Aralığına Göre Sil</option>
                </select>
              </div>

              {deleteType === 'beforeDate' && (
                <div className="audit-log-delete-modal__form-group">
                  <label className="audit-log-delete-modal__label">Tarih (YYYY-MM-DDTHH:mm:ss)</label>
                  <input
                    type="text"
                    className="audit-log-delete-modal__input"
                    value={deleteParams.date}
                    onChange={(e) => setDeleteParams({ ...deleteParams, date: e.target.value })}
                    placeholder="2024-01-01T00:00:00"
                  />
                </div>
              )}

              {deleteType === 'user' && (
                <div className="audit-log-delete-modal__form-group">
                  <label className="audit-log-delete-modal__label">Kullanıcı ID</label>
                  <input
                    type="text"
                    className="audit-log-delete-modal__input"
                    value={deleteParams.userId}
                    onChange={(e) => setDeleteParams({ ...deleteParams, userId: e.target.value })}
                    placeholder="Kullanıcı ID"
                  />
                </div>
              )}

              {deleteType === 'email' && (
                <div className="audit-log-delete-modal__form-group">
                  <label className="audit-log-delete-modal__label">E-posta</label>
                  <input
                    type="email"
                    className="audit-log-delete-modal__input"
                    value={deleteParams.email}
                    onChange={(e) => setDeleteParams({ ...deleteParams, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
              )}

              {deleteType === 'dateRange' && (
                <>
                  <div className="audit-log-delete-modal__form-group">
                    <label className="audit-log-delete-modal__label">Başlangıç Tarihi (YYYY-MM-DDTHH:mm:ss)</label>
                    <input
                      type="text"
                      className="audit-log-delete-modal__input"
                      value={deleteParams.startDate}
                      onChange={(e) => setDeleteParams({ ...deleteParams, startDate: e.target.value })}
                      placeholder="2024-01-01T00:00:00"
                    />
                  </div>
                  <div className="audit-log-delete-modal__form-group">
                    <label className="audit-log-delete-modal__label">Bitiş Tarihi (YYYY-MM-DDTHH:mm:ss)</label>
                    <input
                      type="text"
                      className="audit-log-delete-modal__input"
                      value={deleteParams.endDate}
                      onChange={(e) => setDeleteParams({ ...deleteParams, endDate: e.target.value })}
                      placeholder="2024-12-31T23:59:59"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="audit-log-delete-modal__error">{error}</div>
              )}

              <div className="audit-log-delete-modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteType(null)
                    setDeleteParams({ date: '', userId: '', email: '', startDate: '', endDate: '' })
                  }}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={!deleteType || isLoading}
                >
                  {isLoading ? 'Siliniyor...' : <><FaTrash style={{ marginRight: '0.25rem' }} /> Sil</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default AuditLogsPage



import { useEffect, useState, useCallback } from 'react'
import { FaStar } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { useToast, ToastContainer } from '../components/Toast'

type UserAnalyticsPageProps = {
  session: AuthResponse
}

type UserStatistics = {
  userId: number
  email: string
  fullName?: string | null
  registrationDate: string
  lastLoginDate?: string | null
  lastActivityDate?: string | null
  emailVerified: boolean
  active: boolean
  totalProductViews: number
  uniqueProductsViewed: number
  totalReviews: number
  averageRating: number
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalSpent: number
  averageOrderValue: number
  totalCarts: number
  activeCarts: number
  totalCartValue: number
  averageCartValue: number
  totalBehaviors: number
  behaviorCounts: Record<string, number>
  engagementScore: number
  userSegment: string
}

type AnalyticsSummary = {
  totalUsers: number
  activeUsers: number
  newUsers: number
  totalBehaviors: number
  behaviorDistribution: Record<string, number>
  userSegments: Record<string, number>
}

type UserBehavior = {
  id: number
  behaviorType: string
  entityType?: string | null
  entityId?: number | null
  details?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  referrer?: string | null
  createdAt: string
}

type ViewMode = 'summary' | 'users' | 'behaviors'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function UserAnalyticsPage({ session }: UserAnalyticsPageProps) {
  const toast = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Summary data
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  
  // Users data
  const [users, setUsers] = useState<UserStatistics[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [userBehaviors, setUserBehaviors] = useState<UserBehavior[]>([])
  const [behaviorTypeFilter, setBehaviorTypeFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const start = new Date(startDate).toISOString()
      const end = new Date(endDate + 'T23:59:59').toISOString()

      const response = await fetch(
        `${apiBaseUrl}/admin/analytics/summary?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Analitik özeti yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: AnalyticsSummary
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Analitik özeti yüklenemedi.')
      }

      setSummary(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, session.accessToken])

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Tüm kullanıcıları getir ve her biri için istatistikleri al
      const usersResponse = await fetch(`${apiBaseUrl}/admin/users`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!usersResponse.ok) {
        throw new Error('Kullanıcılar yüklenemedi.')
      }

      const usersPayload = (await usersResponse.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Array<{ id: number; email: string }>
      }

      const usersSuccess = usersPayload.isSuccess ?? usersPayload.success ?? false
      if (!usersSuccess || !usersPayload.data) {
        throw new Error('Kullanıcılar yüklenemedi.')
      }

      // Her kullanıcı için istatistikleri al
      const userStatsPromises = usersPayload.data.map(async (user) => {
        const statsResponse = await fetch(
          `${apiBaseUrl}/admin/analytics/users/${user.id}/statistics`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (statsResponse.ok) {
          const statsPayload = (await statsResponse.json()) as {
            isSuccess?: boolean
            success?: boolean
            data?: UserStatistics
          }
          const statsSuccess = statsPayload.isSuccess ?? statsPayload.success ?? false
          if (statsSuccess && statsPayload.data) {
            return statsPayload.data
          }
        }
        return null
      })

      const userStats = (await Promise.all(userStatsPromises)).filter(
        (stat): stat is UserStatistics => stat !== null
      )

      setUsers(userStats)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken])

  const fetchUserBehaviors = useCallback(async (userId: number) => {
    try {
      setError(null)

      let url = `${apiBaseUrl}/admin/analytics/users/${userId}/behaviors?page=${currentPage}&size=${pageSize}`
      if (behaviorTypeFilter) {
        url += `&behaviorType=${behaviorTypeFilter}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Davranışlar yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: UserBehavior[]
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Davranışlar yüklenemedi.')
      }

      setUserBehaviors(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
      toast.error(message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, behaviorTypeFilter, session.accessToken])

  useEffect(() => {
    if (viewMode === 'summary') {
      fetchSummary()
    } else if (viewMode === 'users') {
      fetchUsers()
    }
  }, [viewMode, fetchSummary, fetchUsers])

  useEffect(() => {
    if (selectedUserId) {
      fetchUserBehaviors(selectedUserId)
    }
  }, [selectedUserId, fetchUserBehaviors])

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'VIP_CUSTOMER':
        return 'dashboard-card__chip--success'
      case 'LOYAL_CUSTOMER':
        return 'dashboard-card__chip--info'
      case 'REGULAR_CUSTOMER':
        return 'dashboard-card__chip--warning'
      case 'NEW_CUSTOMER':
        return 'dashboard-card__chip--primary'
      default:
        return ''
    }
  }

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'VIP_CUSTOMER':
        return 'VIP Müşteri'
      case 'LOYAL_CUSTOMER':
        return 'Sadık Müşteri'
      case 'REGULAR_CUSTOMER':
        return 'Düzenli Müşteri'
      case 'NEW_CUSTOMER':
        return 'Yeni Müşteri'
      case 'VISITOR':
        return 'Ziyaretçi'
      default:
        return segment
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount)
  }

  if (isLoading && viewMode === 'summary') {
    return (
      <main className="page dashboard">
        <p>Yükleniyor...</p>
      </main>
    )
  }

  if (error && viewMode === 'summary') {
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
          <p className="dashboard__eyebrow">Kullanıcı Analizi</p>
          <h1>Kullanıcı Davranış Analizi</h1>
          <p>Kullanıcı davranışlarını, istatistiklerini ve segmentasyonunu görüntüleyin.</p>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`dashboard-card__button ${viewMode === 'summary' ? 'dashboard-card__button--active' : ''}`}
              onClick={() => setViewMode('summary')}
            >
              Genel Özet
            </button>
            <button
              type="button"
              className={`dashboard-card__button ${viewMode === 'users' ? 'dashboard-card__button--active' : ''}`}
              onClick={() => setViewMode('users')}
            >
              Kullanıcı İstatistikleri
            </button>
            <button
              type="button"
              className={`dashboard-card__button ${viewMode === 'behaviors' ? 'dashboard-card__button--active' : ''}`}
              onClick={() => {
                setViewMode('behaviors')
                if (!selectedUserId && users.length > 0) {
                  setSelectedUserId(users[0].userId)
                }
              }}
              disabled={!selectedUserId}
            >
              Davranış Detayları
            </button>
          </div>
        </article>
      </section>

      {/* Summary View */}
      {viewMode === 'summary' && summary && (
        <>
          {/* Date Range Filter */}
          <section className="dashboard__grid">
            <article className="dashboard-card">
              <h2>Tarih Aralığı</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label htmlFor="startDate" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Başlangıç Tarihi
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label htmlFor="endDate" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Bitiş Tarihi
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
                <button
                  type="button"
                  className="dashboard-card__button"
                  onClick={fetchSummary}
                  style={{ marginTop: '1.5rem' }}
                >
                  Filtrele
                </button>
              </div>
            </article>
          </section>

          {/* Summary Stats */}
          <section className="dashboard__grid">
            <article className="dashboard-card">
              <h2>Kullanıcı İstatistikleri</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
                    {summary.totalUsers}
                  </div>
                  <div style={{ color: '#666' }}>Toplam Kullanıcı</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                    {summary.activeUsers}
                  </div>
                  <div style={{ color: '#666' }}>Aktif Kullanıcı (30 gün)</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>
                    {summary.newUsers}
                  </div>
                  <div style={{ color: '#666' }}>Yeni Kullanıcı</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>
                    {summary.totalBehaviors}
                  </div>
                  <div style={{ color: '#666' }}>Toplam Davranış</div>
                </div>
              </div>
            </article>

            <article className="dashboard-card">
              <h2>Kullanıcı Segmentasyonu</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {summary.userSegments && Object.entries(summary.userSegments).map(([segment, count]) => (
                  <div key={segment} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{count}</div>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>{getSegmentLabel(segment)}</div>
                  </div>
                ))}
                {(!summary.userSegments || Object.keys(summary.userSegments || {}).length === 0) && (
                  <p style={{ color: '#666' }}>Segmentasyon verisi bulunamadı.</p>
                )}
              </div>
            </article>

            <article className="dashboard-card dashboard-card--wide">
              <h2>Davranış Dağılımı</h2>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {summary.behaviorDistribution && Object.entries(summary.behaviorDistribution)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([behavior, count]) => (
                    <div key={behavior} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: '150px' }}>{behavior}</div>
                      <div style={{ flex: 2 }}>
                        <div
                          style={{
                            height: '20px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${(count / summary.totalBehaviors) * 100}%`,
                              backgroundColor: '#2563eb',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ minWidth: '60px', textAlign: 'right', fontWeight: 'bold' }}>
                        {(count as number).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  ))}
                {(!summary.behaviorDistribution || Object.keys(summary.behaviorDistribution || {}).length === 0) && (
                  <p style={{ color: '#666' }}>Davranış dağılımı verisi bulunamadı.</p>
                )}
              </div>
            </article>
          </section>
        </>
      )}

      {/* Users View */}
      {viewMode === 'users' && (
        <section className="dashboard__grid">
          <article className="dashboard-card dashboard-card--wide">
            <h2>Kullanıcı İstatistikleri</h2>
            {isLoading ? (
              <p>Yükleniyor...</p>
            ) : users.length === 0 ? (
              <p className="dashboard-card__empty">Henüz kullanıcı bulunmuyor.</p>
            ) : (
              <div className="dashboard-card__table">
                <table>
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>Segment</th>
                      <th>Engagement</th>
                      <th>Sipariş</th>
                      <th>Harcama</th>
                      <th>Görüntüleme</th>
                      <th>Yorum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.userId}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedUserId(user.userId)
                          setViewMode('behaviors')
                        }}
                      >
                        <td>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{user.email}</div>
                            {user.fullName && (
                              <div style={{ fontSize: '0.9rem', color: '#666' }}>{user.fullName}</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`dashboard-card__chip ${getSegmentColor(user.userSegment)}`}>
                            {getSegmentLabel(user.userSegment)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '60px',
                                height: '8px',
                                backgroundColor: '#e5e7eb',
                                borderRadius: '4px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${user.engagementScore}%`,
                                  height: '100%',
                                  backgroundColor:
                                    user.engagementScore >= 70
                                      ? '#16a34a'
                                      : user.engagementScore >= 40
                                      ? '#f59e0b'
                                      : '#dc2626',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.9rem' }}>{Math.round(user.engagementScore)}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{user.totalOrders}</div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                              {user.completedOrders} tamamlandı
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>{formatCurrency(user.totalSpent)}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            Ort: {formatCurrency(user.averageOrderValue)}
                          </div>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{user.totalProductViews}</div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                              {user.uniqueProductsViewed} benzersiz
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{user.totalReviews}</div>
                            {user.averageRating > 0 && (
                              <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                <FaStar style={{ marginRight: '0.25rem' }} /> {user.averageRating.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dashboard-card__button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedUserId(user.userId)
                              setViewMode('behaviors')
                            }}
                          >
                            Detay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}

      {/* Behaviors View */}
      {viewMode === 'behaviors' && selectedUserId && (
        <section className="dashboard__grid">
          <article className="dashboard-card">
            <h2>Kullanıcı Seçimi</h2>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
            >
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.email} ({getSegmentLabel(user.userSegment)})
                </option>
              ))}
            </select>
          </article>

          <article className="dashboard-card">
            <h2>Davranış Filtresi</h2>
            <select
              value={behaviorTypeFilter}
              onChange={(e) => {
                setBehaviorTypeFilter(e.target.value)
                setCurrentPage(0)
              }}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
            >
              <option value="">Tüm Davranışlar</option>
              <option value="PRODUCT_VIEW">Ürün Görüntüleme</option>
              <option value="PRODUCT_SEARCH">Ürün Arama</option>
              <option value="CART_ADD">Sepete Ekleme</option>
              <option value="CART_REMOVE">Sepetten Çıkarma</option>
              <option value="ORDER_CREATE">Sipariş Oluşturma</option>
              <option value="ORDER_CANCEL">Sipariş İptal</option>
              <option value="REVIEW_CREATE">Yorum Oluşturma</option>
              <option value="LOGIN">Giriş Yapma</option>
              <option value="LOGOUT">Çıkış Yapma</option>
            </select>
          </article>

          <article className="dashboard-card dashboard-card--wide">
            <h2>Davranış Geçmişi</h2>
            {userBehaviors.length === 0 ? (
              <p className="dashboard-card__empty">Henüz davranış kaydı bulunmuyor.</p>
            ) : (
              <>
                <div className="dashboard-card__table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Davranış Tipi</th>
                        <th>Entity</th>
                        <th>IP Adresi</th>
                        <th>Referrer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userBehaviors.map((behavior) => (
                        <tr key={behavior.id}>
                          <td>{new Date(behavior.createdAt).toLocaleString('tr-TR')}</td>
                          <td>
                            <span className="dashboard-card__chip">{behavior.behaviorType}</span>
                          </td>
                          <td>
                            {behavior.entityType && behavior.entityId ? (
                              <span>
                                {behavior.entityType} #{behavior.entityId}
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>-</span>
                            )}
                          </td>
                          <td>{behavior.ipAddress || '-'}</td>
                          <td>
                            {behavior.referrer ? (
                              <a
                                href={behavior.referrer}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2563eb', textDecoration: 'none' }}
                              >
                                {behavior.referrer.length > 50
                                  ? behavior.referrer.substring(0, 50) + '...'
                                  : behavior.referrer}
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <div>
                    <button
                      type="button"
                      className="dashboard-card__button"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      Önceki
                    </button>
                    <span style={{ margin: '0 1rem' }}>Sayfa {currentPage + 1}</span>
                    <button
                      type="button"
                      className="dashboard-card__button"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={userBehaviors.length < pageSize}
                    >
                      Sonraki
                    </button>
                  </div>
                  <div>
                    <label style={{ marginRight: '0.5rem' }}>Sayfa Boyutu:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setCurrentPage(0)
                      }}
                      style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </article>
        </section>
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </main>
  )
}

export default UserAnalyticsPage


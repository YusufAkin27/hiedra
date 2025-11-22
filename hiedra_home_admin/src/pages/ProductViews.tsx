import { useEffect, useState } from 'react'
import { FaEye, FaCalendar, FaChartBar, FaBox, FaClipboard, FaTable, FaGlobe, FaCalendarAlt, FaUser } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'

type ProductViewsPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
}

type ProductView = {
  id: number
  viewedAt: string
  ipAddress?: string
  userAgent?: string
  product: {
    id: number
    name: string
  }
  user?: {
    id: number
    email: string
  }
}

type ViewStats = {
  productId?: number
  totalViews: number
  viewsLast24Hours: number
  viewsLast7Days: number
  viewsLast30Days: number
  topViewedProducts?: Array<{
    productId: number
    productName?: string
    viewCount: number
  }>
  totalUniqueProducts?: number
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function ProductViewsPage({ session, toast }: ProductViewsPageProps) {
  const [views, setViews] = useState<ProductView[]>([])
  const [stats, setStats] = useState<ViewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })

  useEffect(() => {
    fetchStats()
    fetchViews()
  }, [session.accessToken, selectedProductId])

  const fetchStats = async () => {
    try {
      const url = selectedProductId
        ? `${apiBaseUrl}/admin/product-views/stats?productId=${selectedProductId}`
        : `${apiBaseUrl}/admin/product-views/stats`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: ViewStats
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setStats(payload.data)
        }
      }
    } catch (err) {
      console.error('İstatistikler yüklenemedi:', err)
    }
  }

  const fetchViews = async () => {
    try {
      setIsLoading(true)

      let url = `${apiBaseUrl}/admin/product-views?limit=100`
      if (selectedProductId) {
        url += `&productId=${selectedProductId}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Görüntülemeler yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: ProductView[]
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Görüntülemeler yüklenemedi.')
      }

      setViews(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Browser name detection
  const getBrowserName = (userAgent?: string): string => {
    if (!userAgent) return '-'
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edg')) return 'Edge'
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera'
    return 'Bilinmeyen'
  }

  // Time ago utility
  const getTimeAgo = (date: string): string => {
    const now = new Date()
    const viewDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - viewDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Az önce'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`
    return viewDate.toLocaleDateString('tr-TR')
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Kopyalandı!')
    })
  }

  // Filtreleme ve sayfalama
  const filteredViews = views.filter((view) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        view.product.name.toLowerCase().includes(search) ||
        view.product.id.toString().includes(search) ||
        (view.user?.email && view.user.email.toLowerCase().includes(search)) ||
        (view.ipAddress && view.ipAddress.includes(search)) ||
        (view.userAgent && view.userAgent.toLowerCase().includes(search))
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredViews.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedViews = filteredViews.slice(startIndex, endIndex)

  // Genel istatistikler
  const generalStats = {
    totalViews: stats?.totalViews || 0,
    viewsLast24Hours: stats?.viewsLast24Hours || 0,
    viewsLast7Days: stats?.viewsLast7Days || 0,
    viewsLast30Days: stats?.viewsLast30Days || 0,
    totalUniqueProducts: stats?.totalUniqueProducts || 0,
    totalRecords: views.length,
    uniqueUsers: new Set(views.map(v => v.user?.id).filter(Boolean)).size,
    uniqueIPs: new Set(views.map(v => v.ipAddress).filter(Boolean)).size,
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
          <p className="dashboard__eyebrow">Ürün Görüntüleme İstatistikleri</p>
          <h1>Ürün Görüntülemeleri</h1>
          <p>Hangi ürünlerin daha çok görüntülendiğini ve kullanıcı davranışlarını analiz edin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid product-views-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="product-views-stats__title">Genel İstatistikler</h3>
          <div className="product-views-stats__grid">
            <div className="product-views-stat-card product-views-stat-card--primary">
              <div className="product-views-stat-card__icon"><FaEye /></div>
              <div className="product-views-stat-card__value">{generalStats.totalViews}</div>
              <div className="product-views-stat-card__label">Toplam Görüntüleme</div>
              <div className="product-views-stat-card__subtitle">Tüm zamanlar</div>
            </div>
            <div className="product-views-stat-card product-views-stat-card--success">
              <div className="product-views-stat-card__icon"><FaCalendar /></div>
              <div className="product-views-stat-card__value">{generalStats.viewsLast24Hours}</div>
              <div className="product-views-stat-card__label">Son 24 Saat</div>
              <div className="product-views-stat-card__subtitle">Bugün</div>
            </div>
            <div className="product-views-stat-card product-views-stat-card--warning">
              <div className="product-views-stat-card__icon"><FaCalendarAlt /></div>
              <div className="product-views-stat-card__value">{generalStats.viewsLast7Days}</div>
              <div className="product-views-stat-card__label">Son 7 Gün</div>
              <div className="product-views-stat-card__subtitle">Bu hafta</div>
            </div>
            <div className="product-views-stat-card product-views-stat-card--info">
              <div className="product-views-stat-card__icon"><FaChartBar /></div>
              <div className="product-views-stat-card__value">{generalStats.viewsLast30Days}</div>
              <div className="product-views-stat-card__label">Son 30 Gün</div>
              <div className="product-views-stat-card__subtitle">Bu ay</div>
            </div>
            <div className="product-views-stat-card product-views-stat-card--primary">
              <div className="product-views-stat-card__icon"><FaBox /></div>
              <div className="product-views-stat-card__value">{generalStats.totalUniqueProducts}</div>
              <div className="product-views-stat-card__label">Farklı Ürün</div>
              <div className="product-views-stat-card__subtitle">Görüntülenen</div>
            </div>
            <div className="product-views-stat-card product-views-stat-card--success">
              <div className="product-views-stat-card__icon"><FaUser /></div>
              <div className="product-views-stat-card__value">{generalStats.uniqueUsers}</div>
              <div className="product-views-stat-card__label">Farklı Kullanıcı</div>
              <div className="product-views-stat-card__subtitle">Kayıtlı kullanıcı</div>
            </div>
            <div className="product-views-stat-card product-views-stat-card--info">
              <div className="product-views-stat-card__icon"><FaGlobe /></div>
              <div className="product-views-stat-card__value">{generalStats.uniqueIPs}</div>
              <div className="product-views-stat-card__label">Farklı IP</div>
              <div className="product-views-stat-card__subtitle">Benzersiz IP</div>
            </div>
            <div className="product-views-stat-card product-views-stat-card--warning">
              <div className="product-views-stat-card__icon"><FaClipboard /></div>
              <div className="product-views-stat-card__value">{generalStats.totalRecords}</div>
              <div className="product-views-stat-card__label">Toplam Kayıt</div>
              <div className="product-views-stat-card__subtitle">Görüntüleme kaydı</div>
            </div>
          </div>
        </article>
      </section>

      {/* En Çok Görüntülenen Ürünler */}
      {stats?.topViewedProducts && stats.topViewedProducts.length > 0 && (
        <section className="dashboard__grid" style={{ marginBottom: '2rem' }}>
          <article className="dashboard-card dashboard-card--wide">
            <h2 className="product-views-top__title">🏆 En Çok Görüntülenen Ürünler</h2>
            <div className="product-views-top">
              {stats.topViewedProducts.map((product, index) => (
                <div key={product.productId} className="product-views-top__item">
                  <div className="product-views-top__rank">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </div>
                  <div className="product-views-top__content">
                    <div className="product-views-top__name">
                      {product.productName || `Ürün ID: ${product.productId}`}
                    </div>
                    <div className="product-views-top__id">ID: {product.productId}</div>
                  </div>
                  <div className="product-views-top__count">
                    <span className="product-views-top__count-value">{product.viewCount}</span>
                    <span className="product-views-top__count-label">görüntüleme</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="product-views-filters">
            <div className="product-views-filters__row">
              <div className="product-views-filters__search">
                <input
                  type="text"
                  className="product-views-filters__input"
                  placeholder="Ara (ürün adı, ID, kullanıcı, IP...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="product-views-filters__actions">
                <input
                  type="number"
                  className="product-views-filters__product-id"
                  placeholder="Ürün ID"
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value)
                    setCurrentPage(1)
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary product-views-view-toggle product-views-view-toggle--desktop"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                >
                  {viewMode === 'table' ? <><FaTable style={{ marginRight: '0.5rem' }} /> Kart</> : <><FaChartBar style={{ marginRight: '0.5rem' }} /> Tablo</>}
                </button>
                {(searchTerm || selectedProductId) && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedProductId('')
                      setCurrentPage(1)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="product-views-header">
            <div className="product-views-header__info">
              <span className="product-views-header__count">
                Toplam: <strong>{filteredViews.length}</strong> görüntüleme
              </span>
              {filteredViews.length !== views.length && (
                <span className="product-views-header__filtered">
                  (Filtrelenmiş: {filteredViews.length} / {views.length})
                </span>
              )}
            </div>
            <div className="product-views-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {views.length === 0 ? (
            <p className="dashboard-card__empty">Henüz görüntüleme kaydı bulunmuyor.</p>
          ) : filteredViews.length === 0 ? (
            <p className="dashboard-card__empty">Arama kriterlerinize uygun görüntüleme bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table product-views-table-desktop ${viewMode === 'table' ? '' : 'product-views-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Ürün</th>
                      <th>Kullanıcı</th>
                      <th>IP Adresi</th>
                      <th>Tarayıcı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedViews.map((view) => (
                      <tr key={view.id}>
                        <td>
                          <div className="product-views-table__date">
                            <div className="product-views-table__date-main">
                              {new Date(view.viewedAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="product-views-table__date-ago">
                              {getTimeAgo(view.viewedAt)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="product-views-table__product">
                            <div className="product-views-table__product-name">{view.product.name}</div>
                            <div className="product-views-table__product-id">ID: {view.product.id}</div>
                          </div>
                        </td>
                        <td>
                          <div className="product-views-table__user">
                            {view.user ? (
                              <span className="product-views-table__user-email">{view.user.email}</span>
                            ) : (
                              <span className="product-views-table__user-guest"><FaUser style={{ marginRight: '0.25rem' }} /> Misafir</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="product-views-table__ip">
                            {view.ipAddress ? (
                              <>
                                <span className="product-views-table__ip-value">{view.ipAddress}</span>
                                <button
                                  className="product-views-table__copy-btn"
                                  onClick={() => copyToClipboard(view.ipAddress!)}
                                  title="IP'yi kopyala"
                                >
                                  <FaClipboard />
                                </button>
                              </>
                            ) : (
                              <span className="product-views-table__ip-empty">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="product-views-table__browser">
                            <div className="product-views-table__browser-name">
                              {getBrowserName(view.userAgent)}
                            </div>
                            {view.userAgent && (
                              <div className="product-views-table__browser-ua" title={view.userAgent}>
                                {view.userAgent.length > 50 ? view.userAgent.substring(0, 50) + '...' : view.userAgent}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`product-views-cards ${viewMode === 'cards' ? '' : 'product-views-cards--hidden'}`}>
                {paginatedViews.map((view) => (
                  <div key={view.id} className="product-view-card">
                    <div className="product-view-card__header">
                      <div className="product-view-card__header-left">
                        <div className="product-view-card__product">
                          <div className="product-view-card__product-name"><FaBox style={{ marginRight: '0.25rem' }} /> {view.product.name}</div>
                          <div className="product-view-card__product-id">ID: {view.product.id}</div>
                        </div>
                      </div>
                      <div className="product-view-card__time">
                        <div className="product-view-card__time-main">
                          {new Date(view.viewedAt).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="product-view-card__time-ago">{getTimeAgo(view.viewedAt)}</div>
                      </div>
                    </div>
                    <div className="product-view-card__body">
                      <div className="product-view-card__row">
                        <div className="product-view-card__icon"><FaUser /></div>
                        <div className="product-view-card__content">
                          <div className="product-view-card__label">Kullanıcı</div>
                          <div className="product-view-card__value">
                            {view.user ? (
                              <span className="product-view-card__user-email">{view.user.email}</span>
                            ) : (
                              <span className="product-view-card__user-guest">Misafir</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {view.ipAddress && (
                        <div className="product-view-card__row">
                          <div className="product-view-card__icon"><FaGlobe /></div>
                          <div className="product-view-card__content">
                            <div className="product-view-card__label">IP Adresi</div>
                            <div className="product-view-card__value-group">
                              <span className="product-view-card__value product-view-card__value--ip">{view.ipAddress}</span>
                              <button
                                type="button"
                                className="product-view-card__copy-btn"
                                onClick={() => copyToClipboard(view.ipAddress!)}
                                title="Kopyala"
                              >
                                <FaClipboard />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {view.userAgent && (
                        <div className="product-view-card__row">
                          <div className="product-view-card__icon">🌍</div>
                          <div className="product-view-card__content">
                            <div className="product-view-card__label">Tarayıcı</div>
                            <div className="product-view-card__value">
                              <div className="product-view-card__browser-name">{getBrowserName(view.userAgent)}</div>
                              <div className="product-view-card__browser-ua" title={view.userAgent}>
                                {view.userAgent.length > 60 ? view.userAgent.substring(0, 60) + '...' : view.userAgent}
                              </div>
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
                <div className="product-views-pagination">
                  <button
                    type="button"
                    className="product-views-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="product-views-pagination__btn"
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
                        className={`product-views-pagination__btn product-views-pagination__btn--number ${
                          currentPage === pageNum ? 'product-views-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="product-views-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="product-views-pagination__btn"
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

export default ProductViewsPage


import { useEffect, useState } from 'react'
import { FaCheckCircle, FaBox, FaChartBar, FaClipboard, FaTable, FaCalendar, FaShoppingCart, FaDollarSign, FaMoneyBill, FaEnvelope } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'

type CartsPageProps = {
  session: AuthResponse
}

type Cart = {
  cartId?: number
  userId?: number
  userEmail: string
  itemCount: number
  totalAmount: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function CartsPage({ session }: CartsPageProps) {
  const [carts, setCarts] = useState<Cart[]>([])
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

  useEffect(() => {
    const fetchCarts = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/admin/carts`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Sepetler yüklenemedi.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Cart[]
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Sepetler yüklenemedi.')
        }

        setCarts(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCarts()
  }, [session.accessToken])

  // Filtreleme ve sayfalama
  const filteredCarts = carts.filter((cart) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        cart.userEmail.toLowerCase().includes(search) ||
        (cart.userId && cart.userId.toString().includes(search)) ||
        (cart.cartId && cart.cartId.toString().includes(search)) ||
        (cart.status && cart.status.toLowerCase().includes(search))
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredCarts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCarts = filteredCarts.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: carts.length,
    active: carts.filter((c) => c.status === 'ACTIVE' || !c.status).length,
    totalItems: carts.reduce((sum, c) => sum + c.itemCount, 0),
    totalAmount: carts.reduce((sum, c) => sum + c.totalAmount, 0),
    averageItems: carts.length > 0 ? (carts.reduce((sum, c) => sum + c.itemCount, 0) / carts.length).toFixed(1) : '0',
    averageAmount: carts.length > 0 ? (carts.reduce((sum, c) => sum + c.totalAmount, 0) / carts.length).toFixed(2) : '0',
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
          <p className="dashboard__eyebrow">Sepet Yönetimi</p>
          <h1>Kullanıcı Sepetleri</h1>
          <p>Kullanıcıların sepet durumlarını görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid carts-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="carts-stats__title">Genel İstatistikler</h3>
          <div className="carts-stats__grid">
            <div className="carts-stat-card carts-stat-card--primary">
              <div className="carts-stat-card__icon"><FaShoppingCart /></div>
              <div className="carts-stat-card__value">{stats.total}</div>
              <div className="carts-stat-card__label">Toplam Sepet</div>
            </div>
            <div className="carts-stat-card carts-stat-card--success">
              <div className="carts-stat-card__icon"><FaCheckCircle /></div>
              <div className="carts-stat-card__value">{stats.active}</div>
              <div className="carts-stat-card__label">Aktif Sepet</div>
            </div>
            <div className="carts-stat-card carts-stat-card--warning">
              <div className="carts-stat-card__icon"><FaBox /></div>
              <div className="carts-stat-card__value">{stats.totalItems}</div>
              <div className="carts-stat-card__label">Toplam Ürün</div>
            </div>
            <div className="carts-stat-card carts-stat-card--info">
              <div className="carts-stat-card__icon"><FaDollarSign /></div>
              <div className="carts-stat-card__value">{stats.totalAmount.toFixed(2)} ₺</div>
              <div className="carts-stat-card__label">Toplam Tutar</div>
            </div>
            <div className="carts-stat-card carts-stat-card--purple">
              <div className="carts-stat-card__icon"><FaChartBar /></div>
              <div className="carts-stat-card__value">{stats.averageItems}</div>
              <div className="carts-stat-card__label">Ort. Ürün</div>
            </div>
            <div className="carts-stat-card carts-stat-card--blue">
              <div className="carts-stat-card__icon"><FaMoneyBill /></div>
              <div className="carts-stat-card__value">{stats.averageAmount} ₺</div>
              <div className="carts-stat-card__label">Ort. Tutar</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <div className="carts-filters">
            <div className="carts-filters__row carts-filters__row--search-only">
              <div className="carts-filters__search">
                <input
                  type="text"
                  className="carts-filters__input"
                  placeholder="Sepet ara (e-posta, kullanıcı ID, sepet ID, durum...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="carts-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary carts-view-toggle carts-view-toggle--desktop"
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

          <div className="carts-header">
            <div className="carts-header__info">
              <span className="carts-header__count">
                Toplam: <strong>{filteredCarts.length}</strong> sepet
              </span>
              {filteredCarts.length !== carts.length && (
                <span className="carts-header__filtered">
                  (Filtrelenmiş: {filteredCarts.length} / {carts.length})
                </span>
              )}
            </div>
            <div className="carts-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {filteredCarts.length === 0 ? (
            <p className="dashboard-card__empty">Sepet bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table carts-table-desktop ${viewMode === 'table' ? '' : 'carts-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Sepet ID</th>
                      <th>Kullanıcı ID</th>
                      <th>E-posta</th>
                      <th>Ürün Sayısı</th>
                      <th>Toplam Tutar</th>
                      <th>Durum</th>
                      <th>Oluşturulma</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCarts.map((cart) => (
                      <tr key={cart.cartId || cart.userId}>
                        <td>{cart.cartId || '-'}</td>
                        <td>{cart.userId || 'Guest'}</td>
                        <td>{cart.userEmail}</td>
                        <td>
                          <span className="dashboard-card__chip">{cart.itemCount}</span>
                        </td>
                        <td><strong>{cart.totalAmount.toFixed(2)} ₺</strong></td>
                        <td>
                          <span className={`dashboard-card__chip ${cart.status === 'ACTIVE' || !cart.status ? 'dashboard-card__chip--success' : ''}`}>
                            {cart.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td>{cart.createdAt ? new Date(cart.createdAt).toLocaleString('tr-TR') : '-'}</td>
                        <td>
                          {cart.cartId && (
                            <button
                              className="btn btn-primary"
                              onClick={() => {
                                window.open(`${apiBaseUrl}/admin/carts/${cart.cartId}/details`, '_blank')
                              }}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                            >
                              Detay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`carts-cards ${viewMode === 'cards' ? '' : 'carts-cards--hidden'}`}>
                {paginatedCarts.map((cart) => (
                  <div key={cart.cartId || cart.userId} className="cart-card">
                    <div className="cart-card__header">
                      <div className="cart-card__header-left">
                        <div className="cart-card__title">
                          Sepet #{cart.cartId || 'N/A'}
                        </div>
                        <div className="cart-card__meta">
                          <span className={`cart-card__badge ${cart.status === 'ACTIVE' || !cart.status ? 'cart-card__badge--active' : ''}`}>
                            {cart.status || 'ACTIVE'}
                          </span>
                          <span className="cart-card__id">Kullanıcı: {cart.userId || 'Guest'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="cart-card__body">
                      <div className="cart-card__row">
                        <div className="cart-card__icon"><FaEnvelope /></div>
                        <div className="cart-card__content">
                          <div className="cart-card__label">E-posta</div>
                          <div className="cart-card__value">{cart.userEmail}</div>
                        </div>
                      </div>
                      <div className="cart-card__row">
                        <div className="cart-card__icon"><FaBox /></div>
                        <div className="cart-card__content">
                          <div className="cart-card__label">Ürün Sayısı</div>
                          <div className="cart-card__value cart-card__value--highlight">{cart.itemCount} ürün</div>
                        </div>
                      </div>
                      <div className="cart-card__row">
                        <div className="cart-card__icon"><FaDollarSign /></div>
                        <div className="cart-card__content">
                          <div className="cart-card__label">Toplam Tutar</div>
                          <div className="cart-card__value cart-card__value--amount">{cart.totalAmount.toFixed(2)} ₺</div>
                        </div>
                      </div>
                      {cart.createdAt && (
                        <div className="cart-card__row">
                          <div className="cart-card__icon"><FaCalendar /></div>
                          <div className="cart-card__content">
                            <div className="cart-card__label">Oluşturulma</div>
                            <div className="cart-card__value cart-card__value--date">
                              {new Date(cart.createdAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="cart-card__footer">
                      {cart.cartId && (
                        <button
                          className="btn btn-primary cart-card__action-btn"
                          onClick={() => {
                            window.open(`${apiBaseUrl}/admin/carts/${cart.cartId}/details`, '_blank')
                          }}
                        >
                          <FaClipboard style={{ marginRight: '0.25rem' }} /> Detayları Gör
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="carts-pagination">
                  <button
                    type="button"
                    className="carts-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="carts-pagination__btn"
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
                        className={`carts-pagination__btn carts-pagination__btn--number ${
                          currentPage === pageNum ? 'carts-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="carts-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="carts-pagination__btn"
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

export default CartsPage


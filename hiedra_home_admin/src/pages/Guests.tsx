import { useEffect, useState } from 'react'
import { FaCheckCircle, FaBox, FaEye, FaClipboard, FaTable, FaChartBar, FaGlobe, FaCalendar, FaUser, FaShoppingCart, FaMobile, FaBolt, FaEnvelope } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'

type GuestsPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
}

type GuestUser = {
  id: number
  email: string
  fullName: string
  phone?: string
  ipAddress?: string
  userAgent?: string
  firstSeenAt: string
  lastSeenAt: string
  orderCount: number
  viewCount: number
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function GuestsPage({ session, toast }: GuestsPageProps) {
  const [guests, setGuests] = useState<GuestUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedGuest, setSelectedGuest] = useState<GuestUser | null>(null)

  useEffect(() => {
    fetchGuests()
  }, [session.accessToken, showActiveOnly])

  const fetchGuests = async () => {
    try {
      setIsLoading(true)

      const url = showActiveOnly
        ? `${apiBaseUrl}/admin/guests/active`
        : `${apiBaseUrl}/admin/guests`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Guest kullanıcılar yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: GuestUser[]
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Guest kullanıcılar yüklenemedi.')
      }

      setGuests(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtreleme ve sayfalama
  const filteredGuests = guests.filter((guest) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        guest.email.toLowerCase().includes(search) ||
        guest.fullName.toLowerCase().includes(search) ||
        (guest.phone && guest.phone.includes(search)) ||
        (guest.ipAddress && guest.ipAddress.includes(search)) ||
        guest.id.toString().includes(search)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredGuests.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedGuests = filteredGuests.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: guests.length,
    withOrders: guests.filter((g) => g.orderCount > 0).length,
    totalOrders: guests.reduce((sum, g) => sum + g.orderCount, 0),
    totalViews: guests.reduce((sum, g) => sum + g.viewCount, 0),
    active: guests.filter((g) => {
      const lastSeen = new Date(g.lastSeenAt)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      return lastSeen >= thirtyMinutesAgo
    }).length,
    withPhone: guests.filter((g) => g.phone).length,
  }

  // IP adresini kopyalama
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Kopyalandı!')
    })
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
          <p className="dashboard__eyebrow">Guest Kullanıcı Yönetimi</p>
          <h1>Giriş Yapmamış Kullanıcılar</h1>
          <p>Sisteme giriş yapmadan satın alan kullanıcıları görüntüleyin ve analiz edin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid guests-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="guests-stats__title">Genel İstatistikler</h3>
          <div className="guests-stats__grid">
            <div className="guests-stat-card guests-stat-card--primary">
              <div className="guests-stat-card__icon"><FaUser /></div>
              <div className="guests-stat-card__value">{stats.total}</div>
              <div className="guests-stat-card__label">Toplam Guest</div>
            </div>
            <div className="guests-stat-card guests-stat-card--success">
              <div className="guests-stat-card__icon"><FaCheckCircle /></div>
              <div className="guests-stat-card__value">{stats.active}</div>
              <div className="guests-stat-card__label">Aktif (30 dk)</div>
            </div>
            <div className="guests-stat-card guests-stat-card--warning">
              <div className="guests-stat-card__icon"><FaShoppingCart /></div>
              <div className="guests-stat-card__value">{stats.withOrders}</div>
              <div className="guests-stat-card__label">Sipariş Veren</div>
            </div>
            <div className="guests-stat-card guests-stat-card--info">
              <div className="guests-stat-card__icon"><FaBox /></div>
              <div className="guests-stat-card__value">{stats.totalOrders}</div>
              <div className="guests-stat-card__label">Toplam Sipariş</div>
            </div>
            <div className="guests-stat-card guests-stat-card--purple">
              <div className="guests-stat-card__icon"><FaEye /></div>
              <div className="guests-stat-card__value">{stats.totalViews}</div>
              <div className="guests-stat-card__label">Toplam Görüntüleme</div>
            </div>
            <div className="guests-stat-card guests-stat-card--blue">
              <div className="guests-stat-card__icon"><FaMobile /></div>
              <div className="guests-stat-card__value">{stats.withPhone}</div>
              <div className="guests-stat-card__label">Telefonlu</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <div className="guests-filters">
            <div className="guests-filters__row">
              <div className="guests-filters__search">
                <input
                  type="text"
                  className="guests-filters__input"
                  placeholder="Guest ara (e-posta, ad soyad, telefon, IP adresi...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="guests-filters__actions">
                <label className="guests-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => {
                      setShowActiveOnly(e.target.checked)
                      setCurrentPage(1)
                    }}
                  />
                  <span><FaBolt style={{ marginRight: '0.25rem' }} /> Sadece Aktif (30 dk)</span>
                </label>
                <button
                  type="button"
                  className="btn btn-primary guests-view-toggle guests-view-toggle--desktop"
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

          <div className="guests-header">
            <div className="guests-header__info">
              <span className="guests-header__count">
                Toplam: <strong>{filteredGuests.length}</strong> guest
              </span>
              {filteredGuests.length !== guests.length && (
                <span className="guests-header__filtered">
                  (Filtrelenmiş: {filteredGuests.length} / {guests.length})
                </span>
              )}
            </div>
            <div className="guests-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {filteredGuests.length === 0 ? (
            <p className="dashboard-card__empty">Guest kullanıcı bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table guests-table-desktop ${viewMode === 'table' ? '' : 'guests-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>E-posta</th>
                      <th>Ad Soyad</th>
                      <th>Telefon</th>
                      <th>Sipariş</th>
                      <th>Görüntüleme</th>
                      <th>İlk Görülme</th>
                      <th>Son Görülme</th>
                      <th>IP Adresi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGuests.map((guest) => (
                      <tr key={guest.id}>
                        <td>{guest.email}</td>
                        <td><strong>{guest.fullName}</strong></td>
                        <td>{guest.phone || <span style={{ color: '#999' }}>-</span>}</td>
                        <td>
                          <span className="dashboard-card__chip dashboard-card__chip--success">
                            {guest.orderCount}
                          </span>
                        </td>
                        <td>
                          <span className="dashboard-card__chip">
                            {guest.viewCount}
                          </span>
                        </td>
                        <td>
                          <div className="guests-table__date">
                            {new Date(guest.firstSeenAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="guests-table__date">
                            {new Date(guest.lastSeenAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          {guest.ipAddress ? (
                            <div className="guests-table__ip">
                              <span>{guest.ipAddress}</span>
                              <button
                                className="guests-table__ip-copy"
                                onClick={() => copyToClipboard(guest.ipAddress!)}
                                title="IP'yi kopyala"
                              >
                                <FaClipboard />
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`guests-cards ${viewMode === 'cards' ? '' : 'guests-cards--hidden'}`}>
                {paginatedGuests.map((guest) => (
                  <div key={guest.id} className="guest-card" onClick={() => setSelectedGuest(guest)}>
                    <div className="guest-card__header">
                      <div className="guest-card__header-left">
                        <div className="guest-card__name">{guest.fullName}</div>
                        <div className="guest-card__meta">
                          {guest.orderCount > 0 && (
                            <span className="guest-card__badge guest-card__badge--orders">
                              <FaShoppingCart style={{ marginRight: '0.25rem' }} /> {guest.orderCount} Sipariş
                            </span>
                          )}
                          <span className="guest-card__id">#{guest.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="guest-card__body">
                      <div className="guest-card__row">
                        <div className="guest-card__icon"><FaEnvelope /></div>
                        <div className="guest-card__content">
                          <div className="guest-card__label">E-posta</div>
                          <div className="guest-card__value">{guest.email}</div>
                        </div>
                      </div>
                      {guest.phone && (
                        <div className="guest-card__row">
                          <div className="guest-card__icon">📱</div>
                          <div className="guest-card__content">
                            <div className="guest-card__label">Telefon</div>
                            <div className="guest-card__value">{guest.phone}</div>
                          </div>
                        </div>
                      )}
                      <div className="guest-card__row">
                        <div className="guest-card__icon"><FaChartBar /></div>
                        <div className="guest-card__content">
                          <div className="guest-card__label">İstatistikler</div>
                          <div className="guest-card__stats">
                            <span className="guest-card__stat-item">
                              <strong>{guest.orderCount}</strong> Sipariş
                            </span>
                            <span className="guest-card__stat-item">
                              <strong>{guest.viewCount}</strong> Görüntüleme
                            </span>
                          </div>
                        </div>
                      </div>
                      {guest.ipAddress && (
                        <div className="guest-card__row">
                          <div className="guest-card__icon"><FaGlobe /></div>
                          <div className="guest-card__content">
                            <div className="guest-card__label">IP Adresi</div>
                            <div className="guest-card__value-group">
                              <span className="guest-card__value">{guest.ipAddress}</span>
                              <button
                                type="button"
                                className="guest-card__copy-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(guest.ipAddress!)
                                }}
                                title="Kopyala"
                              >
                                <FaClipboard />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="guest-card__row">
                        <div className="guest-card__icon"><FaCalendar /></div>
                        <div className="guest-card__content">
                          <div className="guest-card__label">İlk Görülme</div>
                          <div className="guest-card__value guest-card__value--date">
                            {new Date(guest.firstSeenAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="guest-card__row">
                        <div className="guest-card__icon">🕐</div>
                        <div className="guest-card__content">
                          <div className="guest-card__label">Son Görülme</div>
                          <div className="guest-card__value guest-card__value--date">
                            {new Date(guest.lastSeenAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="guests-pagination">
                  <button
                    type="button"
                    className="guests-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="guests-pagination__btn"
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
                        className={`guests-pagination__btn guests-pagination__btn--number ${
                          currentPage === pageNum ? 'guests-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="guests-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="guests-pagination__btn"
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
      {selectedGuest && (
        <div
          className="guest-modal-overlay"
          onClick={() => setSelectedGuest(null)}
        >
          <div
            className="guest-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="guest-modal__header">
              <h2 className="guest-modal__title">Guest Kullanıcı Detayları</h2>
              <button
                type="button"
                className="guest-modal__close"
                onClick={() => setSelectedGuest(null)}
              >
                ✕
              </button>
            </div>
            <div className="guest-modal__content">
              <div className="guest-modal__item">
                <div className="guest-modal__label">ID</div>
                <div className="guest-modal__value">#{selectedGuest.id}</div>
              </div>
              <div className="guest-modal__item">
                <div className="guest-modal__label">Ad Soyad</div>
                <div className="guest-modal__value guest-modal__value--name">{selectedGuest.fullName}</div>
              </div>
              <div className="guest-modal__item">
                <div className="guest-modal__label">E-posta</div>
                <div className="guest-modal__value-group">
                  <span className="guest-modal__value">{selectedGuest.email}</span>
                  <button
                    type="button"
                    className="guest-modal__copy-btn"
                    onClick={() => copyToClipboard(selectedGuest.email)}
                    title="Kopyala"
                  >
                    <FaClipboard />
                  </button>
                </div>
              </div>
              {selectedGuest.phone && (
                <div className="guest-modal__item">
                  <div className="guest-modal__label">Telefon</div>
                  <div className="guest-modal__value-group">
                    <span className="guest-modal__value">{selectedGuest.phone}</span>
                    <button
                      type="button"
                      className="guest-modal__copy-btn"
                      onClick={() => copyToClipboard(selectedGuest.phone!)}
                      title="Kopyala"
                    >
                      <FaClipboard />
                    </button>
                  </div>
                </div>
              )}
              <div className="guest-modal__item">
                <div className="guest-modal__label">Sipariş Sayısı</div>
                <div className="guest-modal__value">
                  <span className="dashboard-card__chip dashboard-card__chip--success">
                    {selectedGuest.orderCount}
                  </span>
                </div>
              </div>
              <div className="guest-modal__item">
                <div className="guest-modal__label">Görüntüleme Sayısı</div>
                <div className="guest-modal__value">
                  <span className="dashboard-card__chip">
                    {selectedGuest.viewCount}
                  </span>
                </div>
              </div>
              {selectedGuest.ipAddress && (
                <div className="guest-modal__item">
                  <div className="guest-modal__label">IP Adresi</div>
                  <div className="guest-modal__value-group">
                    <span className="guest-modal__value guest-modal__value--ip">{selectedGuest.ipAddress}</span>
                    <button
                      type="button"
                      className="guest-modal__copy-btn"
                      onClick={() => copyToClipboard(selectedGuest.ipAddress!)}
                      title="Kopyala"
                    >
                      <FaClipboard />
                    </button>
                  </div>
                </div>
              )}
              {selectedGuest.userAgent && (
                <div className="guest-modal__item">
                  <div className="guest-modal__label">User Agent</div>
                  <div className="guest-modal__value guest-modal__value--multiline">{selectedGuest.userAgent}</div>
                </div>
              )}
              <div className="guest-modal__item">
                <div className="guest-modal__label">İlk Görülme</div>
                <div className="guest-modal__value">
                  {new Date(selectedGuest.firstSeenAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="guest-modal__item">
                <div className="guest-modal__label">Son Görülme</div>
                <div className="guest-modal__value">
                  {new Date(selectedGuest.lastSeenAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default GuestsPage


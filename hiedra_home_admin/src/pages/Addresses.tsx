import { useEffect, useState } from 'react'
import { FaBox, FaClipboard, FaTable, FaChartBar, FaTrash, FaUser, FaStar, FaMapMarkerAlt, FaCity, FaHome } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import ConfirmModal from '../components/ConfirmModal'

type AddressesPageProps = {
  session: AuthResponse
}

type Address = {
  id: number
  fullName: string
  phone: string
  addressLine: string
  addressDetail?: string | null
  city: string
  district: string
  isDefault: boolean
  createdAt: string
  userId?: number | null
  userEmail?: string | null
  orderId?: number | null
  orderNumber?: string | null
}

type SortField = 'id' | 'fullName' | 'city' | 'district' | 'createdAt'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function AddressesPage({ session }: AddressesPageProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; addressId: number | null }>({
    isOpen: false,
    addressId: null,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/admin/addresses`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Adresler yüklenemedi.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Address[]
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Adresler yüklenemedi.')
        }

        setAddresses(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddresses()
  }, [session.accessToken])

  const filteredAddresses = addresses
    .filter((address) => {
      // Arama kontrolü
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          address.fullName.toLowerCase().includes(search) ||
          address.phone.includes(search) ||
          address.addressLine.toLowerCase().includes(search) ||
          address.city.toLowerCase().includes(search) ||
          address.district.toLowerCase().includes(search) ||
          (address.userEmail && address.userEmail.toLowerCase().includes(search)) ||
          (address.orderNumber && address.orderNumber.toLowerCase().includes(search))
        )
      }

      return true
    })
    .sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

  // Sayfalama
  const totalPages = Math.ceil(filteredAddresses.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedAddresses = filteredAddresses.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: addresses.length,
    userAddresses: addresses.filter((a) => a.userId).length,
    orderAddresses: addresses.filter((a) => a.orderId).length,
    defaultAddresses: addresses.filter((a) => a.isDefault).length,
    uniqueCities: new Set(addresses.map((a) => a.city)).size,
    uniqueDistricts: new Set(addresses.map((a) => a.district)).size,
  }


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const handleDeleteClick = (id: number) => {
    setDeleteModal({ isOpen: true, addressId: id })
  }

  const handleDelete = async () => {
    if (!deleteModal.addressId) {
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/addresses/${deleteModal.addressId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Adres silinemedi.')
      }

      setAddresses(addresses.filter((addr) => addr.id !== deleteModal.addressId))
      setDeleteModal({ isOpen: false, addressId: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Adres silinirken bir hata oluştu.'
      setError(message)
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(type)
      setTimeout(() => setCopySuccess(null), 2000)
    })
  }

  const copyFullAddress = (address: Address) => {
    const fullAddress = `${address.fullName}\n${address.addressLine}${
      address.addressDetail ? `, ${address.addressDetail}` : ''
    }\n${address.district}, ${address.city}\nTürkiye`
    copyToClipboard(fullAddress, `address-${address.id}`)
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Ad Soyad', 'Telefon', 'Adres', 'Adres Detay', 'Şehir', 'İlçe', 'Varsayılan', 'Kullanıcı ID', 'Kullanıcı E-posta', 'Sipariş ID', 'Sipariş No', 'Oluşturulma']
    const rows = filteredAddresses.map((addr) => [
      addr.id,
      addr.fullName,
      addr.phone,
      addr.addressLine,
      addr.addressDetail || '',
      addr.city,
      addr.district,
      addr.isDefault ? 'Evet' : 'Hayır',
      addr.userId || '',
      addr.userEmail || '',
      addr.orderId || '',
      addr.orderNumber || '',
      new Date(addr.createdAt).toLocaleString('tr-TR'),
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `adresler_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
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
          <p className="dashboard__eyebrow">Adres Yönetimi</p>
          <h1>Adresler</h1>
          <p>Sistemdeki tüm adresleri görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid addresses-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="addresses-stats__title">Genel İstatistikler</h3>
          <div className="addresses-stats__grid">
            <div className="addresses-stat-card addresses-stat-card--primary">
              <div className="addresses-stat-card__icon"><FaMapMarkerAlt /></div>
              <div className="addresses-stat-card__value">{stats.total}</div>
              <div className="addresses-stat-card__label">Toplam Adres</div>
            </div>
            <div className="addresses-stat-card addresses-stat-card--success">
              <div className="addresses-stat-card__icon"><FaUser /></div>
              <div className="addresses-stat-card__value">{stats.userAddresses}</div>
              <div className="addresses-stat-card__label">Kullanıcı Adresi</div>
            </div>
            <div className="addresses-stat-card addresses-stat-card--warning">
              <div className="addresses-stat-card__icon"><FaBox /></div>
              <div className="addresses-stat-card__value">{stats.orderAddresses}</div>
              <div className="addresses-stat-card__label">Sipariş Adresi</div>
            </div>
            <div className="addresses-stat-card addresses-stat-card--info">
              <div className="addresses-stat-card__icon"><FaStar /></div>
              <div className="addresses-stat-card__value">{stats.defaultAddresses}</div>
              <div className="addresses-stat-card__label">Varsayılan</div>
            </div>
            <div className="addresses-stat-card addresses-stat-card--purple">
              <div className="addresses-stat-card__icon"><FaCity /></div>
              <div className="addresses-stat-card__value">{stats.uniqueCities}</div>
              <div className="addresses-stat-card__label">Farklı Şehir</div>
            </div>
            <div className="addresses-stat-card addresses-stat-card--blue">
              <div className="addresses-stat-card__icon"><FaHome /></div>
              <div className="addresses-stat-card__value">{stats.uniqueDistricts}</div>
              <div className="addresses-stat-card__label">Farklı İlçe</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <div className="addresses-filters">
            <div className="addresses-filters__row addresses-filters__row--search-only">
              <div className="addresses-filters__search">
                <input
                  type="text"
                  className="addresses-filters__input"
                  placeholder="Adres ara (isim, telefon, şehir, ilçe...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="addresses-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary addresses-view-toggle addresses-view-toggle--desktop"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                >
                  {viewMode === 'table' ? <><FaTable style={{ marginRight: '0.5rem' }} /> Kart</> : <><FaChartBar style={{ marginRight: '0.5rem' }} /> Tablo</>}
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={exportToCSV}
                >
                  📥 CSV
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

          <div className="addresses-header">
            <div className="addresses-header__info">
              <span className="addresses-header__count">
                Toplam: <strong>{filteredAddresses.length}</strong> adres
              </span>
              {filteredAddresses.length !== addresses.length && (
                <span className="addresses-header__filtered">
                  (Filtrelenmiş: {filteredAddresses.length} / {addresses.length})
                </span>
              )}
            </div>
            <div className="addresses-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {copySuccess && (
            <div className="addresses-copy-success">
              ✓ Kopyalandı!
            </div>
          )}

          {filteredAddresses.length === 0 ? (
            <p className="dashboard-card__empty">Adres bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View - Mobilde gizli */}
              <div className={`dashboard-card__table addresses-table-desktop ${viewMode === 'table' ? '' : 'addresses-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('id')}>
                        ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('fullName')}>
                        Ad Soyad {sortField === 'fullName' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Telefon</th>
                      <th>Adres</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('city')}>
                        Şehir/İlçe {sortField === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Kullanıcı</th>
                      <th>Sipariş</th>
                      <th>Varsayılan</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('createdAt')}>
                        Oluşturulma {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAddresses.map((address) => (
                      <tr key={address.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAddress(address)}>
                        <td>{address.id}</td>
                        <td>{address.fullName}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {address.phone}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(address.phone, `phone-${address.id}`)
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                              title="Telefonu kopyala"
                            >
                              <FaClipboard />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ maxWidth: '200px' }}>
                            <div>{address.addressLine}</div>
                            {address.addressDetail && (
                              <div style={{ fontSize: '0.85rem', color: '#666' }}>{address.addressDetail}</div>
                            )}
                          </div>
                        </td>
                        <td>
                          {address.district}, {address.city}
                          <br />
                          <span style={{ fontSize: '0.85rem', color: '#666' }}>Türkiye</span>
                        </td>
                        <td>
                          {address.userId ? (
                            <div>
                              <div style={{ fontWeight: '500' }}>ID: {address.userId}</div>
                              {address.userEmail && (
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>{address.userEmail}</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td>
                          {address.orderId ? (
                            <div>
                              <div style={{ fontWeight: '500' }}>ID: {address.orderId}</div>
                              {address.orderNumber && (
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>{address.orderNumber}</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td>
                          {address.isDefault ? (
                            <span className="dashboard-card__chip dashboard-card__chip--success">Evet</span>
                          ) : (
                            <span className="dashboard-card__chip">Hayır</span>
                          )}
                        </td>
                        <td>{new Date(address.createdAt).toLocaleDateString('tr-TR')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyFullAddress(address)
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                              }}
                              title="Tam adresi kopyala"
                            >
                              <FaClipboard />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(address.id)
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                              }}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Sayfalama */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage === 1 ? '#ccc' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage === 1 ? '#ccc' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
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
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: currentPage === pageNum ? '#667eea' : '#f0f0f0',
                          color: currentPage === pageNum ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage === totalPages ? '#ccc' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage === totalPages ? '#ccc' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Son
                  </button>
                </div>
              )}

              {/* Mobile/Tablet Card View - Mobilde her zaman görünür */}
              <div className={`addresses-cards ${viewMode === 'cards' ? '' : 'addresses-cards--hidden'}`}>
                {paginatedAddresses.map((address) => (
                  <div
                    key={address.id}
                    className="address-card"
                    onClick={() => setSelectedAddress(address)}
                  >
                    <div className="address-card__header">
                      <div className="address-card__header-left">
                        <div className="address-card__name">{address.fullName}</div>
                        <div className="address-card__meta">
                          {address.isDefault && (
                            <span className="address-card__badge address-card__badge--default">Varsayılan</span>
                          )}
                          <span className="address-card__id">#{address.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="address-card__body">
                      <div className="address-card__row">
                        <div className="address-card__icon">📱</div>
                        <div className="address-card__content">
                          <div className="address-card__label">Telefon</div>
                          <div className="address-card__value-group">
                            <span className="address-card__value">{address.phone}</span>
                            <button
                              type="button"
                              className="address-card__copy-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(address.phone, `phone-${address.id}`)
                              }}
                              title="Kopyala"
                            >
                              <FaClipboard />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="address-card__row">
                        <div className="address-card__icon"><FaMapMarkerAlt /></div>
                        <div className="address-card__content">
                          <div className="address-card__label">Adres</div>
                          <div className="address-card__value address-card__value--multiline">
                            {address.addressLine}
                            {address.addressDetail && (
                              <span className="address-card__detail">, {address.addressDetail}</span>
                            )}
                            <br />
                            <span className="address-card__location">
                              {address.district}, {address.city}
                            </span>
                            <br />
                            <span className="address-card__country">Türkiye</span>
                          </div>
                        </div>
                      </div>
                      {(address.userId || address.orderId) && (
                        <div className="address-card__row address-card__row--meta">
                          <div className="address-card__icon">🔗</div>
                          <div className="address-card__content">
                            {address.userId && (
                              <div className="address-card__meta-item">
                                <strong>Kullanıcı:</strong> ID {address.userId}
                                {address.userEmail && ` (${address.userEmail})`}
                              </div>
                            )}
                            {address.orderId && (
                              <div className="address-card__meta-item">
                                <strong>Sipariş:</strong> ID {address.orderId}
                                {address.orderNumber && ` (${address.orderNumber})`}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="address-card__footer">
                      <button
                        type="button"
                        className="btn btn-primary address-card__action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyFullAddress(address)
                        }}
                      >
                        <FaClipboard style={{ marginRight: '0.25rem' }} /> Tam Adresi Kopyala
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger address-card__action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(address.id)
                        }}
                      >
                        <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                      </button>
                      <div className="address-card__date">
                        {new Date(address.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="addresses-pagination">
                  <button
                    type="button"
                    className="addresses-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="addresses-pagination__btn"
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
                        className={`addresses-pagination__btn addresses-pagination__btn--number ${
                          currentPage === pageNum ? 'addresses-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="addresses-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="addresses-pagination__btn"
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
      {selectedAddress && (
        <div
          className="address-modal-overlay"
          onClick={() => setSelectedAddress(null)}
        >
          <div
            className="address-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="address-modal__header">
              <h2 className="address-modal__title">Adres Detayları</h2>
              <button
                type="button"
                className="address-modal__close"
                onClick={() => setSelectedAddress(null)}
              >
                ✕
              </button>
            </div>
            <div className="address-modal__content">
              <div className="address-modal__item">
                <div className="address-modal__label">Kullanıcı ID</div>
                <div className="address-modal__value">#{selectedAddress.id}</div>
              </div>
              <div className="address-modal__item">
                <div className="address-modal__label">Ad Soyad</div>
                <div className="address-modal__value address-modal__value--name">{selectedAddress.fullName}</div>
              </div>
              <div className="address-modal__item">
                <div className="address-modal__label">Telefon</div>
                <div className="address-modal__value-group">
                  <span className="address-modal__value">{selectedAddress.phone}</span>
                  <button
                    type="button"
                    className="address-modal__copy-btn"
                    onClick={() => copyToClipboard(selectedAddress.phone, 'detail-phone')}
                    title="Kopyala"
                  >
                    <FaClipboard />
                  </button>
                </div>
              </div>
              <div className="address-modal__item">
                <div className="address-modal__label">Adres</div>
                <div className="address-modal__value address-modal__value--multiline">
                  {selectedAddress.addressLine}
                  {selectedAddress.addressDetail && (
                    <span className="address-modal__detail">, {selectedAddress.addressDetail}</span>
                  )}
                </div>
              </div>
              <div className="address-modal__item">
                <div className="address-modal__label">Şehir / İlçe</div>
                <div className="address-modal__value">
                  {selectedAddress.district}, {selectedAddress.city}
                </div>
              </div>
              <div className="address-modal__item">
                <div className="address-modal__label">Ülke</div>
                <div className="address-modal__value">Türkiye</div>
              </div>
              <div className="address-modal__item">
                <div className="address-modal__label">Varsayılan Adres</div>
                <div className="address-modal__value">
                  {selectedAddress.isDefault ? (
                    <span className="dashboard-card__chip dashboard-card__chip--success">Evet</span>
                  ) : (
                    <span className="dashboard-card__chip">Hayır</span>
                  )}
                </div>
              </div>
              {selectedAddress.userId && (
                <div className="address-modal__item">
                  <div className="address-modal__label">Kullanıcı</div>
                  <div className="address-modal__value">
                    ID: {selectedAddress.userId}
                    {selectedAddress.userEmail && (
                      <div className="address-modal__sub-value">E-posta: {selectedAddress.userEmail}</div>
                    )}
                  </div>
                </div>
              )}
              {selectedAddress.orderId && (
                <div className="address-modal__item">
                  <div className="address-modal__label">Sipariş</div>
                  <div className="address-modal__value">
                    ID: {selectedAddress.orderId}
                    {selectedAddress.orderNumber && (
                      <div className="address-modal__sub-value">Sipariş No: {selectedAddress.orderNumber}</div>
                    )}
                  </div>
                </div>
              )}
              <div className="address-modal__item">
                <div className="address-modal__label">Oluşturulma Tarihi</div>
                <div className="address-modal__value">
                  {new Date(selectedAddress.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="address-modal__actions">
                <button
                  type="button"
                  className="btn btn-primary address-modal__action-btn"
                  onClick={() => {
                    copyFullAddress(selectedAddress)
                  }}
                >
                  <FaClipboard style={{ marginRight: '0.25rem' }} /> Tam Adresi Kopyala
                </button>
                <button
                  type="button"
                  className="btn btn-danger address-modal__action-btn"
                  onClick={() => {
                    handleDeleteClick(selectedAddress.id)
                    setSelectedAddress(null)
                  }}
                >
                  <FaTrash style={{ marginRight: '0.25rem' }} /> Adresi Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        message="Bu adresi silmek istediğinize emin misiniz?"
        type="confirm"
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, addressId: null })}
      />
    </main>
  )
}

export default AddressesPage

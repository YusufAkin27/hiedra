import { useEffect, useState } from 'react'
import { FaBox, FaChartBar, FaSpinner, FaSearch, FaTable, FaDollarSign, FaEdit, FaUser, FaMapMarkerAlt } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { useToast } from '../components/Toast'

type ShippingPageProps = {
  session: AuthResponse
}

type ShippingInfo = {
  orderId: number
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  status: string
  totalAmount: number
  shippingAddress?: string
  createdAt: string
  trackingNumber?: string
  carrier?: string
  shippedAt?: string
}

type TrackingEvent = {
  timestamp: string
  location?: string
  description?: string
}

type TrackingData = {
  orderNumber: string
  trackingNumber: string
  carrier: string
  status: string
  statusDescription?: string
  events?: TrackingEvent[]
  orderStatus: string
  shippedAt?: string
  customerName: string
  customerEmail: string
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function ShippingPage({ session }: ShippingPageProps) {
  const toast = useToast()
  const [shippingList, setShippingList] = useState<ShippingInfo[]>([])
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
  const [selectedOrder, setSelectedOrder] = useState<ShippingInfo | null>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('DHL')
  const [searchTrackingNumber, setSearchTrackingNumber] = useState('')
  const [searchTrackingData, setSearchTrackingData] = useState<TrackingData | null>(null)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [isCreatingShipment, setIsCreatingShipment] = useState<number | null>(null)
  const [labelBase64, setLabelBase64] = useState<string | null>(null)
  const [showLabelModal, setShowLabelModal] = useState(false)

  useEffect(() => {
    const fetchShipping = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/admin/shipping`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Kargo bilgileri yüklenemedi.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: ShippingInfo[]
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Kargo bilgileri yüklenemedi.')
        }

        setShippingList(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchShipping()
  }, [session.accessToken])

  const handleTrackShipment = async (orderId: number) => {
    try {
      setIsTrackingLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/shipping/${orderId}/track`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Kargo takip bilgisi alınamadı.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: TrackingData
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Kargo takip bilgisi alınamadı.')
      }

      setTrackingData(payload.data)
      setShowTrackingModal(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
    } finally {
      setIsTrackingLoading(false)
    }
  }

  const handleUpdateTracking = async () => {
    if (!selectedOrder) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/shipping/${selectedOrder.orderId}/tracking`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim() || null,
          carrier: carrier,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Kargo bilgisi güncellenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Kargo bilgisi güncellenemedi.')
      }

      setShowUpdateModal(false)
      setSelectedOrder(null)
      setTrackingNumber('')
      // Listeyi yenile
      const refreshResponse = await fetch(`${apiBaseUrl}/admin/shipping`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      if (refreshResponse.ok) {
        const refreshData = (await refreshResponse.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: ShippingInfo[]
        }
        if (refreshData.data) {
          setShippingList(refreshData.data)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleString('tr-TR')
    } catch {
      return dateString
    }
  }

  const handleSearchByTrackingNumber = async () => {
    if (!searchTrackingNumber.trim()) {
      setError('Lütfen kargo takip numarası giriniz')
      return
    }

    try {
      setIsSearchLoading(true)
      setError(null)

      const url = new URL(`${apiBaseUrl}/shipping/track`)
      url.searchParams.append('trackingNumber', searchTrackingNumber.trim())

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Kargo takip bilgisi alınamadı.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: TrackingData
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Kargo takip bilgisi alınamadı.')
      }

      setSearchTrackingData(payload.data)
      setShowSearchModal(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
      setSearchTrackingData(null)
    } finally {
      setIsSearchLoading(false)
    }
  }

  const handleCreateDhlShipment = async (orderId: number) => {
    try {
      setIsCreatingShipment(orderId)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/shipping/${orderId}/create-shipment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Kargo oluşturulamadı.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: {
          orderNumber: string
          trackingNumber: string
          carrier: string
          labelBase64?: string
          shippedAt: string
        }
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Kargo oluşturulamadı.')
      }

      // Etiket varsa göster
      if (payload.data.labelBase64) {
        setLabelBase64(payload.data.labelBase64)
        setShowLabelModal(true)
      }

      // Listeyi yenile
      const refreshResponse = await fetch(`${apiBaseUrl}/admin/shipping`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      if (refreshResponse.ok) {
        const refreshData = (await refreshResponse.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: ShippingInfo[]
        }
        if (refreshData.data) {
          setShippingList(refreshData.data)
        }
      }

      // Başarı mesajı
      toast.success(`Kargo başarıyla oluşturuldu! Takip Numarası: ${payload.data.trackingNumber}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
      toast.error(message)
    } finally {
      setIsCreatingShipment(null)
    }
  }

  const handleDownloadLabel = () => {
    if (!labelBase64) return

    try {
      // Base64'ü decode et ve PDF olarak indir
      const byteCharacters = atob(labelBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `kargo-etiket-${new Date().getTime()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Etiket indirilemedi.')
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

  const getStatusDisplayName = (status: string): string => {
    const statusMap: Record<string, string> = {
      PENDING: 'Ödeme Bekleniyor',
      PAID: 'Ödendi',
      PROCESSING: 'İşleme Alındı',
      SHIPPED: 'Kargoya Verildi',
      DELIVERED: 'Teslim Edildi',
      CANCELLED: 'İptal Edildi',
      REFUND_REQUESTED: 'İade Talep Edildi',
      REFUNDED: 'İade Yapıldı',
      COMPLETED: 'Tamamlandı',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'dashboard-card__chip--success'
      case 'CANCELLED':
      case 'REFUNDED':
        return 'dashboard-card__chip--error'
      case 'PROCESSING':
      case 'SHIPPED':
        return 'dashboard-card__chip--warning'
      case 'REFUND_REQUESTED':
        return 'dashboard-card__chip--warning'
      case 'PAID':
        return 'dashboard-card__chip--info'
      default:
        return ''
    }
  }

  // Filtreleme ve sayfalama
  const filteredShipping = shippingList.filter((shipping) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        shipping.orderNumber.toLowerCase().includes(search) ||
        shipping.customerName.toLowerCase().includes(search) ||
        shipping.customerEmail.toLowerCase().includes(search) ||
        shipping.customerPhone.includes(search) ||
        (shipping.trackingNumber && shipping.trackingNumber.toLowerCase().includes(search)) ||
        (shipping.carrier && shipping.carrier.toLowerCase().includes(search)) ||
        (shipping.shippingAddress && shipping.shippingAddress.toLowerCase().includes(search)) ||
        shipping.totalAmount.toString().includes(search) ||
        getStatusDisplayName(shipping.status).toLowerCase().includes(search)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredShipping.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedShipping = filteredShipping.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: shippingList.length,
    totalAmount: shippingList.reduce((sum, s) => sum + s.totalAmount, 0),
    averageAmount: shippingList.length > 0 ? (shippingList.reduce((sum, s) => sum + s.totalAmount, 0) / shippingList.length).toFixed(2) : '0',
    withTracking: shippingList.filter((s) => s.trackingNumber).length,
    shipped: shippingList.filter((s) => s.status === 'SHIPPED').length,
    delivered: shippingList.filter((s) => s.status === 'DELIVERED').length,
    pending: shippingList.filter((s) => s.status === 'PENDING' || s.status === 'PROCESSING').length,
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Kargo Yönetimi</p>
          <h1>Kargo Takibi</h1>
          <p>Kargo durumlarını görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid shipping-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="shipping-stats__title">Genel İstatistikler</h3>
          <div className="shipping-stats__grid">
            <div className="shipping-stat-card shipping-stat-card--primary">
              <div className="shipping-stat-card__icon"><FaBox /></div>
              <div className="shipping-stat-card__value">{stats.total}</div>
              <div className="shipping-stat-card__label">Toplam Kargo</div>
              <div className="shipping-stat-card__subtitle">Tüm kayıtlar</div>
            </div>
            <div className="shipping-stat-card shipping-stat-card--success">
              <div className="shipping-stat-card__icon"><FaDollarSign /></div>
              <div className="shipping-stat-card__value">{stats.totalAmount.toFixed(2)} ₺</div>
              <div className="shipping-stat-card__label">Toplam Tutar</div>
              <div className="shipping-stat-card__subtitle">Kargo değeri</div>
            </div>
            <div className="shipping-stat-card shipping-stat-card--info">
              <div className="shipping-stat-card__icon"><FaChartBar /></div>
              <div className="shipping-stat-card__value">{stats.averageAmount} ₺</div>
              <div className="shipping-stat-card__label">Ortalama Tutar</div>
              <div className="shipping-stat-card__subtitle">Kargo başına</div>
            </div>
            <div className="shipping-stat-card shipping-stat-card--success">
              <div className="shipping-stat-card__icon">🔢</div>
              <div className="shipping-stat-card__value">{stats.withTracking}</div>
              <div className="shipping-stat-card__label">Takip Numaralı</div>
              <div className="shipping-stat-card__subtitle">Takip edilebilir</div>
            </div>
            <div className="shipping-stat-card shipping-stat-card--warning">
              <div className="shipping-stat-card__icon">🚚</div>
              <div className="shipping-stat-card__value">{stats.shipped}</div>
              <div className="shipping-stat-card__label">Kargoya Verildi</div>
              <div className="shipping-stat-card__subtitle">Aktif kargo</div>
            </div>
            <div className="shipping-stat-card shipping-stat-card--success">
              <div className="shipping-stat-card__icon">📬</div>
              <div className="shipping-stat-card__value">{stats.delivered}</div>
              <div className="shipping-stat-card__label">Teslim Edildi</div>
              <div className="shipping-stat-card__subtitle">Tamamlanan</div>
            </div>
            <div className="shipping-stat-card shipping-stat-card--info">
              <div className="shipping-stat-card__icon"><FaSpinner /></div>
              <div className="shipping-stat-card__value">{stats.pending}</div>
              <div className="shipping-stat-card__label">Beklemede</div>
              <div className="shipping-stat-card__subtitle">İşlem bekleyen</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        {/* Kargo Numarası ile Arama */}
        <article className="dashboard-card">
          <h2>Kargo Numarası ile Sorgula</h2>
          <div className="shipping-search-tracking">
            <input
              type="text"
              className="shipping-search-tracking__input"
              value={searchTrackingNumber}
              onChange={(e) => setSearchTrackingNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchByTrackingNumber()
                }
              }}
              placeholder="Kargo takip numarası giriniz (örn: 1234567890)"
            />
            <button
              className="btn btn-primary"
              onClick={handleSearchByTrackingNumber}
              disabled={isSearchLoading || !searchTrackingNumber.trim()}
            >
              {isSearchLoading ? 'Sorgulanıyor...' : 'Sorgula'}
            </button>
          </div>
        </article>

        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="shipping-filters">
            <div className="shipping-filters__row">
              <div className="shipping-filters__search">
                <input
                  type="text"
                  className="shipping-filters__input"
                  placeholder="Kargo ara (sipariş no, müşteri, takip no, kargo firması...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="shipping-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary shipping-view-toggle shipping-view-toggle--desktop"
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

          {/* Header */}
          <div className="shipping-header">
            <div className="shipping-header__info">
              <span className="shipping-header__count">
                Toplam: <strong>{filteredShipping.length}</strong> kargo
              </span>
              {filteredShipping.length !== shippingList.length && (
                <span className="shipping-header__filtered">
                  (Filtrelenmiş: {filteredShipping.length} / {shippingList.length})
                </span>
              )}
            </div>
            <div className="shipping-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {filteredShipping.length === 0 ? (
            <p className="dashboard-card__empty">Henüz kargo kaydı bulunmuyor.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table shipping-table-desktop ${viewMode === 'table' ? '' : 'shipping-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Sipariş No</th>
                      <th>Müşteri</th>
                      <th>Adres</th>
                      <th>Durum</th>
                      <th>Takip No</th>
                      <th>Kargo</th>
                      <th>Tutar</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedShipping.map((shipping) => (
                      <tr key={shipping.orderId}>
                        <td>
                          <div className="shipping-table__number">{shipping.orderNumber}</div>
                        </td>
                        <td>
                          <div className="shipping-table__customer">
                            <div className="shipping-table__customer-name">{shipping.customerName}</div>
                            <div className="shipping-table__customer-email">{shipping.customerEmail}</div>
                          </div>
                        </td>
                        <td>
                          <div className="shipping-table__address">{shipping.shippingAddress || '-'}</div>
                        </td>
                        <td>
                          <span className={`dashboard-card__chip ${getStatusColor(shipping.status)}`}>
                            {getStatusDisplayName(shipping.status)}
                          </span>
                        </td>
                        <td>
                          <div className="shipping-table__tracking">{shipping.trackingNumber || '-'}</div>
                        </td>
                        <td>
                          <div className="shipping-table__carrier">{shipping.carrier || '-'}</div>
                        </td>
                        <td>
                          <div className="shipping-table__amount">{shipping.totalAmount.toFixed(2)} ₺</div>
                        </td>
                        <td>
                          <div className="shipping-table__actions">
                            {!shipping.trackingNumber && (
                              <button
                                className="shipping-table__btn shipping-table__btn--primary"
                                onClick={() => handleCreateDhlShipment(shipping.orderId)}
                                disabled={isCreatingShipment === shipping.orderId}
                                title="DHL Kargo Oluştur"
                              >
                                {isCreatingShipment === shipping.orderId ? <FaSpinner /> : <FaBox />}
                              </button>
                            )}
                            {shipping.trackingNumber && (
                              <button
                                className="shipping-table__btn shipping-table__btn--info"
                                onClick={() => handleTrackShipment(shipping.orderId)}
                                disabled={isTrackingLoading}
                                title="Takip Et"
                              >
                                {isTrackingLoading ? <FaSpinner /> : <FaSearch />}
                              </button>
                            )}
                            <button
                              className="shipping-table__btn shipping-table__btn--success"
                              onClick={() => {
                                setSelectedOrder(shipping)
                                setTrackingNumber(shipping.trackingNumber || '')
                                setCarrier(shipping.carrier || 'DHL')
                                setShowUpdateModal(true)
                              }}
                              title={shipping.trackingNumber ? 'Güncelle' : 'Manuel Ekle'}
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`shipping-cards ${viewMode === 'cards' ? '' : 'shipping-cards--hidden'}`}>
                {paginatedShipping.map((shipping) => (
                  <div key={shipping.orderId} className="shipping-card">
                    <div className="shipping-card__header">
                      <div className="shipping-card__info">
                        <h3 className="shipping-card__number">{shipping.orderNumber}</h3>
                        <span className={`dashboard-card__chip ${getStatusColor(shipping.status)}`}>
                          {getStatusDisplayName(shipping.status)}
                        </span>
                      </div>
                      <div className="shipping-card__amount">{shipping.totalAmount.toFixed(2)} ₺</div>
                    </div>
                    <div className="shipping-card__body">
                      <div className="shipping-card__customer">
                        <div className="shipping-card__customer-row">
                          <div className="shipping-card__customer-icon"><FaUser /></div>
                          <div className="shipping-card__customer-content">
                            <div className="shipping-card__customer-label">Müşteri</div>
                            <div className="shipping-card__customer-value">{shipping.customerName}</div>
                            <div className="shipping-card__customer-email">{shipping.customerEmail}</div>
                          </div>
                        </div>
                        {shipping.shippingAddress && (
                          <div className="shipping-card__customer-row">
                            <div className="shipping-card__customer-icon"><FaMapMarkerAlt /></div>
                            <div className="shipping-card__customer-content">
                              <div className="shipping-card__customer-label">Adres</div>
                              <div className="shipping-card__customer-value">{shipping.shippingAddress}</div>
                            </div>
                          </div>
                        )}
                        {shipping.trackingNumber && (
                          <div className="shipping-card__customer-row">
                            <div className="shipping-card__customer-icon">🔢</div>
                            <div className="shipping-card__customer-content">
                              <div className="shipping-card__customer-label">Takip No</div>
                              <div className="shipping-card__customer-value shipping-card__customer-value--tracking">
                                {shipping.trackingNumber}
                              </div>
                            </div>
                          </div>
                        )}
                        {shipping.carrier && (
                          <div className="shipping-card__customer-row">
                            <div className="shipping-card__customer-icon">🚚</div>
                            <div className="shipping-card__customer-content">
                              <div className="shipping-card__customer-label">Kargo Firması</div>
                              <div className="shipping-card__customer-value">{shipping.carrier}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shipping-card__actions">
                      {!shipping.trackingNumber && (
                        <button
                          className="shipping-card__btn shipping-card__btn--primary"
                          onClick={() => handleCreateDhlShipment(shipping.orderId)}
                          disabled={isCreatingShipment === shipping.orderId}
                        >
                          {isCreatingShipment === shipping.orderId ? <><FaSpinner style={{ marginRight: '0.25rem' }} /> Oluşturuluyor...</> : <><FaBox style={{ marginRight: '0.25rem' }} /> DHL Kargo Oluştur</>}
                        </button>
                      )}
                      {shipping.trackingNumber && (
                        <button
                          className="shipping-card__btn shipping-card__btn--info"
                          onClick={() => handleTrackShipment(shipping.orderId)}
                          disabled={isTrackingLoading}
                        >
                          {isTrackingLoading ? <><FaSpinner style={{ marginRight: '0.25rem' }} /> Yükleniyor...</> : <><FaSearch style={{ marginRight: '0.25rem' }} /> Takip Et</>}
                        </button>
                      )}
                      <button
                        className="shipping-card__btn shipping-card__btn--success"
                        onClick={() => {
                          setSelectedOrder(shipping)
                          setTrackingNumber(shipping.trackingNumber || '')
                          setCarrier(shipping.carrier || 'DHL')
                          setShowUpdateModal(true)
                        }}
                      >
                        <FaEdit style={{ marginRight: '0.25rem' }} /> {shipping.trackingNumber ? 'Güncelle' : 'Manuel Ekle'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="shipping-pagination">
                  <button
                    type="button"
                    className="shipping-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="shipping-pagination__btn"
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
                        className={`shipping-pagination__btn shipping-pagination__btn--number ${
                          currentPage === pageNum ? 'shipping-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="shipping-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="shipping-pagination__btn"
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

      {/* Kargo Takip Modal */}
      {showTrackingModal && trackingData && (
        <div
          className="shipping-modal-overlay"
          onClick={() => {
            setShowTrackingModal(false)
            setTrackingData(null)
          }}
        >
          <div
            className="shipping-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shipping-modal__header">
              <h2 className="shipping-modal__title">Kargo Takip Bilgileri</h2>
              <button
                type="button"
                className="shipping-modal__close"
                onClick={() => {
                  setShowTrackingModal(false)
                  setTrackingData(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className="shipping-modal__content">
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Sipariş No</div>
                <div className="shipping-modal__value">{trackingData.orderNumber}</div>
              </div>
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Takip No</div>
                <div className="shipping-modal__value shipping-modal__value--tracking">{trackingData.trackingNumber}</div>
              </div>
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Kargo Firması</div>
                <div className="shipping-modal__value">{trackingData.carrier}</div>
              </div>
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Durum</div>
                <div className="shipping-modal__value">{trackingData.statusDescription || trackingData.status}</div>
              </div>
              {trackingData.shippedAt && (
                <div className="shipping-modal__item">
                  <div className="shipping-modal__label">Kargoya Verilme</div>
                  <div className="shipping-modal__value">{formatDate(trackingData.shippedAt)}</div>
                </div>
              )}
              {trackingData.events && trackingData.events.length > 0 && (
                <div className="shipping-modal__events">
                  <h3 className="shipping-modal__events-title">Kargo Hareketleri</h3>
                  <div className="shipping-modal__events-list">
                    {trackingData.events.map((event, index) => (
                      <div key={index} className="shipping-modal__event">
                        <div className="shipping-modal__event-time">{formatDate(event.timestamp)}</div>
                        {event.location && (
                          <div className="shipping-modal__event-location"><FaMapMarkerAlt style={{ marginRight: '0.25rem' }} /> {event.location}</div>
                        )}
                        {event.description && (
                          <div className="shipping-modal__event-description">{event.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kargo Bilgisi Güncelleme Modal */}
      {showUpdateModal && selectedOrder && (
        <div
          className="shipping-modal-overlay"
          onClick={() => {
            setShowUpdateModal(false)
            setSelectedOrder(null)
            setTrackingNumber('')
          }}
        >
          <div
            className="shipping-modal shipping-modal--form"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shipping-modal__header">
              <h2 className="shipping-modal__title">Kargo Bilgisi {selectedOrder.trackingNumber ? 'Güncelle' : 'Ekle'}</h2>
              <button
                type="button"
                className="shipping-modal__close"
                onClick={() => {
                  setShowUpdateModal(false)
                  setSelectedOrder(null)
                  setTrackingNumber('')
                }}
              >
                ✕
              </button>
            </div>
            <div className="shipping-modal__content">
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Sipariş No</div>
                <div className="shipping-modal__value">{selectedOrder.orderNumber}</div>
              </div>
              <div className="shipping-modal__form-group">
                <label className="shipping-modal__form-label">Kargo Takip Numarası</label>
                <input
                  type="text"
                  className="shipping-modal__form-input"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Örn: 1234567890"
                />
              </div>
              <div className="shipping-modal__form-group">
                <label className="shipping-modal__form-label">Kargo Firması</label>
                <select
                  className="shipping-modal__form-select"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                >
                  <option value="DHL">DHL</option>
                  <option value="ARAS">ARAS</option>
                  <option value="MNG">MNG</option>
                  <option value="YURTICI">Yurtiçi Kargo</option>
                  <option value="PTT">PTT Kargo</option>
                </select>
              </div>
              <div className="shipping-modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowUpdateModal(false)
                    setSelectedOrder(null)
                    setTrackingNumber('')
                  }}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleUpdateTracking}
                  disabled={isLoading}
                >
                  {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kargo Etiket Modal */}
      {showLabelModal && labelBase64 && (
        <div
          className="shipping-modal-overlay"
          onClick={() => {
            setShowLabelModal(false)
            setLabelBase64(null)
          }}
        >
          <div
            className="shipping-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shipping-modal__header">
              <h2 className="shipping-modal__title">Kargo Etiketi</h2>
              <button
                type="button"
                className="shipping-modal__close"
                onClick={() => {
                  setShowLabelModal(false)
                  setLabelBase64(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className="shipping-modal__content">
              <p className="shipping-modal__description">
                Kargo etiketi başarıyla oluşturuldu. Etiketi indirmek için aşağıdaki butona tıklayın.
              </p>
              <div className="shipping-modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowLabelModal(false)
                    setLabelBase64(null)
                  }}
                >
                  Kapat
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadLabel}
                >
                  📥 Etiketi İndir (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kargo Numarası ile Arama Sonuç Modal */}
      {showSearchModal && searchTrackingData && (
        <div
          className="shipping-modal-overlay"
          onClick={() => {
            setShowSearchModal(false)
            setSearchTrackingData(null)
            setSearchTrackingNumber('')
          }}
        >
          <div
            className="shipping-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shipping-modal__header">
              <h2 className="shipping-modal__title">Kargo Takip Bilgileri</h2>
              <button
                type="button"
                className="shipping-modal__close"
                onClick={() => {
                  setShowSearchModal(false)
                  setSearchTrackingData(null)
                  setSearchTrackingNumber('')
                }}
              >
                ✕
              </button>
            </div>
            <div className="shipping-modal__content">
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Takip Numarası</div>
                <div className="shipping-modal__value shipping-modal__value--tracking">{searchTrackingData.trackingNumber}</div>
              </div>
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Kargo Firması</div>
                <div className="shipping-modal__value">{searchTrackingData.carrier}</div>
              </div>
              {searchTrackingData.orderNumber && (
                <div className="shipping-modal__item">
                  <div className="shipping-modal__label">Sipariş Numarası</div>
                  <div className="shipping-modal__value">{searchTrackingData.orderNumber}</div>
                </div>
              )}
              <div className="shipping-modal__item">
                <div className="shipping-modal__label">Durum</div>
                <div className="shipping-modal__value">{searchTrackingData.statusDescription || searchTrackingData.status}</div>
              </div>
              {searchTrackingData.shippedAt && (
                <div className="shipping-modal__item">
                  <div className="shipping-modal__label">Kargoya Verilme</div>
                  <div className="shipping-modal__value">{formatDate(searchTrackingData.shippedAt)}</div>
                </div>
              )}
              {searchTrackingData.customerName && (
                <div className="shipping-modal__item">
                  <div className="shipping-modal__label">Müşteri</div>
                  <div className="shipping-modal__value">{searchTrackingData.customerName}</div>
                </div>
              )}
              {searchTrackingData.customerEmail && (
                <div className="shipping-modal__item">
                  <div className="shipping-modal__label">E-posta</div>
                  <div className="shipping-modal__value">{searchTrackingData.customerEmail}</div>
                </div>
              )}
              {searchTrackingData.events && searchTrackingData.events.length > 0 && (
                <div className="shipping-modal__events">
                  <h3 className="shipping-modal__events-title">Kargo Hareketleri</h3>
                  <div className="shipping-modal__events-list">
                    {searchTrackingData.events.map((event, index) => (
                      <div key={index} className="shipping-modal__event">
                        <div className="shipping-modal__event-time">{formatDate(event.timestamp)}</div>
                        {event.location && (
                          <div className="shipping-modal__event-location"><FaMapMarkerAlt style={{ marginRight: '0.25rem' }} /> {event.location}</div>
                        )}
                        {event.description && (
                          <div className="shipping-modal__event-description">{event.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="shipping-modal__actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowSearchModal(false)
                    setSearchTrackingData(null)
                    setSearchTrackingNumber('')
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default ShippingPage



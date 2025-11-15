import { useEffect, useState, useCallback } from 'react'
import { FaBox, FaChartBar, FaCheckCircle, FaTable, FaCalendar, FaDollarSign, FaCog, FaExclamationTriangle, FaEdit, FaSync, FaUser, FaEnvelope } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { getAdminHeaders } from '../services/authService'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type OrdersPageProps = {
  session: AuthResponse
}

type Order = {
  id: number
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  totalAmount: number
  status: string
  createdAt: string
  adminNotes?: string
  paymentTransactionId?: string
}

type PaginatedResponse = {
  content: Order[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

type TabType = 'all' | 'paid' | 'shipped' | 'refund-requests' | 'processing' | 'delivered' | 'cancelled' | 'refunded'
type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function OrdersPage({ session }: OrdersPageProps) {
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState({
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
    pageSize: 20,
    hasNext: false,
    hasPrevious: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [isRefundApprovalModalOpen, setIsRefundApprovalModalOpen] = useState(false)
  const [isRefundRejectionModalOpen, setIsRefundRejectionModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    adminNotes: '',
  })
  const [statusForm, setStatusForm] = useState({
    status: '',
    adminNotes: '',
  })
  const [approvalForm, setApprovalForm] = useState({
    adminNotes: '',
  })
  const [refundApprovalForm, setRefundApprovalForm] = useState({
    adminNotes: '',
  })
  const [refundRejectionForm, setRefundRejectionForm] = useState({
    reason: '',
    adminNotes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  })

  const getStatusFromTab = (tab: TabType): string | null => {
    switch (tab) {
      case 'paid':
        return 'PAID'
      case 'shipped':
        return 'SHIPPED'
      case 'refund-requests':
        return 'REFUND_REQUESTED'
      case 'processing':
        return 'PROCESSING'
      case 'delivered':
        return 'DELIVERED'
      case 'cancelled':
        return 'CANCELLED'
      case 'refunded':
        return 'REFUNDED'
      case 'all':
      default:
        return null
    }
  }

  const fetchOrders = useCallback(async (page: number = 0, size: number = 20) => {
    if (!session?.accessToken) {
      setError('Oturum bulunamadı.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const status = getStatusFromTab(activeTab)
      const url = new URL(`${apiBaseUrl}/admin/orders`)
      url.searchParams.append('page', page.toString())
      url.searchParams.append('size', size.toString())
      if (status) {
        url.searchParams.append('status', status)
      }

      const response = await fetch(url.toString(), {
        headers: getAdminHeaders(session.accessToken),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`Siparişler yüklenemedi. (${response.status})`)
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: PaginatedResponse
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Siparişler yüklenemedi.')
      }

      setOrders(payload.data.content)
      setPagination({
        totalElements: payload.data.totalElements,
        totalPages: payload.data.totalPages,
        currentPage: payload.data.currentPage,
        pageSize: payload.data.pageSize,
        hasNext: payload.data.hasNext,
        hasPrevious: payload.data.hasPrevious,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      console.error('Fetch orders error:', err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken, apiBaseUrl, activeTab])

  useEffect(() => {
    if (session?.accessToken) {
      setCurrentPage(0) // Tab değiştiğinde ilk sayfaya dön
    } else {
      setIsLoading(false)
      setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
    }
  }, [session?.accessToken, activeTab, pageSize])

  // Sayfa veya tab değiştiğinde veri çek
  useEffect(() => {
    if (session?.accessToken && currentPage >= 0) {
      fetchOrders(currentPage, pageSize)
    }
  }, [currentPage, pageSize, activeTab, session?.accessToken])

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    setEditForm({
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      adminNotes: order.adminNotes || '',
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        throw new Error('Sipariş güncellenemedi.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'Sipariş güncellenemedi.')
      }

      toast.success('Sipariş başarıyla güncellendi!')
      setIsEditModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sipariş güncellenemedi.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order)
    setStatusForm({
      status: order.status,
      adminNotes: '',
    })
    setIsStatusModalOpen(true)
  }

  const handleSubmitStatusUpdate = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(statusForm),
      })

      if (!response.ok) {
        throw new Error('Sipariş durumu güncellenemedi.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'Sipariş durumu güncellenemedi.')
      }

      toast.success('Sipariş durumu başarıyla güncellendi! Müşteriye mail gönderildi.')
      setIsStatusModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sipariş durumu güncellenemedi.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveCancelled = (order: Order) => {
    if (order.status !== 'CANCELLED') {
      toast.warning('Sadece iptal edilmiş siparişler onaylanabilir.')
      return
    }
    setSelectedOrder(order)
    setApprovalForm({ adminNotes: '' })
    setIsApprovalModalOpen(true)
  }

  const handleApproveRefund = (order: Order) => {
    if (order.status !== 'REFUND_REQUESTED') {
      toast.warning('Sadece iade talebi bekleyen siparişler onaylanabilir.')
      return
    }
    setSelectedOrder(order)
    setRefundApprovalForm({ adminNotes: '' })
    setIsRefundApprovalModalOpen(true)
  }

  const handleRejectRefund = (order: Order) => {
    if (order.status !== 'REFUND_REQUESTED') {
      toast.warning('Sadece iade talebi bekleyen siparişler reddedilebilir.')
      return
    }
    setSelectedOrder(order)
    setRefundRejectionForm({ reason: '', adminNotes: '' })
    setIsRefundRejectionModalOpen(true)
  }

  const handleSubmitApproval = async () => {
    if (!selectedOrder) return

    setConfirmModal({
      isOpen: true,
      message: 'İptal edilen siparişi onaylayacak ve para iadesi yapacaksınız. Devam etmek istiyor musunuz?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        await executeApproval()
      },
    })
  }

  const executeApproval = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/approve-cancelled`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(approvalForm),
      })

      if (!response.ok) {
        throw new Error('Sipariş onaylanamadı.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'Sipariş onaylanamadı.')
      }

      toast.success('Sipariş onaylandı ve para iadesi yapıldı! Müşteriye mail gönderildi.')
      setIsApprovalModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sipariş onaylanamadı.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRefundApproval = async () => {
    if (!selectedOrder) return

    setConfirmModal({
      isOpen: true,
      message: 'İade talebini onaylayacak ve para iadesi yapacaksınız (iyzico ile). Devam etmek istiyor musunuz?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        await executeRefundApproval()
      },
    })
  }

  const executeRefundApproval = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/approve-refund`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(refundApprovalForm),
      })

      if (!response.ok) {
        throw new Error('İade talebi onaylanamadı.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'İade talebi onaylanamadı.')
      }

      toast.success('İade talebi onaylandı ve para iadesi yapıldı! Müşteriye mail gönderildi.')
      setIsRefundApprovalModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İade talebi onaylanamadı.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRefundRejection = async () => {
    if (!selectedOrder) return

    if (!refundRejectionForm.reason || refundRejectionForm.reason.trim() === '') {
      toast.warning('Lütfen red nedeni giriniz.')
      return
    }

    setConfirmModal({
      isOpen: true,
      message: 'İade talebini reddedeceksiniz. Devam etmek istiyor musunuz?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        await executeRefundRejection()
      },
    })
  }

  const executeRefundRejection = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/reject-refund`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(refundRejectionForm),
      })

      if (!response.ok) {
        throw new Error('İade talebi reddedilemedi.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'İade talebi reddedilemedi.')
      }

      toast.success('İade talebi reddedildi! Müşteriye mail gönderildi.')
      setIsRefundRejectionModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İade talebi reddedilemedi.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
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

  const getTabCount = (tab: TabType): number => {
    // Sayfalama kullanıldığı için toplam sayıyı pagination'dan al
    if (tab === activeTab) {
      return pagination.totalElements
    }
    // Diğer sekmeler için şimdilik 0 göster (isteğe bağlı olarak ayrı API çağrısı yapılabilir)
    return 0
  }

  // Filtreleme
  const filteredOrders = orders.filter((order) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.customerEmail.toLowerCase().includes(search) ||
        order.customerPhone.includes(search) ||
        order.totalAmount.toString().includes(search) ||
        getStatusDisplayName(order.status).toLowerCase().includes(search)
      )
    }
    return true
  })

  // İstatistikler
  const stats = {
    total: pagination.totalElements,
    totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    averageAmount: orders.length > 0 ? (orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length).toFixed(2) : '0',
    paid: orders.filter((o) => o.status === 'PAID').length,
    processing: orders.filter((o) => o.status === 'PROCESSING').length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    refundRequests: orders.filter((o) => o.status === 'REFUND_REQUESTED').length,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(0)
  }

  if (!session) {
    return (
      <main className="page dashboard">
        <p className="dashboard-card__feedback dashboard-card__feedback--error">
          Oturum bulunamadı. Lütfen tekrar giriş yapın.
        </p>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Yükleniyor...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <div className="dashboard__hero-text">
            <p className="dashboard__eyebrow">Hata</p>
            <h1>Siparişler Yüklenemedi</h1>
          </div>
        </section>
        <section className="dashboard__grid">
          <article className="dashboard-card">
            <p className="dashboard-card__feedback dashboard-card__feedback--error">{error}</p>
            <button
              onClick={() => {
                setError(null)
                fetchOrders(currentPage, pageSize)
              }}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Tekrar Dene
            </button>
          </article>
        </section>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Sipariş Yönetimi</p>
          <h1>Siparişler</h1>
          <p>Tüm siparişleri görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid orders-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="orders-stats__title">Genel İstatistikler</h3>
          <div className="orders-stats__grid">
            <div className="orders-stat-card orders-stat-card--primary">
              <div className="orders-stat-card__icon"><FaBox /></div>
              <div className="orders-stat-card__value">{stats.total}</div>
              <div className="orders-stat-card__label">Toplam Sipariş</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--success">
              <div className="orders-stat-card__icon"><FaDollarSign /></div>
              <div className="orders-stat-card__value">{stats.totalAmount.toFixed(2)} ₺</div>
              <div className="orders-stat-card__label">Toplam Tutar</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--info">
              <div className="orders-stat-card__icon"><FaChartBar /></div>
              <div className="orders-stat-card__value">{stats.averageAmount} ₺</div>
              <div className="orders-stat-card__label">Ortalama Tutar</div>
              <div className="orders-stat-card__subtitle">Sipariş başına</div>
            </div>
            <div className="orders-stat-card orders-stat-card--success">
              <div className="orders-stat-card__icon"><FaCheckCircle /></div>
              <div className="orders-stat-card__value">{stats.paid}</div>
              <div className="orders-stat-card__label">Ödendi</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--warning">
              <div className="orders-stat-card__icon"><FaCog /></div>
              <div className="orders-stat-card__value">{stats.processing}</div>
              <div className="orders-stat-card__label">İşleme Alındı</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--info">
              <div className="orders-stat-card__icon">🚚</div>
              <div className="orders-stat-card__value">{stats.shipped}</div>
              <div className="orders-stat-card__label">Kargoya Verildi</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--success">
              <div className="orders-stat-card__icon">📬</div>
              <div className="orders-stat-card__value">{stats.delivered}</div>
              <div className="orders-stat-card__label">Teslim Edildi</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--danger">
              <div className="orders-stat-card__icon"><FaExclamationTriangle /></div>
              <div className="orders-stat-card__value">{stats.refundRequests}</div>
              <div className="orders-stat-card__label">İade Talepleri</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="orders-filters">
            <div className="orders-filters__row">
              <div className="orders-filters__search">
                <input
                  type="text"
                  className="orders-filters__input"
                  placeholder="Sipariş ara (sipariş no, müşteri, e-posta, telefon, tutar...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(0)
                  }}
                />
              </div>
              <div className="orders-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary orders-view-toggle orders-view-toggle--desktop"
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
                      setCurrentPage(0)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sekmeler */}
          <div className="orders-tabs">
            <button
              className={`orders-tab ${activeTab === 'all' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tümü <span className="orders-tab__count">({getTabCount('all')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'paid' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('paid')}
            >
              Ödendi <span className="orders-tab__count">({getTabCount('paid')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'processing' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('processing')}
            >
              İşleme Alındı <span className="orders-tab__count">({getTabCount('processing')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'shipped' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('shipped')}
            >
              Kargoya Verildi <span className="orders-tab__count">({getTabCount('shipped')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'delivered' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('delivered')}
            >
              Teslim Edildi <span className="orders-tab__count">({getTabCount('delivered')})</span>
            </button>
            <button
              className={`orders-tab orders-tab--warning ${activeTab === 'refund-requests' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('refund-requests')}
            >
              İade Talepleri <span className="orders-tab__count orders-tab__count--warning">({getTabCount('refund-requests')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'cancelled' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('cancelled')}
            >
              İptal Edildi <span className="orders-tab__count">({getTabCount('cancelled')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'refunded' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('refunded')}
            >
              İade Yapıldı <span className="orders-tab__count">({getTabCount('refunded')})</span>
            </button>
          </div>

          {/* Header */}
          <div className="orders-header">
            <div className="orders-header__info">
              <span className="orders-header__count">
                Toplam: <strong>{filteredOrders.length}</strong> sipariş
              </span>
              {filteredOrders.length !== orders.length && (
                <span className="orders-header__filtered">
                  (Filtrelenmiş: {filteredOrders.length} / {orders.length})
                </span>
              )}
            </div>
            <div className="orders-header__pagination">
              Sayfa {pagination.currentPage + 1} / {pagination.totalPages || 1}
            </div>
          </div>

          {/* Sipariş Listesi */}
          {filteredOrders.length === 0 ? (
            <div className="orders-empty">
              <p>Bu kategoride henüz sipariş bulunmuyor.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table orders-table-desktop ${viewMode === 'table' ? '' : 'orders-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Sipariş No</th>
                      <th>Müşteri</th>
                      <th>E-posta</th>
                      <th>Telefon</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <div className="orders-table__number">{order.orderNumber}</div>
                        </td>
                        <td>
                          <div className="orders-table__customer">{order.customerName}</div>
                        </td>
                        <td>
                          <div className="orders-table__email">{order.customerEmail}</div>
                        </td>
                        <td>
                          <div className="orders-table__phone">{order.customerPhone}</div>
                        </td>
                        <td>
                          <div className="orders-table__amount">{order.totalAmount.toFixed(2)} ₺</div>
                        </td>
                        <td>
                          <span className={`dashboard-card__chip ${getStatusColor(order.status)}`}>
                            {getStatusDisplayName(order.status)}
                          </span>
                        </td>
                        <td>
                          <div className="orders-table__date">
                            {new Date(order.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="orders-table__actions">
                            <button
                              className="orders-table__btn orders-table__btn--primary"
                              onClick={() => handleEditOrder(order)}
                              title="Düzenle"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="orders-table__btn orders-table__btn--secondary"
                              onClick={() => handleUpdateStatus(order)}
                              title="Durum"
                            >
                              <FaSync />
                            </button>
                            {order.status === 'CANCELLED' && (
                              <button
                                className="orders-table__btn orders-table__btn--success"
                                onClick={() => handleApproveCancelled(order)}
                                title="Onayla & İade"
                              >
                                <FaCheckCircle />
                              </button>
                            )}
                            {order.status === 'REFUND_REQUESTED' && (
                              <>
                                <button
                                  className="orders-table__btn orders-table__btn--success"
                                  onClick={() => handleApproveRefund(order)}
                                  title="İadeyi Onayla"
                                >
                                  ✓
                                </button>
                                <button
                                  className="orders-table__btn orders-table__btn--danger"
                                  onClick={() => handleRejectRefund(order)}
                                  title="İadeyi Reddet"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`orders-cards ${viewMode === 'cards' ? '' : 'orders-cards--hidden'}`}>
                {filteredOrders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-card__header">
                      <div className="order-card__info">
                        <h3 className="order-card__number">{order.orderNumber}</h3>
                        <span className={`dashboard-card__chip ${getStatusColor(order.status)}`}>
                          {getStatusDisplayName(order.status)}
                        </span>
                      </div>
                      <div className="order-card__amount">{order.totalAmount.toFixed(2)} ₺</div>
                    </div>
                    <div className="order-card__body">
                      <div className="order-card__customer">
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon"><FaUser /></div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">Müşteri</div>
                            <div className="order-card__customer-value">{order.customerName}</div>
                          </div>
                        </div>
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon"><FaEnvelope /></div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">E-posta</div>
                            <div className="order-card__customer-value">{order.customerEmail}</div>
                          </div>
                        </div>
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon">📞</div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">Telefon</div>
                            <div className="order-card__customer-value">{order.customerPhone}</div>
                          </div>
                        </div>
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon"><FaCalendar /></div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">Tarih</div>
                            <div className="order-card__customer-value">
                              {new Date(order.createdAt).toLocaleString('tr-TR', {
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
                    <div className="order-card__actions">
                      <button
                        className="order-card__btn order-card__btn--primary"
                        onClick={() => handleEditOrder(order)}
                      >
                        <FaEdit style={{ marginRight: '0.25rem' }} /> Düzenle
                      </button>
                      <button
                        className="order-card__btn order-card__btn--secondary"
                        onClick={() => handleUpdateStatus(order)}
                      >
                        <FaSync style={{ marginRight: '0.25rem' }} /> Durum
                      </button>
                      {order.status === 'CANCELLED' && (
                        <button
                          className="order-card__btn order-card__btn--success"
                          onClick={() => handleApproveCancelled(order)}
                        >
                          <FaCheckCircle style={{ marginRight: '0.25rem' }} /> Onayla & İade
                        </button>
                      )}
                      {order.status === 'REFUND_REQUESTED' && (
                        <>
                          <button
                            className="order-card__btn order-card__btn--success"
                            onClick={() => handleApproveRefund(order)}
                          >
                            ✓ İadeyi Onayla
                          </button>
                          <button
                            className="order-card__btn order-card__btn--danger"
                            onClick={() => handleRejectRefund(order)}
                          >
                            ✕ İadeyi Reddet
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sayfalama Kontrolleri */}
          {pagination.totalPages > 0 && (
            <div className="orders-pagination">
              <div className="orders-pagination__info">
                <span>
                  Toplam {pagination.totalElements} sipariş, Sayfa {pagination.currentPage + 1} / {pagination.totalPages}
                </span>
                <div className="orders-pagination__size">
                  <label>Sayfa başına:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
              <div className="orders-pagination__controls">
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(0)}
                  disabled={!pagination.hasPrevious}
                >
                  İlk
                </button>
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevious}
                >
                  Önceki
                </button>
                <div className="orders-pagination__numbers">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i
                    } else if (pagination.currentPage < 3) {
                      pageNum = i
                    } else if (pagination.currentPage > pagination.totalPages - 4) {
                      pageNum = pagination.totalPages - 5 + i
                    } else {
                      pageNum = pagination.currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`orders-pagination__btn ${pagination.currentPage === pageNum ? 'orders-pagination__btn--active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                </div>
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                >
                  Sonraki
                </button>
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(pagination.totalPages - 1)}
                  disabled={!pagination.hasNext}
                >
                  Son
                </button>
              </div>
            </div>
          )}
        </article>
      </section>

      {/* Düzenleme Modal */}
      {isEditModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Sipariş Düzenle: {selectedOrder.orderNumber}</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Müşteri Adı:</label>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>E-posta:</label>
                <input
                  type="email"
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Telefon:</label>
                <input
                  type="text"
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={editForm.adminNotes}
                  onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsEditModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--primary" onClick={handleUpdateOrder} disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Durum Güncelleme Modal */}
      {isStatusModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsStatusModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Durum Güncelle: {selectedOrder.orderNumber}</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Yeni Durum:</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                >
                  <option value="PENDING">Ödeme Bekleniyor</option>
                  <option value="PAID">Ödendi</option>
                  <option value="PROCESSING">İşleme Alındı</option>
                  <option value="SHIPPED">Kargoya Verildi</option>
                  <option value="DELIVERED">Teslim Edildi</option>
                  <option value="COMPLETED">Tamamlandı</option>
                  <option value="CANCELLED">İptal Edildi</option>
                  <option value="REFUND_REQUESTED">İade Talep Edildi</option>
                  <option value="REFUNDED">İade Yapıldı</option>
                </select>
              </div>
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={statusForm.adminNotes}
                  onChange={(e) => setStatusForm({ ...statusForm, adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsStatusModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--primary" onClick={handleSubmitStatusUpdate} disabled={isSubmitting}>
                {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İptal Onayı Modal */}
      {isApprovalModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsApprovalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>İptal Edilen Siparişi Onayla: {selectedOrder.orderNumber}</h2>
            <p className="modal-warning">Bu işlem para iadesi yapacaktır!</p>
            <div className="modal-form">
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={approvalForm.adminNotes}
                  onChange={(e) => setApprovalForm({ adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsApprovalModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--success" onClick={handleSubmitApproval} disabled={isSubmitting}>
                {isSubmitting ? 'İşleniyor...' : 'Onayla & İade Yap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İade Talebi Onay Modal */}
      {isRefundApprovalModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsRefundApprovalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>İade Talebini Onayla: {selectedOrder.orderNumber}</h2>
            <p className="modal-warning modal-warning--success">Bu işlem iyzico ile para iadesi yapacaktır!</p>
            <div className="modal-form">
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={refundApprovalForm.adminNotes}
                  onChange={(e) => setRefundApprovalForm({ adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsRefundApprovalModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--success" onClick={handleSubmitRefundApproval} disabled={isSubmitting}>
                {isSubmitting ? 'İşleniyor...' : 'Onayla & İade Yap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İade Talebi Red Modal */}
      {isRefundRejectionModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsRefundRejectionModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>İade Talebini Reddet: {selectedOrder.orderNumber}</h2>
            <p className="modal-warning">İade talebi reddedilecek ve müşteriye mail gönderilecektir.</p>
            <div className="modal-form">
              <div className="form-group">
                <label>
                  Red Nedeni: <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  value={refundRejectionForm.reason}
                  onChange={(e) => setRefundRejectionForm({ ...refundRejectionForm, reason: e.target.value })}
                  placeholder="Red nedeni giriniz..."
                  rows={3}
                  required
                />
              </div>
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={refundRejectionForm.adminNotes}
                  onChange={(e) => setRefundRejectionForm({ ...refundRejectionForm, adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsRefundRejectionModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--danger" onClick={handleSubmitRefundRejection} disabled={isSubmitting}>
                {isSubmitting ? 'İşleniyor...' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        type="confirm"
        confirmText="Evet, Devam Et"
        cancelText="İptal"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
      />
    </main>
  )
}

export default OrdersPage

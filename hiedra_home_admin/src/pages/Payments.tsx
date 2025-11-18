import { useEffect, useState, useCallback } from 'react'
import { FaDollarSign, FaCheckCircle, FaTimesCircle, FaClock, FaBan, FaUndo, FaChartBar, FaTable, FaEye } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { getAdminHeaders } from '../services/authService'
import { useToast } from '../components/Toast'

type PaymentsPageProps = {
  session: AuthResponse
}

type PaymentRecord = {
  id: number
  iyzicoPaymentId?: string
  paymentTransactionId?: string
  conversationId?: string
  orderNumber: string
  amount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  paymentMethod?: string
  is3DSecure?: boolean
  iyzicoStatus?: string
  iyzicoErrorMessage?: string
  iyzicoErrorCode?: string
  customerEmail: string
  customerName?: string
  customerPhone?: string
  cardLastFour?: string
  cardBrand?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  user?: {
    id: number
    email: string
  }
  guestUserId?: string
}

type PaginatedResponse = {
  content: PaymentRecord[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

type PaymentStats = {
  totalPayments: number
  successCount: number
  failedCount: number
  pendingCount: number
  cancelledCount: number
  refundedCount: number
  partiallyRefundedCount: number
  totalSuccessAmount: number
  totalFailedAmount: number
  totalPendingAmount: number
}

type TabType = 'all' | 'success' | 'failed' | 'pending' | 'cancelled' | 'refunded'
type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function PaymentsPage({ session }: PaymentsPageProps) {
  const toast = useToast()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [pagination, setPagination] = useState({
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
    pageSize: 20,
    hasNext: false,
    hasPrevious: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const formatCurrency = (value: number) =>
    value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusFromTab = (tab: TabType): string | null => {
    switch (tab) {
      case 'success':
        return 'SUCCESS'
      case 'failed':
        return 'FAILED'
      case 'pending':
        return 'PENDING'
      case 'cancelled':
        return 'CANCELLED'
      case 'refunded':
        return 'REFUNDED'
      case 'all':
      default:
        return null
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { label: 'Başarılı', icon: FaCheckCircle, color: '#10b981' }
      case 'FAILED':
        return { label: 'Başarısız', icon: FaTimesCircle, color: '#ef4444' }
      case 'PENDING':
        return { label: 'Beklemede', icon: FaClock, color: '#f59e0b' }
      case 'CANCELLED':
        return { label: 'İptal Edildi', icon: FaBan, color: '#6b7280' }
      case 'REFUNDED':
        return { label: 'İade Edildi', icon: FaUndo, color: '#8b5cf6' }
      case 'PARTIALLY_REFUNDED':
        return { label: 'Kısmi İade', icon: FaUndo, color: '#a855f7' }
      default:
        return { label: status, icon: FaClock, color: '#6b7280' }
    }
  }

  const fetchStats = useCallback(async () => {
    if (!session?.accessToken) return

    try {
      setIsStatsLoading(true)
      const response = await fetch(`${apiBaseUrl}/admin/payments/stats`, {
        headers: getAdminHeaders(session.accessToken),
      })

      if (!response.ok) {
        throw new Error('İstatistikler yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: PaymentStats
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'İstatistikler yüklenemedi.')
      }

      setStats(payload.data)
    } catch (err) {
      console.error('Fetch stats error:', err)
    } finally {
      setIsStatsLoading(false)
    }
  }, [session?.accessToken, apiBaseUrl])

  const fetchPayments = useCallback(async (page: number = 0, size: number = 20) => {
    if (!session?.accessToken) {
      setError('Oturum bulunamadı.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const status = getStatusFromTab(activeTab)
      const url = new URL(`${apiBaseUrl}/admin/payments`)
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
        throw new Error(`Ödemeler yüklenemedi. (${response.status})`)
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: PaginatedResponse
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Ödemeler yüklenemedi.')
      }

      setPayments(payload.data.content)
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
      console.error('Fetch payments error:', err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken, apiBaseUrl, activeTab])

  useEffect(() => {
    if (session?.accessToken) {
      fetchStats()
      setCurrentPage(0)
    } else {
      setIsLoading(false)
      setIsStatsLoading(false)
      setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken && currentPage >= 0) {
      fetchPayments(currentPage, pageSize)
    }
  }, [currentPage, pageSize, activeTab, session?.accessToken, fetchPayments])

  const handleViewDetail = (payment: PaymentRecord) => {
    setSelectedPayment(payment)
    setIsDetailModalOpen(true)
  }

  const filteredPayments = payments.filter((payment) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      payment.orderNumber.toLowerCase().includes(search) ||
      payment.customerEmail.toLowerCase().includes(search) ||
      (payment.customerName && payment.customerName.toLowerCase().includes(search)) ||
      (payment.paymentTransactionId && payment.paymentTransactionId.toLowerCase().includes(search))
    )
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>
          Ödeme Kayıtları
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Tüm ödeme işlemlerini görüntüleyin ve yönetin
        </p>
      </div>

      {/* İstatistikler */}
      {!isStatsLoading && stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Toplam</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
              {stats.totalPayments.toLocaleString('tr-TR')}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Başarılı</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
              {stats.successCount.toLocaleString('tr-TR')}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {formatCurrency(stats.totalSuccessAmount)}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Başarısız</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
              {stats.failedCount.toLocaleString('tr-TR')}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {formatCurrency(stats.totalFailedAmount)}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Beklemede</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
              {stats.pendingCount.toLocaleString('tr-TR')}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {formatCurrency(stats.totalPendingAmount)}
            </div>
          </div>
        </div>
      )}

      {/* Tablar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          borderBottom: '2px solid #e5e7eb',
        }}
      >
        {(['all', 'success', 'failed', 'pending', 'cancelled', 'refunded'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab
          const tabLabels: Record<TabType, string> = {
            all: 'Tümü',
            success: 'Başarılı',
            failed: 'Başarısız',
            pending: 'Beklemede',
            cancelled: 'İptal',
            refunded: 'İade',
          }
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setCurrentPage(0)
              }}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                color: isActive ? '#3b82f6' : '#6b7280',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '-2px',
              }}
            >
              {tabLabels[tab]}
            </button>
          )
        })}
      </div>

      {/* Arama ve Görünüm */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Sipariş no, email veya müşteri adı ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '250px',
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: viewMode === 'table' ? '#3b82f6' : '#fff',
              color: viewMode === 'table' ? '#fff' : '#111827',
              cursor: 'pointer',
            }}
          >
            <FaTable />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            style={{
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: viewMode === 'cards' ? '#3b82f6' : '#fff',
              color: viewMode === 'cards' ? '#fff' : '#111827',
              cursor: 'pointer',
            }}
          >
            <FaChartBar />
          </button>
        </div>
      </div>

      {/* İçerik */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Yükleniyor...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>{error}</div>
      ) : filteredPayments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          Ödeme kaydı bulunamadı.
        </div>
      ) : viewMode === 'table' ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Sipariş No
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Müşteri
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Tutar
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Durum
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Tarih
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const statusDisplay = getStatusDisplay(payment.status)
                  const StatusIcon = statusDisplay.icon
                  return (
                    <tr
                      key={payment.id}
                      style={{
                        borderTop: '1px solid #e5e7eb',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                      }}
                    >
                      <td style={{ padding: '16px', fontSize: '14px', color: '#111827' }}>
                        {payment.orderNumber}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#111827' }}>
                        <div>{payment.customerName || payment.customerEmail}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{payment.customerEmail}</div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: `${statusDisplay.color}15`,
                            color: statusDisplay.color,
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <StatusIcon size={12} />
                          {statusDisplay.label}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {formatDate(payment.createdAt)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => handleViewDetail(payment)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            background: '#fff',
                            color: '#111827',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <FaEye size={12} />
                          Detay
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredPayments.map((payment) => {
            const statusDisplay = getStatusDisplay(payment.status)
            const StatusIcon = statusDisplay.icon
            return (
              <div
                key={payment.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      {payment.orderNumber}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>{payment.customerEmail}</div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: `${statusDisplay.color}15`,
                      color: statusDisplay.color,
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <StatusIcon size={12} />
                    {statusDisplay.label}
                  </div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
                  {formatCurrency(payment.amount)}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                  {formatDate(payment.createdAt)}
                </div>
                <button
                  onClick={() => handleViewDetail(payment)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#111827',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <FaEye size={14} />
                  Detayları Gör
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '32px',
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={!pagination.hasPrevious}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: pagination.hasPrevious ? '#fff' : '#f3f4f6',
              color: pagination.hasPrevious ? '#111827' : '#9ca3af',
              cursor: pagination.hasPrevious ? 'pointer' : 'not-allowed',
            }}
          >
            Önceki
          </button>
          <span style={{ padding: '8px 16px', color: '#6b7280' }}>
            Sayfa {pagination.currentPage + 1} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={!pagination.hasNext}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: pagination.hasNext ? '#fff' : '#f3f4f6',
              color: pagination.hasNext ? '#111827' : '#9ca3af',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
            }}
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Detay Modal */}
      {isDetailModalOpen && selectedPayment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>Ödeme Detayı</h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Sipariş No</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{selectedPayment.orderNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tutar</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                  {formatCurrency(selectedPayment.amount)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Durum</div>
                {(() => {
                  const statusDisplay = getStatusDisplay(selectedPayment.status)
                  const StatusIcon = statusDisplay.icon
                  return (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        background: `${statusDisplay.color}15`,
                        color: statusDisplay.color,
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      <StatusIcon size={16} />
                      {statusDisplay.label}
                    </div>
                  )
                })()}
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Müşteri</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>
                  {selectedPayment.customerName || 'İsimsiz'}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>{selectedPayment.customerEmail}</div>
                {selectedPayment.customerPhone && (
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>{selectedPayment.customerPhone}</div>
                )}
              </div>
              {selectedPayment.paymentMethod && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Ödeme Yöntemi</div>
                  <div style={{ fontSize: '14px', color: '#111827' }}>{selectedPayment.paymentMethod}</div>
                </div>
              )}
              {selectedPayment.cardLastFour && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Kart</div>
                  <div style={{ fontSize: '14px', color: '#111827' }}>
                    {selectedPayment.cardBrand || 'Kart'} •••• {selectedPayment.cardLastFour}
                  </div>
                </div>
              )}
              {selectedPayment.paymentTransactionId && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>İşlem ID</div>
                  <div style={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>
                    {selectedPayment.paymentTransactionId}
                  </div>
                </div>
              )}
              {selectedPayment.iyzicoPaymentId && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>İyzico Payment ID</div>
                  <div style={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>
                    {selectedPayment.iyzicoPaymentId}
                  </div>
                </div>
              )}
              {selectedPayment.iyzicoErrorMessage && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Hata Mesajı</div>
                  <div style={{ fontSize: '14px', color: '#ef4444' }}>{selectedPayment.iyzicoErrorMessage}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Oluşturulma</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>{formatDate(selectedPayment.createdAt)}</div>
              </div>
              {selectedPayment.completedAt && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tamamlanma</div>
                  <div style={{ fontSize: '14px', color: '#111827' }}>{formatDate(selectedPayment.completedAt)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentsPage


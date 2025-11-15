import { useEffect, useState } from 'react'
import type { AuthResponse } from '../services/authService'

type OrderDetailPageProps = {
  session: AuthResponse
  orderId: number
  onBack: () => void
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
  cancelledAt?: string | null
  refundedAt?: string | null
  cancelReason?: string | null
  adminNotes?: string | null
  paymentTransactionId?: string | null
  addresses?: Address[]
  orderItems?: OrderItem[]
}

type Address = {
  id: number
  fullName: string
  email: string
  phone: string
  addressLine: string
  addressDetail?: string | null
  city: string
  district: string
  postalCode?: string | null
  country: string
}

type OrderItem = {
  id: number
  productName: string
  width: number
  height: number
  pleatType: string
  quantity: number
  price: number
  productId?: number | null
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Ödeme Bekleniyor' },
  { value: 'PAID', label: 'Ödendi' },
  { value: 'PROCESSING', label: 'İşleme Alındı' },
  { value: 'SHIPPED', label: 'Kargoya Verildi' },
  { value: 'DELIVERED', label: 'Teslim Edildi' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'CANCELLED', label: 'İptal Edildi' },
  { value: 'REFUND_REQUESTED', label: 'İade Talep Edildi' },
  { value: 'REFUNDED', label: 'İade Yapıldı' },
]

function OrderDetailPage({ session, orderId, onBack }: OrderDetailPageProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedStatus, setEditedStatus] = useState('')
  const [editedNotes, setEditedNotes] = useState('')

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Sipariş yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Order
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Sipariş yüklenemedi.')
      }

      setOrder(payload.data)
      setEditedStatus(payload.data.status)
      setEditedNotes(payload.data.adminNotes || '')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: editedStatus,
          adminNotes: editedNotes,
        }),
      })

      if (!response.ok) {
        throw new Error('Sipariş güncellenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Sipariş güncellenemedi.')
      }

      setSuccess('Sipariş başarıyla güncellendi.')
      setEditMode(false)
      fetchOrder()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sipariş güncellenirken bir hata oluştu.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <p>Yükleniyor...</p>
      </main>
    )
  }

  if (error && !order) {
    return (
      <main className="page dashboard">
        <p className="dashboard-card__feedback dashboard-card__feedback--error">{error}</p>
        <button onClick={onBack} style={{ marginTop: '1rem' }}>
          Geri Dön
        </button>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="page dashboard">
        <p>Sipariş bulunamadı.</p>
        <button onClick={onBack} style={{ marginTop: '1rem' }}>
          Geri Dön
        </button>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <button
            onClick={onBack}
            style={{
              marginBottom: '1rem',
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Geri Dön
          </button>
          <p className="dashboard__eyebrow">Sipariş Detayı</p>
          <h1>Sipariş #{order.orderNumber}</h1>
          <p>Sipariş detaylarını görüntüleyin ve düzenleyin.</p>
        </div>
      </section>

      {error && (
        <div className="dashboard-card__feedback dashboard-card__feedback--error" style={{ margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="dashboard-card__feedback dashboard-card__feedback--success" style={{ margin: '1rem 0' }}>
          {success}
        </div>
      )}

      <section className="dashboard__grid">
        <article className="dashboard-card">
          <div className="dashboard-card__header">
            <h2>Sipariş Bilgileri</h2>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Düzenle
              </button>
            )}
          </div>

          {editMode ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Durum
                </label>
                <select
                  value={editedStatus}
                  onChange={(e) => setEditedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                  }}
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Admin Notları
                </label>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Admin notları..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setEditedStatus(order.status)
                    setEditedNotes(order.adminNotes || '')
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Durum:</strong>{' '}
                <span className={`dashboard-card__chip ${getStatusColor(order.status)}`}>
                  {getStatusDisplayName(order.status)}
                </span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Toplam Tutar:</strong> {order.totalAmount.toFixed(2)} ₺
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Oluşturulma Tarihi:</strong> {new Date(order.createdAt).toLocaleString('tr-TR')}
              </div>
              {order.cancelledAt && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>İptal Tarihi:</strong> {new Date(order.cancelledAt).toLocaleString('tr-TR')}
                </div>
              )}
              {order.cancelReason && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>İptal Nedeni:</strong> {order.cancelReason}
                </div>
              )}
              {order.refundedAt && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>İade Tarihi:</strong> {new Date(order.refundedAt).toLocaleString('tr-TR')}
                </div>
              )}
              {order.paymentTransactionId && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Ödeme İşlem ID:</strong> {order.paymentTransactionId}
                </div>
              )}
              {order.adminNotes && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Admin Notları:</strong>
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '4px' }}>
                    {order.adminNotes}
                  </div>
                </div>
              )}
            </div>
          )}
        </article>

        <article className="dashboard-card">
          <h2>Müşteri Bilgileri</h2>
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Ad Soyad:</strong> {order.customerName}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>E-posta:</strong> {order.customerEmail}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Telefon:</strong> {order.customerPhone}
            </div>
          </div>
        </article>

        {order.addresses && order.addresses.length > 0 && (
          <article className="dashboard-card">
            <h2>Teslimat Adresi</h2>
            {order.addresses.map((address) => (
              <div key={address.id} style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{address.fullName}</strong>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  {address.addressLine}
                  {address.addressDetail && `, ${address.addressDetail}`}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  {address.district}, {address.city}
                  {address.postalCode && ` ${address.postalCode}`}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  {address.country}
                </div>
                <div>
                  <strong>Telefon:</strong> {address.phone}
                </div>
              </div>
            ))}
          </article>
        )}

        {order.orderItems && order.orderItems.length > 0 && (
          <article className="dashboard-card dashboard-card--wide">
            <h2>Sipariş Kalemleri</h2>
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>Ürün Adı</th>
                    <th>En (cm)</th>
                    <th>Boy (cm)</th>
                    <th>Pile Tipi</th>
                    <th>Adet</th>
                    <th>Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.width}</td>
                      <td>{item.height}</td>
                      <td>{item.pleatType}</td>
                      <td>{item.quantity}</td>
                      <td>{item.price.toFixed(2)} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </section>
    </main>
  )
}

function getStatusDisplayName(status: string): string {
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

function getStatusColor(status: string) {
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
    default:
      return ''
  }
}

export default OrderDetailPage


import { useEffect, useState } from 'react'
import type { AuthResponse } from '../services/authService'

type UserDetailPageProps = {
  session: AuthResponse
  userId: number
  onBack: () => void
}

type User = {
  id: number
  email: string
  role: string
  emailVerified: boolean
  active: boolean
  lastLoginAt?: string | null
  createdAt: string
  fullName?: string | null
  phone?: string | null
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
}

type AuditLog = {
  id: number
  action: string
  entityType: string
  entityId?: number | null
  description?: string | null
  ipAddress?: string | null
  status?: string | null
  createdAt: string
}

type Cart = {
  id: number
  status: string
  totalAmount: number
  itemCount: number
  createdAt: string
  updatedAt?: string | null
}

type CouponUsage = {
  id: number
  couponCode?: string | null
  couponName?: string | null
  discountAmount: number
  status: string
  usedAt?: string | null
  createdAt: string
}

type Review = {
  id: number
  productId?: number | null
  productName?: string | null
  rating: number
  comment?: string | null
  active: boolean
  createdAt: string
}

type Order = {
  id: number
  orderNumber: string
  status: string
  totalAmount: number
  itemCount: number
  createdAt: string
}

type UserDetails = {
  user: User
  auditLogs: AuditLog[]
  addresses: Address[]
  carts: Cart[]
  couponUsages: CouponUsage[]
  reviews: Review[]
  orders: Order[]
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function UserDetailPage({ session, userId, onBack }: UserDetailPageProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedActive, setEditedActive] = useState(false)

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/users/${userId}/details`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Kullanıcı detayları yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: UserDetails
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Kullanıcı detayları yüklenemedi.')
      }

      setUserDetails(payload.data)
      setEditedActive(payload.data.user.active)
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

      const response = await fetch(`${apiBaseUrl}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: editedActive,
        }),
      })

      if (!response.ok) {
        throw new Error('Kullanıcı güncellenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Kullanıcı güncellenemedi.')
      }

      setSuccess('Kullanıcı durumu başarıyla güncellendi.')
      setEditMode(false)
      fetchUserDetails()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kullanıcı güncellenirken bir hata oluştu.'
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

  if (error && !userDetails) {
    return (
      <main className="page dashboard">
        <p className="dashboard-card__feedback dashboard-card__feedback--error">{error}</p>
        <button onClick={onBack} style={{ marginTop: '1rem' }}>
          Geri Dön
        </button>
      </main>
    )
  }

  if (!userDetails) {
    return (
      <main className="page dashboard">
        <p>Kullanıcı bulunamadı.</p>
        <button onClick={onBack} style={{ marginTop: '1rem' }}>
          Geri Dön
        </button>
      </main>
    )
  }

  if (!userDetails) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <div className="dashboard__hero-text">
            <button
              className="btn btn-secondary user-detail-back-btn"
              onClick={onBack}
            >
              ← Geri Dön
            </button>
            <p className="dashboard__eyebrow">Kullanıcı Detayı</p>
            <h1>Yükleniyor...</h1>
          </div>
        </section>
      </main>
    )
  }

  const { user, addresses, auditLogs, carts, couponUsages, reviews, orders } = userDetails
  
  // Array'ler için güvenli varsayılan değerler
  const safeAddresses = addresses || []
  const safeAuditLogs = auditLogs || []
  const safeCarts = carts || []
  const safeCouponUsages = couponUsages || []
  const safeReviews = reviews || []
  const safeOrders = orders || []

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <button
            className="btn btn-secondary user-detail-back-btn"
            onClick={onBack}
          >
            ← Geri Dön
          </button>
          <p className="dashboard__eyebrow">Kullanıcı Detayı</p>
          <h1>{user.email}</h1>
          <p>Kullanıcı bilgilerini görüntüleyin ve yönetin.</p>
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
        <article className="dashboard-card user-detail-card">
          <div className="dashboard-card__header">
            <h2>Kullanıcı Bilgileri</h2>
            {!editMode && (
              <button
                className="btn btn-primary"
                onClick={() => setEditMode(true)}
              >
                Düzenle
              </button>
            )}
          </div>

          {editMode ? (
            <div className="user-detail-edit">
              <div className="user-detail-edit__field">
                <label className="user-detail-edit__checkbox">
                  <input
                    type="checkbox"
                    checked={editedActive}
                    onChange={(e) => setEditedActive(e.target.checked)}
                  />
                  <span>Kullanıcı Aktif</span>
                </label>
              </div>

              <div className="user-detail-edit__actions">
                <button
                  className="btn btn-success"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditMode(false)
                    setEditedActive(user.active)
                  }}
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <div className="user-detail-info">
              <div className="user-detail-info__item">
                <div className="user-detail-info__label">Kullanıcı ID</div>
                <div className="user-detail-info__value">#{user.id}</div>
              </div>
              <div className="user-detail-info__item">
                <div className="user-detail-info__label">E-posta Adresi</div>
                <div className="user-detail-info__value user-detail-info__value--email">{user.email}</div>
              </div>
              {user.fullName && (
                <div className="user-detail-info__item">
                  <div className="user-detail-info__label">Ad Soyad</div>
                  <div className="user-detail-info__value">{user.fullName}</div>
                </div>
              )}
              {user.phone && (
                <div className="user-detail-info__item">
                  <div className="user-detail-info__label">Telefon</div>
                  <div className="user-detail-info__value">{user.phone}</div>
                </div>
              )}
              <div className="user-detail-info__item">
                <div className="user-detail-info__label">Rol</div>
                <div className="user-detail-info__value">
                  <span className="dashboard-card__chip">{user.role}</span>
                </div>
              </div>
              <div className="user-detail-info__item">
                <div className="user-detail-info__label">Hesap Durumu</div>
                <div className="user-detail-info__value">
                  <span
                    className={`dashboard-card__chip ${
                      user.active ? 'dashboard-card__chip--success' : 'dashboard-card__chip--error'
                    }`}
                  >
                    {user.active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
              <div className="user-detail-info__item">
                <div className="user-detail-info__label">E-posta Doğrulama</div>
                <div className="user-detail-info__value">
                  <span
                    className={`dashboard-card__chip ${
                      user.emailVerified
                        ? 'dashboard-card__chip--success'
                        : 'dashboard-card__chip--warning'
                    }`}
                  >
                    {user.emailVerified ? 'Doğrulanmış' : 'Doğrulanmamış'}
                  </span>
                </div>
              </div>
              {user.lastLoginAt && (
                <div className="user-detail-info__item">
                  <div className="user-detail-info__label">Son Giriş</div>
                  <div className="user-detail-info__value">
                    {new Date(user.lastLoginAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
              <div className="user-detail-info__item">
                <div className="user-detail-info__label">Kayıt Tarihi</div>
                <div className="user-detail-info__value">
                  {new Date(user.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h2>Kullanıcı Adresleri ({safeAddresses.length})</h2>
          {safeAddresses.length === 0 ? (
            <p className="dashboard-card__empty">Bu kullanıcının kayıtlı adresi bulunmuyor.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {safeAddresses.map((address) => (
                <div
                  key={address.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    backgroundColor: address.isDefault ? '#f0f9ff' : '#fff',
                  }}
                >
                  {address.isDefault && (
                    <span className="dashboard-card__chip dashboard-card__chip--success" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                      Varsayılan
                    </span>
                  )}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{address.fullName}</strong>
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    {address.addressLine}
                    {address.addressDetail && `, ${address.addressDetail}`}
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    {address.district}, {address.city}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Türkiye | {address.phone}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#999' }}>
                    Oluşturulma: {new Date(address.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h2>Denetim Kayıtları ({safeAuditLogs.length})</h2>
          {safeAuditLogs.length === 0 ? (
            <p className="dashboard-card__empty">Bu kullanıcı için denetim kaydı bulunmuyor.</p>
          ) : (
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>İşlem</th>
                    <th>Entity</th>
                    <th>Açıklama</th>
                    <th>IP</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {safeAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                      <td>{log.action}</td>
                      <td>{log.entityType}</td>
                      <td>{log.description || '-'}</td>
                      <td>{log.ipAddress || '-'}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            backgroundColor: log.status === 'SUCCESS' ? '#d1fae5' : '#fee2e2',
                            color: log.status === 'SUCCESS' ? '#065f46' : '#991b1b',
                          }}
                        >
                          {log.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h2>Sepetler ({safeCarts.length})</h2>
          {safeCarts.length === 0 ? (
            <p className="dashboard-card__empty">Bu kullanıcının sepeti bulunmuyor.</p>
          ) : (
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Durum</th>
                    <th>Toplam</th>
                    <th>Ürün Sayısı</th>
                    <th>Oluşturulma</th>
                    <th>Güncellenme</th>
                  </tr>
                </thead>
                <tbody>
                  {safeCarts.map((cart) => (
                    <tr key={cart.id}>
                      <td>{cart.id}</td>
                      <td>{cart.status}</td>
                      <td>{cart.totalAmount.toFixed(2)} ₺</td>
                      <td>{cart.itemCount}</td>
                      <td>{new Date(cart.createdAt).toLocaleString('tr-TR')}</td>
                      <td>{cart.updatedAt ? new Date(cart.updatedAt).toLocaleString('tr-TR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h2>Kupon Kullanımları ({safeCouponUsages.length})</h2>
          {safeCouponUsages.length === 0 ? (
            <p className="dashboard-card__empty">Bu kullanıcının kupon kullanımı bulunmuyor.</p>
          ) : (
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>Kupon Kodu</th>
                    <th>Kupon Adı</th>
                    <th>İndirim</th>
                    <th>Durum</th>
                    <th>Kullanım Tarihi</th>
                    <th>Oluşturulma</th>
                  </tr>
                </thead>
                <tbody>
                  {safeCouponUsages.map((usage) => (
                    <tr key={usage.id}>
                      <td>{usage.couponCode || '-'}</td>
                      <td>{usage.couponName || '-'}</td>
                      <td>{usage.discountAmount.toFixed(2)} ₺</td>
                      <td>{usage.status}</td>
                      <td>{usage.usedAt ? new Date(usage.usedAt).toLocaleString('tr-TR') : '-'}</td>
                      <td>{new Date(usage.createdAt).toLocaleString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h2>Ürün Yorumları ({safeReviews.length})</h2>
          {safeReviews.length === 0 ? (
            <p className="dashboard-card__empty">Bu kullanıcının yorumu bulunmuyor.</p>
          ) : (
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Puan</th>
                    <th>Yorum</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {safeReviews.map((review) => (
                    <tr key={review.id}>
                      <td>
                        {review.productName || `Ürün #${review.productId}`}
                      </td>
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} {review.rating}/5
                        </span>
                      </td>
                      <td>{review.comment || '-'}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            backgroundColor: review.active ? '#d1fae5' : '#fee2e2',
                            color: review.active ? '#065f46' : '#991b1b',
                          }}
                        >
                          {review.active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>{new Date(review.createdAt).toLocaleString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h2>Siparişler ({safeOrders.length})</h2>
          {safeOrders.length === 0 ? (
            <p className="dashboard-card__empty">Bu kullanıcının siparişi bulunmuyor.</p>
          ) : (
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>Sipariş No</th>
                    <th>Durum</th>
                    <th>Toplam</th>
                    <th>Ürün Sayısı</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {safeOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.status}</td>
                      <td>{order.totalAmount.toFixed(2)} ₺</td>
                      <td>{order.itemCount}</td>
                      <td>{new Date(order.createdAt).toLocaleString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default UserDetailPage


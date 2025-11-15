import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import './OrderDetail.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const OrderDetail = () => {
  const { orderNumber } = useParams()
  const { user, isAuthenticated, accessToken } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundReason, setRefundReason] = useState('İade talebi')
  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState('')
  const [trackingData, setTrackingData] = useState(null)
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/giris')
      return
    }

    if (orderNumber) {
      fetchOrderDetails()
    }
  }, [orderNumber, isAuthenticated, accessToken])

  const fetchOrderDetails = async () => {
    if (!user?.email || !orderNumber) {
      setError('Kullanıcı bilgisi veya sipariş numarası bulunamadı')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      // Backend'den sipariş detaylarını getir
      const response = await fetch(`${API_BASE_URL}/orders/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          orderNumber: orderNumber,
          customerEmail: user.email
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        } else if (response.status === 404) {
          throw new Error('Sipariş bulunamadı.')
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Sipariş yüklenemedi (${response.status})`)
        }
      }

      const data = await response.json()
      if (data.isSuccess || data.success) {
        const orderData = data.data || data
        setOrder({
          ...orderData,
          shippingAddress: orderData.addresses && orderData.addresses.length > 0 
            ? orderData.addresses[0] 
            : {}
        })
        
        // Eğer kargo takip numarası varsa, kargo bilgisini de çek
        if (orderData.trackingNumber) {
          fetchTrackingInfo(orderData.trackingNumber, orderData.orderNumber)
        }
      } else {
        throw new Error(data.message || 'Sipariş yüklenemedi')
      }
    } catch (err) {
      console.error('Sipariş yüklenirken hata:', err)
      setError(err.message || 'Sipariş yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestRefund = async () => {
    if (!refundReason.trim()) {
      setError('Lütfen iade sebebini belirtin')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderNumber}/refund?email=${encodeURIComponent(user.email)}&reason=${encodeURIComponent(refundReason)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          }
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'İade talebi oluşturulamadı')
      }

      if (data.isSuccess || data.success) {
        setSuccess('İade talebiniz başarıyla oluşturuldu. En kısa sürede değerlendirilecektir.')
        setShowRefundModal(false)
        setRefundReason('İade talebi')
        // Siparişi yeniden yükle
        await fetchOrderDetails()
      } else {
        throw new Error(data.message || 'İade talebi oluşturulamadı')
      }
    } catch (err) {
      console.error('İade talebi oluşturulurken hata:', err)
      setError(err.message || 'İade talebi oluşturulurken bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  const fetchTrackingInfo = async (trackingNumber, orderNumber) => {
    if (!trackingNumber || !user?.email) return

    try {
      setIsTrackingLoading(true)
      const url = new URL(`${API_BASE_URL}/shipping/track-by-order`)
      url.searchParams.append('orderNumber', orderNumber)
      url.searchParams.append('email', user.email)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      })

      const data = await response.json()
      if (data.isSuccess || data.success) {
        setTrackingData(data.data)
      }
    } catch (err) {
      console.error('Kargo takip bilgisi alınırken hata:', err)
    } finally {
      setIsTrackingLoading(false)
    }
  }

  // İade talep edilebilir mi? (Her durumda iade edilebilir, sadece zaten iade edilmiş veya iade talebi bekleyen siparişler hariç)
  const canRefund = () => {
    if (!order || !order.status) return false
    const status = order.status.toUpperCase()
    return status !== 'REFUNDED' && status !== 'REFUND_REQUESTED'
  }

  const getTrackingStatusText = (status) => {
    if (!status) return 'Bilinmiyor'
    const statusMap = {
      'IN_TRANSIT': 'Kargoda',
      'DELIVERED': 'Teslim Edildi',
      'EXCEPTION': 'Sorun Var',
      'PENDING': 'Beklemede',
      'PICKED_UP': 'Kargo Alındı',
      'OUT_FOR_DELIVERY': 'Teslimat İçin Yola Çıktı'
    }
    return statusMap[status] || status
  }

  const getTrackingStatusClass = (status) => {
    if (!status) return 'tracking-status-unknown'
    const statusUpper = status.toUpperCase()
    if (statusUpper === 'DELIVERED') return 'tracking-status-delivered'
    if (statusUpper === 'IN_TRANSIT' || statusUpper === 'OUT_FOR_DELIVERY') return 'tracking-status-transit'
    if (statusUpper === 'EXCEPTION') return 'tracking-status-exception'
    return 'tracking-status-pending'
  }

  const formatTrackingDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  // Status'u Türkçe'ye çevir
  const getStatusText = (status) => {
    if (!status) return 'Bilinmiyor'
    const statusMap = {
      'PENDING': 'Beklemede',
      'PAID': 'Ödendi',
      'PROCESSING': 'Hazırlanıyor',
      'SHIPPED': 'Kargoya Verildi',
      'DELIVERED': 'Teslim Edildi',
      'CANCELLED': 'İptal Edildi',
      'REFUNDED': 'İade Edildi',
      'REFUND_REQUESTED': 'İade Talebi'
    }
    return statusMap[status.toUpperCase()] || status
  }

  // Status badge rengi
  const getStatusClass = (status) => {
    if (!status) return 'status-unknown'
    const statusUpper = status.toUpperCase()
    if (statusUpper === 'DELIVERED') return 'status-delivered'
    if (statusUpper === 'SHIPPED') return 'status-shipped'
    if (statusUpper === 'PROCESSING' || statusUpper === 'PAID') return 'status-processing'
    if (statusUpper === 'CANCELLED' || statusUpper === 'REFUNDED') return 'status-cancelled'
    if (statusUpper === 'REFUND_REQUESTED') return 'status-refund'
    return 'status-pending'
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="order-detail-container">
      <SEO
        title={`Sipariş Detayı - ${orderNumber} - Hiedra Perde`}
        description={`${orderNumber} numaralı siparişinizin detaylarını görüntüleyin`}
        url={`/siparis/${orderNumber}`}
      />

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Sipariş yükleniyor...</p>
        </div>
      ) : error && !order ? (
        <div className="error-state">
          <p>{error}</p>
          <div className="action-buttons">
            <button onClick={fetchOrderDetails} className="retry-btn">
              Tekrar Dene
            </button>
            <Link to="/siparislerim" className="back-btn">
              Siparişlerime Dön
            </Link>
          </div>
        </div>
      ) : order ? (
        <>
          <header className="order-detail-header">
            <div className="header-content">
              <Link to="/siparislerim" className="back-link">
                ← Siparişlerime Dön
              </Link>
              <h1>Sipariş Detayı</h1>
            </div>
            {canRefund() && (
              <button
                onClick={() => setShowRefundModal(true)}
                className="refund-request-btn"
                disabled={isProcessing}
              >
                İade Talebi Oluştur
              </button>
            )}
          </header>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="order-detail-content">
            {/* Sipariş Özeti */}
            <div className="order-summary-card">
              <div className="summary-header">
                <div className="order-info">
                  <h2>Sipariş No: {order.orderNumber}</h2>
                  <span className={`status-badge ${getStatusClass(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="order-date">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Tarih bilgisi yok'}
                </div>
              </div>
            </div>

            {/* Sipariş Ürünleri */}
            <div className="order-section">
              <h3>Sipariş Ürünleri</h3>
              <div className="order-items-list">
                {order.orderItems && order.orderItems.length > 0 ? (
                  order.orderItems.map((item, index) => {
                    const itemPrice = item.price ? (typeof item.price === 'string' ? parseFloat(item.price) : parseFloat(item.price.toString())) : 0
                    return (
                      <div key={item.id || index} className="order-item-detail">
                        <div className="item-main-info">
                          <h4>{item.productName || 'Ürün'}</h4>
                          <div className="item-specs">
                            {item.width && item.height && (
                              <span className="spec-item">
                                <strong>Ölçüler:</strong> {item.width} x {item.height} cm
                              </span>
                            )}
                            {item.pleatType && item.pleatType !== '1x1' && (
                              <span className="spec-item">
                                <strong>Pile Tipi:</strong> {item.pleatType}
                              </span>
                            )}
                            <span className="spec-item">
                              <strong>Adet:</strong> {item.quantity || 1}
                            </span>
                          </div>
                        </div>
                        <div className="item-price-info">
                          <span className="item-price">{itemPrice.toFixed(2)} ₺</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p>Sipariş detayı bulunamadı</p>
                )}
              </div>
              <div className="order-total-section">
                <div className="total-row">
                  <span>Ara Toplam:</span>
                  <span>
                    {order.totalAmount ? (
                      typeof order.totalAmount === 'string' 
                        ? parseFloat(order.totalAmount).toFixed(2) 
                        : parseFloat(order.totalAmount.toString()).toFixed(2)
                    ) : '0.00'} ₺
                  </span>
                </div>
                <div className="total-row final">
                  <span>Toplam:</span>
                  <span className="total-amount">
                    {order.totalAmount ? (
                      typeof order.totalAmount === 'string' 
                        ? parseFloat(order.totalAmount).toFixed(2) 
                        : parseFloat(order.totalAmount.toString()).toFixed(2)
                    ) : '0.00'} ₺
                  </span>
                </div>
              </div>
            </div>

            {/* Teslimat Adresi */}
            <div className="order-section">
              <h3>Teslimat Adresi</h3>
              <div className="address-details">
                {order.shippingAddress && (
                  <>
                    {order.shippingAddress.addressLine && (
                      <p><strong>Adres:</strong> {order.shippingAddress.addressLine}</p>
                    )}
                    {order.shippingAddress.addressDetail && (
                      <p><strong>Adres Detayı:</strong> {order.shippingAddress.addressDetail}</p>
                    )}
                    {(order.shippingAddress.district || order.shippingAddress.city) && (
                      <p>
                        <strong>İlçe/Şehir:</strong> {order.shippingAddress.district || ''} 
                        {order.shippingAddress.district && order.shippingAddress.city ? ' / ' : ''} 
                        {order.shippingAddress.city || ''}
                      </p>
                    )}
                  </>
                )}
                {(!order.shippingAddress || (!order.shippingAddress.addressLine && !order.shippingAddress.city)) && (
                  <p>Adres bilgisi bulunamadı</p>
                )}
              </div>
            </div>

            {/* Kargo Takip Bilgileri */}
            {order.trackingNumber && (
              <div className="order-section tracking-section">
                <h3>Kargo Takip Bilgileri</h3>
                <div className="tracking-info-card">
                  <div className="tracking-header-info">
                    <div className="tracking-number-info">
                      <p><strong>Takip Numarası:</strong> {order.trackingNumber}</p>
                      <p><strong>Kargo Firması:</strong> {order.carrier || 'DHL'}</p>
                      {order.shippedAt && (
                        <p><strong>Kargoya Verilme:</strong> {new Date(order.shippedAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => fetchTrackingInfo(order.trackingNumber, order.orderNumber)}
                        disabled={isTrackingLoading}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isTrackingLoading ? '#ccc' : '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isTrackingLoading ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          opacity: isTrackingLoading ? 0.6 : 1
                        }}
                      >
                        {isTrackingLoading ? 'Yükleniyor...' : '🔄 Güncelle'}
                      </button>
                      <Link 
                        to={`/kargo-takip?trackingNumber=${order.trackingNumber}&orderNumber=${order.orderNumber}`}
                        className="track-shipment-link"
                      >
                        📦 Detaylı Takip
                      </Link>
                    </div>
                  </div>
                  
                  {isTrackingLoading ? (
                    <div className="tracking-loading">
                      <p>Kargo bilgileri yükleniyor...</p>
                    </div>
                  ) : trackingData ? (
                    <div className="tracking-details">
                      <div className="tracking-status-badge">
                        <div className={`status-badge ${getTrackingStatusClass(trackingData.status)}`}>
                          {getTrackingStatusText(trackingData.status)}
                        </div>
                        {trackingData.statusDescription && (
                          <p className="status-description">{trackingData.statusDescription}</p>
                        )}
                      </div>
                      
                      {trackingData.events && trackingData.events.length > 0 && (
                        <div className="tracking-events-preview">
                          <h4>Son Hareketler</h4>
                          <div className="events-list">
                            {trackingData.events.slice(0, 3).map((event, index) => (
                              <div key={index} className="event-preview-item">
                                <div className="event-time-small">
                                  {formatTrackingDate(event.timestamp)}
                                </div>
                                <div className="event-content-small">
                                  {event.location && <span className="location-icon">📍</span>}
                                  <span>{event.location || 'Konum bilgisi yok'}</span>
                                </div>
                                {event.description && (
                                  <div className="event-description-small">{event.description}</div>
                                )}
                              </div>
                            ))}
                            {trackingData.events.length > 3 && (
                              <Link 
                                to={`/kargo-takip?trackingNumber=${order.trackingNumber}&orderNumber=${order.orderNumber}`}
                                className="view-all-events-link"
                              >
                                Tüm hareketleri görüntüle ({trackingData.events.length} adet)
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="tracking-no-data">
                      <p>Kargo takip bilgisi henüz güncellenmedi. "Güncelle" butonuna tıklayarak en güncel bilgileri alabilirsiniz.</p>
                      <button
                        onClick={() => fetchTrackingInfo(order.trackingNumber, order.orderNumber)}
                        disabled={isTrackingLoading}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: isTrackingLoading ? '#ccc' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isTrackingLoading ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          opacity: isTrackingLoading ? 0.6 : 1
                        }}
                      >
                        {isTrackingLoading ? 'Yükleniyor...' : 'Kargo Bilgisini Yükle'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Müşteri Bilgileri */}
            <div className="order-section">
              <h3>Müşteri Bilgileri</h3>
              <div className="customer-details">
                {order.customerName && (
                  <p><strong>Ad Soyad:</strong> {order.customerName}</p>
                )}
                {order.customerEmail && (
                  <p><strong>E-posta:</strong> {order.customerEmail}</p>
                )}
                {order.customerPhone && (
                  <p><strong>Telefon:</strong> {order.customerPhone}</p>
                )}
              </div>
            </div>

            {/* İptal/İade Bilgileri */}
            {order.cancelReason && (
              <div className="order-section">
                <h3>İptal Bilgisi</h3>
                <div className="cancel-info">
                  <p><strong>Sebep:</strong> {order.cancelReason}</p>
                  {order.cancelledAt && (
                    <p><strong>İptal Tarihi:</strong> {new Date(order.cancelledAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  )}
                </div>
              </div>
            )}

            {order.refundedAt && (
              <div className="order-section">
                <h3>İade Bilgisi</h3>
                <div className="refund-info">
                  <p><strong>İade Tarihi:</strong> {new Date(order.refundedAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>
            )}

            {order.status === 'REFUND_REQUESTED' && (
              <div className="order-section info-section">
                <h3>İade Talebi</h3>
                <div className="refund-request-info">
                  <p>İade talebiniz alınmıştır ve değerlendirme aşamasındadır. En kısa sürede size geri dönüş yapılacaktır.</p>
                </div>
              </div>
            )}
          </div>

          {/* İade Talebi Modal */}
          {showRefundModal && (
            <div className="modal-overlay" onClick={() => !isProcessing && setShowRefundModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>İade Talebi Oluştur</h3>
                <p>İade talebi oluşturmak istediğinizden emin misiniz? İade talebiniz değerlendirildikten sonra size geri dönüş yapılacaktır.</p>
                <div className="form-group">
                  <label htmlFor="refundReason">İade Sebebi <span className="required">*</span></label>
                  <textarea
                    id="refundReason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows="4"
                    placeholder="Lütfen iade sebebinizi detaylı olarak açıklayın..."
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    onClick={() => {
                      setShowRefundModal(false)
                      setRefundReason('İade talebi')
                      setError('')
                    }} 
                    disabled={isProcessing}
                    className="cancel-btn"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleRequestRefund} 
                    disabled={isProcessing || !refundReason.trim()} 
                    className="confirm-btn"
                  >
                    {isProcessing ? 'İşleniyor...' : 'İade Talebi Oluştur'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default OrderDetail


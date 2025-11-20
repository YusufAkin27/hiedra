import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import LazyImage from './LazyImage'
import './MyOrders.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const MyOrders = () => {
  const { user, isAuthenticated, accessToken } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [trackingDataMap, setTrackingDataMap] = useState({})
  const [loadingTracking, setLoadingTracking] = useState({})

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/giris')
      return
    }

      fetchMyOrders()
  }, [isAuthenticated, user, accessToken])

  // Kargo numarası olan siparişlerin takip bilgilerini otomatik yükle
  useEffect(() => {
    if (orders.length > 0 && user?.email) {
      orders.forEach(order => {
        if (order.trackingNumber && !trackingDataMap[order.orderNumber] && !loadingTracking[order.orderNumber]) {
          // İlk yüklemede otomatik olarak kargo bilgisini çek
          fetchTrackingInfo(order)
        }
      })
    }
  }, [orders, user?.email])

  const fetchMyOrders = async () => {
    if (!user?.email) {
      setError('Kullanıcı bilgisi bulunamadı')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError('')

      // Backend'de kullanıcı siparişlerini getiren endpoint
      const response = await fetch(`${API_BASE_URL}/orders/my-orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        } else if (response.status === 404) {
          // Endpoint bulunamadı veya sipariş yok
          setOrders([])
          return
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Siparişler yüklenemedi (${response.status})`)
        }
      }

      const data = await response.json()
      if (data.isSuccess || data.success) {
        // Backend'den gelen siparişleri set et
        const ordersList = data.data || []
        setOrders(ordersList)
        console.log('Siparişler yüklendi:', ordersList.length, 'adet')
      } else {
        // Başarısız response
        setOrders([])
        setError(data.message || 'Siparişler yüklenemedi')
      }
    } catch (err) {
      console.error('Siparişler yüklenirken hata:', err)
      setError(err.message || 'Siparişler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
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

  // Kargo takip bilgisini getir
  const fetchTrackingInfo = async (order) => {
    if (!order.trackingNumber || !user?.email) return

    const orderKey = order.orderNumber
    if (loadingTracking[orderKey] || trackingDataMap[orderKey]) return

    try {
      setLoadingTracking(prev => ({ ...prev, [orderKey]: true }))
      
      const url = new URL(`${API_BASE_URL}/shipping/track-by-order`)
      url.searchParams.append('orderNumber', order.orderNumber)
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
        setTrackingDataMap(prev => ({ ...prev, [orderKey]: data.data }))
      }
    } catch (err) {
      console.error('Kargo takip bilgisi alınırken hata:', err)
    } finally {
      setLoadingTracking(prev => ({ ...prev, [orderKey]: false }))
    }
  }

  // Kargo durumu metni
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
    return statusMap[status.toUpperCase()] || status
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="my-orders-container">
      <SEO
        title="Siparişlerim - Hiedra Perde"
        description="Siparişlerinizi görüntüleyin ve takip edin"
        url="/siparislerim"
      />
      
      <header className="my-orders-header">
        <h1>Siparişlerim</h1>
        <p>Tüm siparişlerinizi buradan görüntüleyebilir ve takip edebilirsiniz</p>
      </header>

      {error && !isLoading && (
        <div className="error-message" style={{ margin: '1rem', padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" style={{ margin: '1rem', padding: '1rem', backgroundColor: '#efe', color: '#3c3', borderRadius: '4px' }}>
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Siparişler yükleniyor...</p>
        </div>
      ) : error && orders.length === 0 ? (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchMyOrders} className="retry-btn">
            Tekrar Dene
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
            <circle cx="7" cy="20" r="2" />
            <circle cx="17" cy="20" r="2" />
          </svg>
          <h2>Henüz siparişiniz yok</h2>
          <p>İlk siparişinizi vermek için ürünlerimizi inceleyin</p>
          <Link to="/" className="shop-btn">
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id || order.orderNumber} className="order-card">
              <div className="order-card-header">
                <div className="order-info">
                  <h3>Sipariş No: {order.orderNumber}</h3>
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

              <div className="order-items-preview">
                {order.orderItems && order.orderItems.length > 0 ? (
                  <>
                    {order.orderItems.map((item, index) => {
                      // Görsel URL'ini kontrol et ve düzelt
                      let productImage = item.productImageUrl || '/images/perde1kapak.jpg'
                      // Eğer URL relative ise veya boşsa, varsayılan görseli kullan
                      if (!productImage || productImage === '' || productImage === 'null' || productImage === 'undefined') {
                        productImage = '/images/perde1kapak.jpg'
                      }
                      // Eğer URL http ile başlamıyorsa ve / ile başlamıyorsa, / ekle
                      if (!productImage.startsWith('http') && !productImage.startsWith('/')) {
                        productImage = '/' + productImage
                      }
                      return (
                        <div key={item.id || index} className="order-item-preview">
                          <div className="order-item-image-wrapper">
                            <LazyImage 
                              src={productImage} 
                              alt={item.productName || 'Ürün'} 
                              className="order-item-image"
                            />
                          </div>
                          <div className="order-item-info">
                            <span className="item-name">{item.productName || 'Ürün'}</span>
                            {item.quantity > 1 && (
                              <span className="item-quantity">Adet: {item.quantity}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </>
                ) : (
                  <p className="no-items-text">Sipariş detayı bulunamadı</p>
                )}
              </div>

              {/* Kargo Takip Bilgisi */}
              {order.trackingNumber && (
                <div className="order-tracking-section" style={{
                  padding: '1rem',
                  marginTop: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <strong>Kargo Takip:</strong> {order.trackingNumber}
                      {order.carrier && <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>({order.carrier})</span>}
                    </div>
                    <button
                      onClick={() => fetchTrackingInfo(order)}
                      disabled={loadingTracking[order.orderNumber]}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loadingTracking[order.orderNumber] ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        opacity: loadingTracking[order.orderNumber] ? 0.6 : 1
                      }}
                    >
                      {loadingTracking[order.orderNumber] ? 'Yükleniyor...' : 'Güncelle'}
                    </button>
                  </div>
                  
                  {trackingDataMap[order.orderNumber] ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        backgroundColor: trackingDataMap[order.orderNumber].status === 'DELIVERED' ? '#d4edda' :
                                        trackingDataMap[order.orderNumber].status === 'IN_TRANSIT' ? '#d1ecf1' :
                                        trackingDataMap[order.orderNumber].status === 'EXCEPTION' ? '#f8d7da' : '#fff3cd',
                        color: trackingDataMap[order.orderNumber].status === 'DELIVERED' ? '#155724' :
                               trackingDataMap[order.orderNumber].status === 'IN_TRANSIT' ? '#0c5460' :
                               trackingDataMap[order.orderNumber].status === 'EXCEPTION' ? '#721c24' : '#856404'
                      }}>
                        {getTrackingStatusText(trackingDataMap[order.orderNumber].status)}
                      </div>
                      {trackingDataMap[order.orderNumber].statusDescription && (
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                          {trackingDataMap[order.orderNumber].statusDescription}
                        </p>
                      )}
                      {trackingDataMap[order.orderNumber].events && trackingDataMap[order.orderNumber].events.length > 0 && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                          <strong>Son Hareket:</strong> {trackingDataMap[order.orderNumber].events[0].description || 'Bilgi yok'}
                          {trackingDataMap[order.orderNumber].events[0].location && (
                            <span style={{ marginLeft: '0.5rem' }}>📍 {trackingDataMap[order.orderNumber].events[0].location}</span>
                          )}
                        </div>
                      )}
                      <Link 
                        to={`/kargo-takip?trackingNumber=${order.trackingNumber}&orderNumber=${order.orderNumber}`}
                        style={{
                          display: 'inline-block',
                          marginTop: '0.75rem',
                          color: '#667eea',
                          textDecoration: 'none',
                          fontSize: '0.9rem',
                          fontWeight: '600'
                        }}
                      >
                        → Detaylı Takip Bilgisi
                      </Link>
                    </div>
                  ) : (
                    <Link 
                      to={`/kargo-takip?trackingNumber=${order.trackingNumber}&orderNumber=${order.orderNumber}`}
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        color: '#667eea',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}
                    >
                      → Kargo Durumunu Görüntüle
                    </Link>
                  )}
                </div>
              )}

              <div className="order-card-footer">
                <div className="order-total">
                  <span>Toplam:</span>
                  <span className="total-amount">
                    {(() => {
                      // Önce totalAmount'u kontrol et (en güvenilir)
                      if (order.totalAmount !== undefined && order.totalAmount !== null) {
                        const totalAmount = typeof order.totalAmount === 'string' 
                          ? parseFloat(order.totalAmount) 
                          : parseFloat(order.totalAmount.toString())
                        
                        if (!isNaN(totalAmount) && totalAmount > 0) {
                          return totalAmount.toFixed(2)
                        }
                      }
                      
                      // Eğer totalAmount yoksa veya 0 ise, orderItems'dan hesapla
                      if (order.orderItems && order.orderItems.length > 0) {
                        let itemsTotal = 0
                        order.orderItems.forEach(item => {
                          const itemPrice = item.price 
                            ? (typeof item.price === 'string' ? parseFloat(item.price) : parseFloat(item.price.toString()))
                            : 0
                          const quantity = item.quantity || 1
                          itemsTotal += itemPrice * quantity
                        })
                        
                        if (itemsTotal > 0) {
                          // Shipping cost ekle (varsa)
                          const shippingCost = (order.shippingCost && order.shippingCost !== null) 
                            ? (typeof order.shippingCost === 'string' 
                                ? parseFloat(order.shippingCost) 
                                : parseFloat(order.shippingCost.toString()))
                            : 0
                          
                          // Discount çıkar (varsa)
                          const discountAmount = (order.discountAmount && order.discountAmount !== null) 
                            ? (typeof order.discountAmount === 'string' 
                                ? parseFloat(order.discountAmount) 
                                : parseFloat(order.discountAmount.toString()))
                            : 0
                          
                          // Tax ekle (varsa)
                          const taxAmount = (order.taxAmount && order.taxAmount !== null) 
                            ? (typeof order.taxAmount === 'string' 
                                ? parseFloat(order.taxAmount) 
                                : parseFloat(order.taxAmount.toString()))
                            : 0
                          
                          const finalTotal = itemsTotal + shippingCost - discountAmount + taxAmount
                          return finalTotal > 0 ? finalTotal.toFixed(2) : itemsTotal.toFixed(2)
                        }
                      }
                      
                      // Son çare: subtotal + shippingCost - discountAmount + taxAmount
                      if (order.subtotal !== undefined && order.subtotal !== null) {
                        const subtotal = typeof order.subtotal === 'string' 
                          ? parseFloat(order.subtotal) 
                          : parseFloat(order.subtotal.toString())
                        
                        if (!isNaN(subtotal) && subtotal > 0) {
                          const shippingCost = (order.shippingCost && order.shippingCost !== null) 
                            ? (typeof order.shippingCost === 'string' 
                                ? parseFloat(order.shippingCost) 
                                : parseFloat(order.shippingCost.toString()))
                            : 0
                          
                          const discountAmount = (order.discountAmount && order.discountAmount !== null) 
                            ? (typeof order.discountAmount === 'string' 
                                ? parseFloat(order.discountAmount) 
                                : parseFloat(order.discountAmount.toString()))
                            : 0
                          
                          const taxAmount = (order.taxAmount && order.taxAmount !== null) 
                            ? (typeof order.taxAmount === 'string' 
                                ? parseFloat(order.taxAmount) 
                                : parseFloat(order.taxAmount.toString()))
                            : 0
                          
                          const calculatedTotal = subtotal + shippingCost - discountAmount + taxAmount
                          return calculatedTotal > 0 ? calculatedTotal.toFixed(2) : subtotal.toFixed(2)
                        }
                      }
                      
                      return '0.00'
                    })()} ₺
                  </span>
                </div>
                <div className="order-actions">
                  <Link 
                    to={`/siparis/${order.orderNumber}`}
                    className="view-order-btn"
                  >
                    Detayları Gör
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default MyOrders


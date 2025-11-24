import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import LazyImage from './LazyImage'
import './MyOrders.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const MyOrders = () => {
  const { user, isAuthenticated, accessToken, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [trackingDataMap, setTrackingDataMap] = useState({})
  const [loadingTracking, setLoadingTracking] = useState({})
  const [reviewModal, setReviewModal] = useState(null) // { productId, productName, productImage }
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewImages, setReviewImages] = useState([])
  const [reviewImagePreviews, setReviewImagePreviews] = useState([])
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [existingReviews, setExistingReviews] = useState({}) // productId -> reviewId mapping

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

  // Yorum yapma modalını aç
  const openReviewModal = (productId, productName, productImage) => {
    // Eğer kullanıcı bu ürüne zaten yorum yaptıysa, modal açma
    if (existingReviews[productId]) {
      setError('Bu ürüne zaten yorum yaptınız. Her ürüne sadece bir kez yorum yapabilirsiniz.')
      return
    }
    setReviewModal({ productId, productName, productImage })
    setReviewRating(0)
    setReviewComment('')
    setReviewImages([])
    setReviewImagePreviews([])
    setError('') // Modal açılırken hata mesajını temizle
  }

  // Yorum yapma modalını kapat
  const closeReviewModal = () => {
    setReviewModal(null)
    setReviewRating(0)
    setReviewComment('')
    setReviewImages([])
    setReviewImagePreviews([])
  }

  // Görsel seç
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + reviewImages.length > 5) {
      setError('En fazla 5 görsel yükleyebilirsiniz')
      return
    }
    
    const newImages = [...reviewImages, ...files]
    setReviewImages(newImages)
    
    // Preview oluştur
    const newPreviews = []
    newImages.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target.result)
        if (newPreviews.length === newImages.length) {
          setReviewImagePreviews(newPreviews)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // Görsel kaldır
  const removeImage = (index) => {
    const newImages = reviewImages.filter((_, i) => i !== index)
    const newPreviews = reviewImagePreviews.filter((_, i) => i !== index)
    setReviewImages(newImages)
    setReviewImagePreviews(newPreviews)
  }

  // Yorum gönder
  const submitReview = async () => {
    if (!reviewModal || !reviewRating || reviewRating < 1 || reviewRating > 5) {
      setError('Lütfen 1-5 arası bir puan seçin')
      return
    }

    if (!accessToken) {
      setError('Giriş yapmanız gerekiyor')
      return
    }

    // Tekrar kontrol: Eğer kullanıcı bu ürüne zaten yorum yaptıysa, gönderme
    if (existingReviews[reviewModal.productId]) {
      setError('Bu ürüne zaten yorum yaptınız. Her ürüne sadece bir kez yorum yapabilirsiniz.')
      closeReviewModal()
      return
    }

    setIsSubmittingReview(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('productId', reviewModal.productId.toString())
      formData.append('rating', reviewRating.toString())
      if (reviewComment.trim()) {
        formData.append('comment', reviewComment.trim())
      }
      reviewImages.forEach((image, index) => {
        formData.append('images', image)
      })

      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: formData
      })

      // 401 hatası kontrolü
      if (response.status === 401) {
        // Token geçersiz, kullanıcıyı logout yap ve giriş sayfasına yönlendir
        logout()
        setError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        closeReviewModal()
        setTimeout(() => {
          navigate('/giris', { state: { returnTo: '/siparislerim' } })
        }, 1500)
        return
      }

      const data = await response.json()

      if (!response.ok || !(data.isSuccess || data.success)) {
        // Backend'den gelen hata mesajını kontrol et
        const errorMessage = data.message || 'Yorum eklenirken bir hata oluştu'
        // Eğer "zaten yorum yaptınız" hatası ise, existingReviews'i güncelle ve butonu gizle
        if (errorMessage.includes('zaten yorum yaptınız') || errorMessage.includes('sadece bir kez')) {
          setExistingReviews(prev => ({
            ...prev,
            [reviewModal.productId]: true
          }))
        }
        throw new Error(errorMessage)
      }

      // Backend'den gelen mesajı kullan veya varsayılan mesaj göster
      const successMessage = data.message || 'Yorumunuz gönderildi. Yorumunuz kısa süre içinde yayınlanacaktır.'
      setSuccess(successMessage)
      
      // existingReviews'i güncelle - yorum gönderildi olarak işaretle (butonun gizlenmesi için)
      setExistingReviews(prev => ({
        ...prev,
        [reviewModal.productId]: true
      }))
      closeReviewModal()
      
      // Yorum kontrolünü tekrar yap (backend'den doğrulama için)
      setTimeout(() => {
        checkExistingReviewsForProduct(reviewModal.productId)
      }, 1500)
      
      // Siparişleri yeniden yükle (yorum durumunu güncellemek için) - biraz daha uzun bekle
      setTimeout(() => {
        fetchMyOrders()
      }, 2000)
    } catch (err) {
      console.error('Yorum eklenirken hata:', err)
      setError(err.message || 'Yorum eklenirken bir hata oluştu')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // Belirli bir ürün için yorum kontrolü yap
  const checkExistingReviewsForProduct = async (productId) => {
    if (!productId || !accessToken) return

    try {
      const response = await fetch(`${API_BASE_URL}/reviews/product/${productId}/has-reviewed`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess && data.data === true) {
          // Yorum yapılmışsa, existingReviews'e ekle
          setExistingReviews(prev => ({
            ...prev,
            [productId]: true
          }))
        } else {
          // Yorum yapılmamışsa, existingReviews'den çıkar
          setExistingReviews(prev => {
            const newReviews = { ...prev }
            delete newReviews[productId]
            return newReviews
          })
        }
      }
    } catch (err) {
      // Hata durumunda devam et
      console.error('Yorum kontrolü hatası:', err)
    }
  }

  // Kullanıcının bu ürüne yorum yapıp yapmadığını kontrol et
  useEffect(() => {
    const checkExistingReviews = async () => {
      if (!orders.length || !accessToken) {
        setExistingReviews({})
        return
      }

      const reviewMap = {}
      const productIds = new Set()
      
      // Tüm teslim edilmiş siparişlerdeki ürün ID'lerini topla
      for (const order of orders) {
        if ((order.status === 'DELIVERED' || order.status === 'TESLIM_EDILDI') && order.orderItems) {
          for (const item of order.orderItems) {
            if (item.productId) {
              productIds.add(item.productId)
            }
          }
        }
      }

      // Tüm ürünler için paralel kontrol yap
      const checkPromises = Array.from(productIds).map(async (productId) => {
        try {
          const response = await fetch(`${API_BASE_URL}/reviews/product/${productId}/has-reviewed`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            if (data.isSuccess && data.data === true) {
              return { productId, hasReviewed: true }
            }
          }
        } catch (err) {
          // Hata durumunda devam et
          console.error(`Yorum kontrolü hatası (productId: ${productId}):`, err)
        }
        return { productId, hasReviewed: false }
      })

      const results = await Promise.all(checkPromises)
      results.forEach(({ productId, hasReviewed }) => {
        if (hasReviewed) {
          reviewMap[productId] = true
        }
      })

      setExistingReviews(reviewMap)
    }

    checkExistingReviews()
  }, [orders, accessToken])

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
                      // TESLIM_EDILDI veya DELIVERED durumunda yorum yapılabilir
                      const canReview = (order.status === 'DELIVERED' || order.status === 'TESLIM_EDILDI') && item.productId
                      const hasReviewed = existingReviews[item.productId]

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
                            {canReview && !hasReviewed && (
                              <button
                                onClick={() => openReviewModal(item.productId, item.productName, productImage)}
                                className="review-btn"
                                style={{
                                  marginTop: '0.5rem',
                                  padding: '0.5rem 1rem',
                                  background: '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                                title="Bu ürüne yorum yap"
                              >
                                Yorum Yap
                              </button>
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

      {/* Yorum Yapma Modalı */}
      {reviewModal && (
        <div className="review-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={closeReviewModal}>
          <div className="review-modal" style={{
            background: 'white',
            borderRadius: '20px',
            padding: 0,
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              background: '#ffffff',
              padding: '1.5rem 2rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>Ürün Yorumu</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Deneyiminizi paylaşın</p>
              </div>
              <button
                onClick={closeReviewModal}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb'
                  e.currentTarget.style.color = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
              {/* Product Info */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <img
                  src={reviewModal.productImage}
                  alt={reviewModal.productName}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                    {reviewModal.productName}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9ca3af' }}>
                    Ürün hakkındaki görüşleriniz bizim için değerli
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '1rem',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  color: '#374151'
                }}>
                  Puanınız <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        transition: 'transform 0.15s',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill={star <= reviewRating ? "#fbbf24" : "none"}
                        stroke={star <= reviewRating ? "#f59e0b" : "#d1d5db"}
                        strokeWidth="1.5"
                        style={{ transition: 'all 0.2s' }}
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <span style={{
                      marginLeft: '1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      {reviewRating === 5 ? 'Mükemmel' : reviewRating === 4 ? 'Çok İyi' : reviewRating === 3 ? 'İyi' : reviewRating === 2 ? 'Orta' : 'Kötü'}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  color: '#374151'
                }}>
                  Yorumunuz
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'all 0.2s',
                    lineHeight: '1.5',
                    color: '#1f2937',
                    background: '#ffffff'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#9ca3af'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
                  maxLength={2000}
                />
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: reviewComment.length > 1900 ? '#ef4444' : '#9ca3af',
                  textAlign: 'right',
                  fontWeight: reviewComment.length > 1900 ? '600' : '400'
                }}>
                  {reviewComment.length}/2000 karakter
                </div>
              </div>

              {/* Images */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  color: '#374151'
                }}>
                  Fotoğraflar <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '0.8125rem' }}>(Opsiyonel, en fazla 5)</span>
                </label>
                <div style={{
                  border: '1px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                  background: '#f9fafb',
                  transition: 'all 0.2s',
                  marginBottom: '1rem'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = '#9ca3af'
                  e.currentTarget.style.background = '#f3f4f6'
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db'
                  e.currentTarget.style.background = '#f9fafb'
                }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={reviewImages.length >= 5}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: reviewImages.length >= 5 ? '#f3f4f6' : 'white',
                      cursor: reviewImages.length >= 5 ? 'not-allowed' : 'pointer',
                      fontSize: '0.8125rem',
                      color: '#374151'
                    }}
                  />
                  {reviewImages.length >= 5 && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#ef4444' }}>
                      Maksimum 5 fotoğraf yükleyebilirsiniz
                    </p>
                  )}
                </div>
                {reviewImagePreviews.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '1rem'
                  }}>
                    {reviewImagePreviews.map((preview, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #e5e7eb',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={{
                            position: 'absolute',
                            top: '0.25rem',
                            right: '0.25rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={closeReviewModal}
                  disabled={isSubmittingReview}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !isSubmittingReview && (e.currentTarget.style.background = '#e5e7eb')}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                  İptal
                </button>
                <button
                  onClick={submitReview}
                  disabled={isSubmittingReview || !reviewRating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: reviewRating ? '#374151' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: reviewRating ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s',
                    opacity: isSubmittingReview ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (reviewRating && !isSubmittingReview) {
                      e.currentTarget.style.background = '#1f2937'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = reviewRating ? '#374151' : '#d1d5db'
                  }}
                >
                  {isSubmittingReview ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></span>
                      Gönderiliyor...
                    </span>
                  ) : (
                    'Yorumu Gönder'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default MyOrders


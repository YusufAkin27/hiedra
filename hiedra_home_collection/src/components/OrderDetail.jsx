import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import LazyImage from './LazyImage'
import './OrderDetail.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const OrderDetail = () => {
  const { orderNumber } = useParams()
  const { user, isAuthenticated, accessToken, logout } = useAuth()
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
  const [reviewModal, setReviewModal] = useState(null) // { productId, productName, productImage }
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewImages, setReviewImages] = useState([])
  const [reviewImagePreviews, setReviewImagePreviews] = useState([])
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [existingReviews, setExistingReviews] = useState({}) // productId -> reviewId mapping
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    addressDetail: '',
    city: '',
    district: ''
  })
  const [customerForm, setCustomerForm] = useState({
    customerName: '',
    customerPhone: ''
  })

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

    // Authentication kontrolü - Token yoksa giriş sayfasına yönlendir
    if (!accessToken || !isAuthenticated) {
      setError('Sipariş detaylarını görüntülemek için giriş yapmanız gerekiyor.')
      setIsLoading(false)
      setTimeout(() => {
        navigate('/giris', { state: { returnTo: `/siparis/${orderNumber}` } })
      }, 1500)
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      // Backend'den sipariş detaylarını getir
      // NOT: customerEmail body'de gönderiliyor ama backend token'dan email alacak (güvenlik için)
      // Body'deki email sadece guest kullanıcılar için kullanılır
      const response = await fetch(`${API_BASE_URL}/orders/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}` // Zorunlu - Authentication gerektirir
        },
        body: JSON.stringify({
          orderNumber: orderNumber,
          customerEmail: user.email // Backend token'dan email alacak, bu sadece fallback
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token geçersiz, kullanıcıyı logout yap ve giriş sayfasına yönlendir
          logout()
          setError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
          setTimeout(() => {
            navigate('/giris', { state: { returnTo: `/siparis/${orderNumber}` } })
          }, 1500)
          return
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
        const orderDataWithAddress = {
          ...orderData,
          shippingAddress: orderData.addresses && orderData.addresses.length > 0 
            ? orderData.addresses[0] 
            : {}
        }
        setOrder(orderDataWithAddress)
        
        // Form verilerini doldur
        const address = orderDataWithAddress.shippingAddress || {}
        setAddressForm({
          fullName: address.fullName || orderDataWithAddress.customerName || '',
          phone: address.phone || orderDataWithAddress.customerPhone || '',
          addressLine: address.addressLine || '',
          addressDetail: address.addressDetail || '',
          city: address.city || '',
          district: address.district || ''
        })
        setCustomerForm({
          customerName: orderDataWithAddress.customerName || '',
          customerPhone: orderDataWithAddress.customerPhone || ''
        })
        
        // Eğer kargo takip numarası varsa, kargo bilgisini de çek
        if (orderData.trackingNumber) {
          fetchTrackingInfo(orderData.trackingNumber, orderData.orderNumber)
        }
        
        // Mevcut yorumları kontrol et (TESLIM_EDILDI veya DELIVERED)
        if ((orderData.status === 'DELIVERED' || orderData.status === 'TESLIM_EDILDI') && orderData.orderItems) {
          checkExistingReviews(orderData.orderItems)
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
    const statusUpper = status.toUpperCase()
    const statusMap = {
      'PENDING': 'Beklemede',
      'PAID': 'Ödendi',
      'PROCESSING': 'Hazırlanıyor',
      'SHIPPED': 'Kargoya Verildi',
      'DELIVERED': 'Teslim Edildi',
      'TESLIM_EDILDI': 'Teslim Edildi',
      'CANCELLED': 'İptal Edildi',
      'REFUNDED': 'İade Edildi',
      'REFUND_REQUESTED': 'İade Talebi'
    }
    return statusMap[statusUpper] || status
  }

  // Status badge rengi
  const getStatusClass = (status) => {
    if (!status) return 'status-unknown'
    const statusUpper = status.toUpperCase()
    if (statusUpper === 'DELIVERED' || statusUpper === 'TESLIM_EDILDI') return 'status-delivered'
    if (statusUpper === 'SHIPPED' || statusUpper === 'KARGOYA_VERILDI') return 'status-shipped'
    if (statusUpper === 'PROCESSING' || statusUpper === 'PAID' || statusUpper === 'ISLEME_ALINDI' || statusUpper === 'ODENDI') return 'status-processing'
    if (statusUpper === 'CANCELLED' || statusUpper === 'REFUNDED' || statusUpper === 'IPTAL_EDILDI' || statusUpper === 'IADE_YAPILDI') return 'status-cancelled'
    if (statusUpper === 'REFUND_REQUESTED' || statusUpper === 'IADE_TALEP_EDILDI') return 'status-refund'
    return 'status-pending'
  }

  // Kullanıcının bu ürünlere yorum yapıp yapmadığını kontrol et
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

  const checkExistingReviews = async (orderItems) => {
    if (!orderItems || !orderItems.length || !accessToken) {
      setExistingReviews({})
      return
    }

    const reviewMap = {}
    const productIds = new Set()
    
    // Tüm ürün ID'lerini topla
    for (const item of orderItems) {
      if (item.productId) {
        productIds.add(item.productId)
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
        // 401 hatasını görmezden gel (token süresi dolmuş olabilir)
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
    files.forEach((file) => {
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

  // Görsel sil
  const removeImage = (index) => {
    const newImages = reviewImages.filter((_, i) => i !== index)
    const newPreviews = reviewImagePreviews.filter((_, i) => i !== index)
    setReviewImages(newImages)
    setReviewImagePreviews(newPreviews)
  }

  // Adres güncelleme kontrolü - sadece belirli durumlarda güncellenebilir
  const canUpdateAddress = () => {
    if (!order || !order.status) return false
    const status = order.status.toUpperCase()
    // Kargoya verilmiş, teslim edilmiş veya iptal edilmiş siparişlerde güncellenemez
    return status !== 'SHIPPED' && status !== 'KARGOYA_VERILDI' && 
           status !== 'DELIVERED' && status !== 'TESLIM_EDILDI' &&
           status !== 'CANCELLED' && status !== 'IPTAL_EDILDI'
  }

  // Adres form değişiklikleri
  const handleAddressChange = (e) => {
    setAddressForm({
      ...addressForm,
      [e.target.name]: e.target.value
    })
  }

  // Müşteri bilgisi form değişiklikleri
  const handleCustomerChange = (e) => {
    setCustomerForm({
      ...customerForm,
      [e.target.name]: e.target.value
    })
  }

  // Adres güncelle
  const handleUpdateAddress = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.addressLine || 
        !addressForm.city || !addressForm.district) {
      setError('Lütfen tüm zorunlu alanları doldurunuz.')
      return
    }

    setIsUpdatingAddress(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderNumber}/address?email=${encodeURIComponent(user.email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          orderNumber: orderNumber,
          fullName: addressForm.fullName,
          phone: addressForm.phone,
          addressLine: addressForm.addressLine,
          addressDetail: addressForm.addressDetail || '',
          city: addressForm.city,
          district: addressForm.district,
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          setError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
          setTimeout(() => {
            navigate('/giris', { state: { returnTo: `/siparis/${orderNumber}` } })
          }, 1500)
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Adres güncellenemedi')
      }

      const data = await response.json()
      if (data.success || data.isSuccess) {
        setSuccess('Adres başarıyla güncellendi!')
        setShowAddressForm(false)
        // Siparişi yeniden yükle
        await fetchOrderDetails()
      } else {
        throw new Error(data.message || 'Adres güncellenemedi')
      }
    } catch (err) {
      console.error('Adres güncellenirken hata:', err)
      setError(err.message || 'Adres güncellenirken bir hata oluştu')
    } finally {
      setIsUpdatingAddress(false)
    }
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
      // Token kontrolü
      if (!accessToken) {
        setError('Giriş yapmanız gerekiyor. Lütfen sayfayı yenileyip tekrar deneyin.')
        setIsSubmittingReview(false)
        return
      }

      const formData = new FormData()
      formData.append('productId', reviewModal.productId.toString())
      formData.append('rating', reviewRating.toString())
      if (reviewComment.trim()) {
        formData.append('comment', reviewComment.trim())
      }
      reviewImages.forEach((image, index) => {
        formData.append('images', image)
      })

      // Headers oluştur - Content-Type eklemeyin, FormData için browser otomatik ekler
      const headers = {}
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      console.log('Yorum gönderiliyor:', {
        productId: reviewModal.productId,
        rating: reviewRating,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length
      })

      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: headers,
        body: formData
      })

      // 401 hatası kontrolü
      if (response.status === 401) {
        // Token geçersiz, kullanıcıyı logout yap ve giriş sayfasına yönlendir
        logout()
        setError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        closeReviewModal()
        setTimeout(() => {
          navigate('/giris', { state: { returnTo: `/siparis/${orderNumber}` } })
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
      
      // Siparişi yeniden yükle (yorum durumunu güncellemek için) - biraz daha uzun bekle
      setTimeout(() => {
        fetchOrderDetails()
      }, 2000)
    } catch (err) {
      console.error('Yorum eklenirken hata:', err)
      setError(err.message || 'Yorum eklenirken bir hata oluştu')
    } finally {
      setIsSubmittingReview(false)
    }
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
                    const productImage = item.productImageUrl || '/images/perde1kapak.jpg'
                    // TESLIM_EDILDI veya DELIVERED durumunda yorum yapılabilir
                    const canReview = (order.status === 'DELIVERED' || order.status === 'TESLIM_EDILDI') && item.productId
                    const hasReviewed = existingReviews[item.productId]
                    return (
                      <div key={item.id || index} className="order-item-detail">
                        <div className="order-item-image-wrapper-detail">
                          <LazyImage 
                            src={productImage} 
                            alt={item.productName || 'Ürün'} 
                            className="order-item-image-detail"
                          />
                        </div>
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
                          {canReview && !hasReviewed && (
                            <button
                              onClick={() => openReviewModal(item.productId, item.productName, productImage)}
                              className="review-btn"
                              style={{
                                marginTop: '0.75rem',
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
                  })
                ) : (
                  <p>Sipariş detayı bulunamadı</p>
                )}
              </div>
            </div>

            {/* Teslimat Adresi */}
            <div className="order-section">
              <div className="section-header-with-action">
                <h3>Teslimat Adresi</h3>
                {canUpdateAddress() && !showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="edit-btn"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Düzenle
                  </button>
                )}
              </div>
              {!showAddressForm ? (
                <div className="address-details">
                  {order.shippingAddress && (
                    <>
                      {(order.shippingAddress.fullName || order.customerName) && (
                        <p><strong>Ad Soyad:</strong> {order.shippingAddress.fullName || order.customerName}</p>
                      )}
                      {(order.shippingAddress.phone || order.customerPhone) && (
                        <p><strong>Telefon:</strong> {order.shippingAddress.phone || order.customerPhone}</p>
                      )}
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
              ) : (
                <div className="address-form-container">
                  <div className="form-group">
                    <label htmlFor="address-fullName">Ad Soyad <span className="required">*</span></label>
                    <input
                      id="address-fullName"
                      type="text"
                      name="fullName"
                      value={addressForm.fullName}
                      onChange={handleAddressChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address-phone">Telefon <span className="required">*</span></label>
                    <input
                      id="address-phone"
                      type="text"
                      name="phone"
                      value={addressForm.phone}
                      onChange={handleAddressChange}
                      required
                      className="form-input"
                      placeholder="Örn: +905551234567"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address-line">Adres Satırı <span className="required">*</span></label>
                    <input
                      id="address-line"
                      type="text"
                      name="addressLine"
                      value={addressForm.addressLine}
                      onChange={handleAddressChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address-detail">Adres Detayı</label>
                    <input
                      id="address-detail"
                      type="text"
                      name="addressDetail"
                      value={addressForm.addressDetail}
                      onChange={handleAddressChange}
                      className="form-input"
                      placeholder="Daire, Kat, Bina No vb."
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="address-district">İlçe <span className="required">*</span></label>
                      <input
                        id="address-district"
                        type="text"
                        name="district"
                        value={addressForm.district}
                        onChange={handleAddressChange}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="address-city">Şehir <span className="required">*</span></label>
                      <input
                        id="address-city"
                        type="text"
                        name="city"
                        value={addressForm.city}
                        onChange={handleAddressChange}
                        required
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      onClick={() => {
                        setShowAddressForm(false)
                        // Form verilerini sıfırla
                        const address = order.shippingAddress || {}
                        setAddressForm({
                          fullName: address.fullName || order.customerName || '',
                          phone: address.phone || order.customerPhone || '',
                          addressLine: address.addressLine || '',
                          addressDetail: address.addressDetail || '',
                          city: address.city || '',
                          district: address.district || ''
                        })
                      }}
                      className="cancel-btn"
                      type="button"
                      disabled={isUpdatingAddress}
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleUpdateAddress}
                      className="save-btn"
                      type="button"
                      disabled={isUpdatingAddress}
                    >
                      {isUpdatingAddress ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}
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
              <div className="section-header-with-action">
                <h3>Müşteri Bilgileri</h3>
                {canUpdateAddress() && !showCustomerForm && (
                  <button
                    onClick={() => setShowCustomerForm(true)}
                    className="edit-btn"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Düzenle
                  </button>
                )}
              </div>
              {!showCustomerForm ? (
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
              ) : (
                <div className="customer-form-container">
                  <div className="form-group">
                    <label htmlFor="customer-name">Ad Soyad <span className="required">*</span></label>
                    <input
                      id="customer-name"
                      type="text"
                      name="customerName"
                      value={customerForm.customerName}
                      onChange={handleCustomerChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customer-phone">Telefon <span className="required">*</span></label>
                    <input
                      id="customer-phone"
                      type="text"
                      name="customerPhone"
                      value={customerForm.customerPhone}
                      onChange={handleCustomerChange}
                      required
                      className="form-input"
                      placeholder="Örn: +905551234567"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customer-email">E-posta</label>
                    <input
                      id="customer-email"
                      type="email"
                      value={order.customerEmail || ''}
                      disabled
                      className="form-input disabled"
                    />
                    <small className="form-hint">E-posta adresi değiştirilemez</small>
                  </div>
                  <div className="form-actions">
                    <button
                      onClick={() => {
                        setShowCustomerForm(false)
                        setCustomerForm({
                          customerName: order.customerName || '',
                          customerPhone: order.customerPhone || ''
                        })
                      }}
                      className="cancel-btn"
                      type="button"
                      disabled={isUpdatingAddress}
                    >
                      İptal
                    </button>
                    <button
                      onClick={async () => {
                        if (!customerForm.customerName || !customerForm.customerPhone) {
                          setError('Lütfen tüm zorunlu alanları doldurunuz.')
                          return
                        }
                        setIsUpdatingAddress(true)
                        setError('')
                        try {
                          // Adres güncelleme API'sini kullan (müşteri bilgileri de adresle birlikte güncellenir)
                          const response = await fetch(`${API_BASE_URL}/orders/${orderNumber}/address?email=${encodeURIComponent(user.email)}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
                            },
                            body: JSON.stringify({
                              orderNumber: orderNumber,
                              fullName: customerForm.customerName,
                              phone: customerForm.customerPhone,
                              addressLine: addressForm.addressLine || order.shippingAddress?.addressLine || '',
                              addressDetail: addressForm.addressDetail || order.shippingAddress?.addressDetail || '',
                              city: addressForm.city || order.shippingAddress?.city || '',
                              district: addressForm.district || order.shippingAddress?.district || '',
                            })
                          })
                          if (response.ok) {
                            const data = await response.json()
                            if (data.success || data.isSuccess) {
                              setSuccess('Bilgiler başarıyla güncellendi!')
                              setShowCustomerForm(false)
                              await fetchOrderDetails()
                            } else {
                              throw new Error(data.message || 'Bilgiler güncellenemedi')
                            }
                          } else {
                            const errorData = await response.json().catch(() => ({}))
                            throw new Error(errorData.message || 'Bilgiler güncellenemedi')
                          }
                        } catch (err) {
                          setError(err.message || 'Bilgiler güncellenirken bir hata oluştu')
                        } finally {
                          setIsUpdatingAddress(false)
                        }
                      }}
                      className="save-btn"
                      type="button"
                      disabled={isUpdatingAddress}
                    >
                      {isUpdatingAddress ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}
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

            {/* İade Talebi Butonu - Sayfanın En Altı */}
            {canRefund() && (
              <div className="refund-button-section">
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="refund-request-btn"
                  disabled={isProcessing}
                >
                  İade Talebi
                </button>
              </div>
            )}
          </div>

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


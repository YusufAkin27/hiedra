  const handleSendCode = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
    }
    if (!validateEmailForm()) {
      return
    }

    setIsSendingCode(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/lookup/request-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      const data = await response.json()
      const success = data.success ?? data.isSuccess ?? response.ok

      if (!success) {
        throw new Error(data.message || 'Doğrulama kodu gönderilemedi.')
      }

      showToast('Doğrulama kodu e-posta adresinize gönderildi.', 'success')
      setVerificationCode('')
      setLookupToken('')
      setOrders([])
      setOrderData(null)
      setSelectedOrderNumber(null)
      setStep('verify')
    } catch (err) {
      setError(err.message || 'Doğrulama kodu gönderilemedi.')
      showToast(err.message || 'Doğrulama kodu gönderilemedi.', 'error')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
    }

    if (!verificationCode.trim()) {
      showToast('Lütfen e-posta adresinize gelen doğrulama kodunu giriniz.', 'error')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/lookup/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
        }),
      })

      const data = await response.json()
      const success = data.success ?? data.isSuccess ?? response.ok

      if (!success || !data.data?.lookupToken) {
        throw new Error(data.message || 'Doğrulama başarısız.')
      }

      const token = data.data.lookupToken
      setLookupToken(token)
      showToast('Doğrulama başarılı. Siparişleriniz yükleniyor...', 'success')
      await loadOrders(token)
    } catch (err) {
      setError(err.message || 'Doğrulama başarısız oldu.')
      showToast(err.message || 'Doğrulama başarısız oldu.', 'error')
    } finally {
      setIsVerifying(false)
    }
  }

  const loadOrders = async (tokenOverride) => {
    const tokenToUse = tokenOverride || lookupToken
    if (!tokenToUse) return

    setIsLoading(true)
    setError('')
    setOrders([])

    try {
      const response = await fetch(`${API_BASE_URL}/lookup?token=${encodeURIComponent(tokenToUse)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      const success = data.success ?? data.isSuccess ?? response.ok

      if (!success) {
        throw new Error(data.message || 'Siparişler alınamadı.')
      }

      setOrders(data.data || [])
      setStep('list')
      setOrderData(null)
      setSelectedOrderNumber(null)
      setShowAddressForm(false)
      setShowCancelModal(false)
      setShowRefundModal(false)
    } catch (err) {
      setError(err.message || 'Siparişler alınırken bir hata oluştu.')
      showToast(err.message || 'Siparişler alınırken bir hata oluştu.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewOrder = async (order) => {
    const orderNumberParam = typeof order === 'string' ? order : order?.orderNumber
    if (!orderNumberParam) return
    await fetchOrderDetail(orderNumberParam)
  }

  const handleResendCode = async () => {
    await handleSendCode()
  }

  const handleBackToList = () => {
    setOrderData(null)
    setShowAddressForm(false)
    setShowCancelModal(false)
    setShowRefundModal(false)
    setTrackingData(null)
    setStep('list')
  }
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import './OrderLookup.css'

// Backend base URL
const BACKEND_BASE_URL = 'http://localhost:8080'
const API_BASE_URL = `${BACKEND_BASE_URL}/api/orders`
const SHIPPING_API_BASE_URL = `${BACKEND_BASE_URL}/api/shipping`

const OrderLookup = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [userCaptcha, setUserCaptcha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [orderData, setOrderData] = useState(null)
  const [error, setError] = useState('')
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('Müşteri isteği')
  const [refundReason, setRefundReason] = useState('İade talebi')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [trackingData, setTrackingData] = useState(null)
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [verificationCode, setVerificationCode] = useState('')
  const [lookupToken, setLookupToken] = useState('')
  const [step, setStep] = useState('request')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null)
  const captchaRef = useRef(null)
  const authHeaders = () => {
    const headers = { 'Content-Type': 'application/json' }
    if (lookupToken) {
      headers['X-Order-Lookup-Token'] = lookupToken
    }
    return headers
  }

  // Login olan kullanıcıları siparişlerim sayfasına yönlendir
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/siparislerim')
    }
  }, [isAuthenticated, navigate])
  
  // Toast bildirim göster
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 4000)
  }

  // Adres güncelleme formu state
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    addressDetail: '',
    city: '',
    district: ''
  })

  // Basit captcha oluştur
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Component mount olduğunda captcha oluştur
  useEffect(() => {
    setCaptcha(generateCaptcha())
  }, [])

  // Captcha'yı yenile
  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha())
    setUserCaptcha('')
    if (captchaRef.current) {
      captchaRef.current.focus()
    }
  }

  function validateEmailForm() {
    if (!email.trim() || !email.includes('@')) {
      showToast('Lütfen geçerli bir e-posta adresi giriniz.', 'error')
      return false
    }
    if (!userCaptcha.trim()) {
      showToast('Lütfen güvenlik kodunu giriniz.', 'error')
      return false
    }
    if (userCaptcha.toUpperCase() !== captcha.toUpperCase()) {
      showToast('Güvenlik kodu hatalı! Lütfen tekrar deneyiniz.', 'error')
      refreshCaptcha()
      return false
    }
    return true
  }

  const fetchOrderDetail = async (orderNumberParam, tokenOverride) => {
    if (!orderNumberParam) return
    const tokenToUse = tokenOverride || lookupToken
    if (!tokenToUse) {
      showToast('Lütfen önce doğrulama işlemini tamamlayın.', 'error')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/lookup/${orderNumberParam}?token=${encodeURIComponent(tokenToUse)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok || !(data.success ?? data.isSuccess)) {
        throw new Error(data.message || 'Sipariş bulunamadı')
      }

      const order = data.data
      if (!order) {
        throw new Error('Sipariş bulunamadı')
      }

      setOrderData({
        ...order,
        shippingAddress: order.addresses && order.addresses.length > 0
          ? order.addresses[0]
          : {}
      })

      const address = order.addresses && order.addresses.length > 0 ? order.addresses[0] : {}
      setAddressForm({
        fullName: order.customerName || '',
        phone: order.customerPhone || '',
        addressLine: address.addressLine || '',
        addressDetail: address.addressDetail || '',
        city: address.city || '',
        district: address.district || '',
      })

      setSelectedOrderNumber(order.orderNumber)
      setShowAddressForm(false)
      setShowCancelModal(false)
      setShowRefundModal(false)
      setStep('detail')

      if (order.trackingNumber) {
        fetchTrackingInfo(order.orderNumber, email.trim())
      } else {
        setTrackingData(null)
      }
    } catch (err) {
      setError(err.message || 'Sipariş detayları alınırken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Kargo takip bilgisini getir
  const fetchTrackingInfo = async (orderNumber, customerEmail) => {
    if (!orderNumber || !customerEmail) return

    try {
      setIsTrackingLoading(true)
      const url = new URL(`${SHIPPING_API_BASE_URL}/track-by-order`)
      url.searchParams.append('orderNumber', orderNumber)
      url.searchParams.append('email', customerEmail)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.isSuccess || data.success) {
        setTrackingData(data.data)
      } else {
        setTrackingData(null)
      }
    } catch (err) {
      console.error('Kargo takip bilgisi alınırken hata:', err)
      setTrackingData(null)
    } finally {
      setIsTrackingLoading(false)
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

  // Kargo durumu badge rengi
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

  // Yeni sorgulama yap
  const handleNewLookup = () => {
    setEmail('')
    setUserCaptcha('')
    setOrderData(null)
    setOrders([])
    setError('')
    setShowAddressForm(false)
    setShowCancelModal(false)
    setShowRefundModal(false)
    setTrackingData(null)
    setLookupToken('')
    setVerificationCode('')
    setSelectedOrderNumber(null)
    setStep('request')
    refreshCaptcha()
  }

  // Adres güncelleme
  const handleAddressChange = (e) => {
    setAddressForm({
      ...addressForm,
      [e.target.name]: e.target.value
    })
  }

  const handleUpdateAddress = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.addressLine || 
        !addressForm.city || !addressForm.district) {
      showToast('Lütfen tüm zorunlu alanları doldurunuz.', 'error')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/${orderData.orderNumber}/address?email=${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          orderNumber: orderData.orderNumber,
          fullName: addressForm.fullName,
          phone: addressForm.phone,
          addressLine: addressForm.addressLine,
          addressDetail: addressForm.addressDetail || '',
          city: addressForm.city,
          district: addressForm.district,
        })
      })

      const contentType = response.headers.get('content-type') || ''
      let data

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        throw new Error('Beklenmeyen yanıt formatı')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Adres güncellenemedi')
      }

      if (data.success) {
        showToast('Adres başarıyla güncellendi!', 'success')
        setShowAddressForm(false)
        // Siparişi tekrar sorgula
        await fetchOrderDetail(orderData.orderNumber)
      }
    } catch (err) {
      setError(err.message || 'Adres güncellenirken bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  // Sipariş iptali
  const handleCancelOrder = async () => {
    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/${orderData.orderNumber}/cancel?email=${encodeURIComponent(email)}&reason=${encodeURIComponent(cancelReason)}`, {
        method: 'POST',
        headers: authHeaders()
      })

      const contentType = response.headers.get('content-type') || ''
      let data

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        throw new Error('Beklenmeyen yanıt formatı')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Sipariş iptal edilemedi')
      }

      if (data.success) {
        showToast('Sipariş iptal talebiniz alındı!', 'success')
        setShowCancelModal(false)
        // Siparişi tekrar sorgula
        await fetchOrderDetail(orderData.orderNumber)
      }
    } catch (err) {
      setError(err.message || 'Sipariş iptal edilirken bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  // İade talebi
  const handleRequestRefund = async () => {
    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/${orderData.orderNumber}/refund?email=${encodeURIComponent(email)}&reason=${encodeURIComponent(refundReason)}`, {
        method: 'POST',
        headers: authHeaders()
      })

      const contentType = response.headers.get('content-type') || ''
      let data

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        throw new Error('Beklenmeyen yanıt formatı')
      }

      if (!response.ok) {
        throw new Error(data.message || 'İade talebi oluşturulamadı')
      }

      if (data.success) {
        showToast('İade talebiniz alındı!', 'success')
        setShowRefundModal(false)
        // Siparişi tekrar sorgula
        await fetchOrderDetail(orderData.orderNumber)
      }
    } catch (err) {
      setError(err.message || 'İade talebi oluşturulurken bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  // Sipariş iptal edilebilir mi?
  const canCancel = () => {
    if (!orderData || !orderData.status) return false
    const status = orderData.status.toUpperCase()
    return status === 'PENDING' || status === 'PAID' || status === 'PROCESSING'
  }

  // İade talep edilebilir mi?
  const canRefund = () => {
    if (!orderData || !orderData.status) return false
    const status = orderData.status.toUpperCase()
    return status === 'SHIPPED' || status === 'DELIVERED'
  }

  const canUpdateAddress = () => {
    if (!orderData || !orderData.status) return false
    const status = orderData.status.toUpperCase()
    return status === 'PAID' || status === 'PROCESSING'
  }

  useEffect(() => {
    if (!canUpdateAddress() && showAddressForm) {
      setShowAddressForm(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderData])

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
      'REFUNDED': 'İade Edildi'
    }
    return statusMap[status.toUpperCase()] || status
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Sipariş Sorgula - Perde Satış Sipariş Takibi',
    description: 'Perde satış sipariş durumu sorgulama sayfası. Sipariş numaranız ile siparişinizin durumunu takip edin.',
    url: typeof window !== 'undefined' ? window.location.href : 'https://hiedra.com/siparis-sorgula'
  }

  const getProductImage = (item) => {
    if (!item) return '/images/perde1kapak.jpg'
    let image = item.productImageUrl || item.coverImageUrl || '/images/perde1kapak.jpg'
    if (!image || image === '' || image === 'null' || image === 'undefined') {
      image = '/images/perde1kapak.jpg'
    }
    if (!image.startsWith('http') && !image.startsWith('/')) {
      image = '/' + image
    }
    return image
  }

  return (
    <div className="order-lookup-container">
      <SEO
        title="Sipariş Sorgula - Perde Satış Sipariş Takibi | Hiedra Perde"
        description="Perde satış sipariş sorgulama sayfası. Siparişinizin durumunu öğrenmek için sipariş numaranızı ve e-posta adresinizi giriniz. Hiedra Perde sipariş takip sistemi."
        keywords="sipariş sorgula, sipariş takip, perde satış sipariş sorgulama, sipariş durumu, kargo takip, perde sipariş takibi"
        url="/siparis-sorgula"
        structuredData={structuredData}
      />
      <header className="lookup-header">
        <h1>Sipariş Sorgula - Perde Satış Sipariş Takibi</h1>
        <p>Perde satış siparişinizin durumunu takip etmek için bilgilerinizi giriniz</p>
      </header>

      {step === 'request' && (
        <div className="lookup-form-container">
          {error && (
            <div className="error-message" style={{ 
              padding: '1rem', 
              backgroundColor: '#fee', 
              color: '#c33', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}
          <form className="lookup-form" onSubmit={handleSendCode}>
            <div className="form-group">
              <label htmlFor="email">
                E-posta Adresi <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="siparis@email.com"
                required
              />
              <p className="form-hint">Sipariş verdiğiniz e-posta adresini giriniz</p>
            </div>

            <div className="form-group">
              <label htmlFor="captcha">
                Güvenlik Kodu <span className="required">*</span>
              </label>
              <div className="captcha-container">
                <div className="captcha-display" onClick={refreshCaptcha}>
                  <span className="captcha-text">{captcha}</span>
                  <button
                    type="button"
                    className="captcha-refresh"
                    onClick={(e) => {
                      e.preventDefault()
                      refreshCaptcha()
                    }}
                    title="Yenile"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>
                </div>
                <input
                  ref={captchaRef}
                  type="text"
                  id="captcha"
                  value={userCaptcha}
                  onChange={(e) => setUserCaptcha(e.target.value.toUpperCase())}
                  placeholder="Yukarıdaki kodu giriniz"
                  required
                  maxLength="5"
                  className="captcha-input"
                />
              </div>
              <p className="form-hint">Yukarıdaki kodu giriniz (büyük/küçük harf duyarsız)</p>
            </div>

            <button type="submit" className="lookup-btn" disabled={isSendingCode}>
              {isSendingCode ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Kod Gönderiliyor...
                </>
              ) : (
                'Doğrulama Kodunu Gönder'
              )}
            </button>
          </form>
        </div>
      )}

      {step === 'verify' && (
        <div className="lookup-form-container">
          {error && (
            <div className="error-message" style={{ 
              padding: '1rem', 
              backgroundColor: '#fee', 
              color: '#c33', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}
          <div className="verification-info">
            <h3>Kodunuzu Girin</h3>
            <p>{email} adresine gönderdiğimiz 6 haneli kodu girerek siparişlerinizi görüntüleyebilirsiniz.</p>
          </div>
          <form className="lookup-form" onSubmit={handleVerifyCode}>
            <div className="form-group">
              <label htmlFor="verificationCode">
                Doğrulama Kodu <span className="required">*</span>
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="Örn: 123456"
                required
                maxLength="6"
              />
              <p className="form-hint">Kod gelmediyse birkaç dakika bekleyip tekrar gönderebilirsiniz.</p>
            </div>
            <button type="submit" className="lookup-btn" disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Doğrulanıyor...
                </>
              ) : (
                'Kodumu Doğrula'
              )}
            </button>
          </form>
          <button className="link-button" type="button" onClick={handleResendCode} disabled={isSendingCode}>
            Kod gelmedi mi? Tekrar gönder
          </button>
        </div>
      )}

      {step === 'list' && (
        <div className="order-list-container">
          {error && (
            <div className="error-message" style={{ 
              padding: '1rem', 
              backgroundColor: '#fee', 
              color: '#c33', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}
          <div className="order-list-header">
            <div>
              <h3>{email} adresine ait siparişler</h3>
              <p>Detay görmek istediğiniz siparişi seçin.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="new-lookup-btn" onClick={() => loadOrders()}>
                Siparişleri Yenile
              </button>
              <button className="new-lookup-btn" onClick={handleNewLookup}>
                ← Yeni E-posta ile Sorgula
              </button>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="empty-orders">
              <p>Bu e-posta ile ilişkili sipariş bulunamadı.</p>
            </div>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <div key={order.orderNumber} className="order-card">
                  <div className="order-card-header">
                    <h4>Sipariş No: {order.orderNumber}</h4>
                    <span className={`status-badge ${(order.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="order-card-body">
                    <p><strong>Tarih:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '-'}</p>
                    <p><strong>Toplam:</strong> {order.totalAmount ? parseFloat(order.totalAmount).toFixed(2) : '0.00'} ₺</p>
                    <p><strong>Ürün:</strong> {(order.orderItems && order.orderItems[0]?.productName) || 'N/A'}</p>
                  </div>
                  <button
                    type="button"
                    className="new-lookup-btn"
                    onClick={() => handleViewOrder(order.orderNumber)}
                  >
                    Detayı Gör
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'detail' && orderData && (
        <div className="order-details-container">
          {error && (
            <div className="error-message" style={{ 
              padding: '1rem', 
              backgroundColor: '#fee', 
              color: '#c33', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          <div className="order-header-actions">
            <div className="action-buttons" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleNewLookup} className="new-lookup-btn">
                ← Yeni E-posta ile Sorgula
              </button>
              {lookupToken && (
                <button onClick={handleBackToList} className="new-lookup-btn">
                  ← Sipariş Listesine Dön
                </button>
              )}
            </div>
            <div className="action-buttons">
              {canCancel() && (
                <button 
                  onClick={() => setShowCancelModal(true)} 
                  className="cancel-btn"
                  disabled={isProcessing}
                >
                  Siparişi İptal Et
                </button>
              )}
              {canRefund() && (
                <button 
                  onClick={() => setShowRefundModal(true)} 
                  className="refund-btn"
                  disabled={isProcessing}
                >
                  İade Talep Et
                </button>
              )}
              {canUpdateAddress() && (
                <button 
                  onClick={() => setShowAddressForm(!showAddressForm)} 
                  className="update-address-btn"
                >
                  {showAddressForm ? 'Adres Formunu Kapat' : 'Adresi Güncelle'}
                </button>
              )}
            </div>
          </div>

          <div className="order-status-card">
            <div className="status-header">
              <div className="status-info">
                <h3>Sipariş No: {orderData.orderNumber}</h3>
                <span className={`status-badge ${(orderData.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                  {getStatusText(orderData.status)}
                </span>
              </div>
              <div className="order-date">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {orderData.createdAt ? new Date(orderData.createdAt).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Tarih bilgisi yok'}
              </div>
            </div>
          </div>

          {showAddressForm && canUpdateAddress() && (
            <div className="order-section address-form-section">
              <h3>Adres Güncelle</h3>
              <div className="address-form">
                <div className="form-group">
                  <label>Ad Soyad <span className="required">*</span></label>
                  <input
                    type="text"
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Telefon <span className="required">*</span></label>
                  <input
                    type="text"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Adres Satırı <span className="required">*</span></label>
                  <input
                    type="text"
                    name="addressLine"
                    value={addressForm.addressLine}
                    onChange={handleAddressChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Adres Detayı</label>
                  <input
                    type="text"
                    name="addressDetail"
                    value={addressForm.addressDetail}
                    onChange={handleAddressChange}
                  />
                </div>
                <div className="form-group">
                  <label>Şehir <span className="required">*</span></label>
                  <input
                    type="text"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressChange}
                    required
                    style={{ width: '100%', padding: '0.5rem' }}
                  />
                </div>
                <div className="form-group">
                  <label>İlçe <span className="required">*</span></label>
                  <input
                    type="text"
                    name="district"
                    value={addressForm.district}
                    onChange={handleAddressChange}
                    required
                    style={{ width: '100%', padding: '0.5rem' }}
                  />
                </div>
                <button 
                  onClick={handleUpdateAddress} 
                  className="lookup-btn"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Güncelleniyor...' : 'Adresi Güncelle'}
                </button>
              </div>
            </div>
          )}

          <div className="order-section">
            <h3>Sipariş Detayları</h3>
            <div className="order-items">
              {orderData.orderItems && orderData.orderItems.length > 0 ? (
                orderData.orderItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-image">
                      <img
                        src={getProductImage(item)}
                        alt={item.productName || 'Sipariş ürünü'}
                        loading="lazy"
                      />
                    </div>
                    <div className="item-info">
                      <h4>{item.productName || 'Ürün'}</h4>
                      <div className="item-customizations">
                        {item.width && <span>En: {item.width} cm</span>}
                        {item.height && <span>Boy: {item.height} cm</span>}
                        {item.pleatType && (
                          <span>Pile: {item.pleatType === 'pilesiz' ? 'Pilesiz' : item.pleatType}</span>
                        )}
                      </div>
                      <span className="item-quantity">Adet: {item.quantity || 1}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>Sipariş detayı bulunamadı</p>
              )}
            </div>
            {canRefund() && (
              <button
                type="button"
                className="inline-refund-btn"
                onClick={() => setShowRefundModal(true)}
              >
                Bu Ürün İçin İade Talebi Oluştur
              </button>
            )}
            <div className="order-total">
              <span>Toplam:</span>
              <span>{orderData.totalAmount ? parseFloat(orderData.totalAmount).toFixed(2) : '0.00'} ₺</span>
            </div>
          </div>

          <div className="order-section">
            <h3>Teslimat Adresi</h3>
            <div className="address-details">
              {orderData.shippingAddress && (
                <>
                  {orderData.shippingAddress.addressLine && (
                    <p>{orderData.shippingAddress.addressLine}</p>
                  )}
                  {orderData.shippingAddress.addressDetail && (
                    <p>{orderData.shippingAddress.addressDetail}</p>
                  )}
                  {(orderData.shippingAddress.district || orderData.shippingAddress.city) && (
                    <p>{orderData.shippingAddress.district || ''} {orderData.shippingAddress.district && orderData.shippingAddress.city ? '/' : ''} {orderData.shippingAddress.city || ''}</p>
                  )}
                </>
              )}
              {(!orderData.shippingAddress || (!orderData.shippingAddress.addressLine && !orderData.shippingAddress.city)) && (
                <p>Adres bilgisi bulunamadı</p>
              )}
            </div>
          </div>

          {orderData.cancelReason && (
            <div className="order-section">
              <h3>İptal Bilgisi</h3>
              <div className="address-details">
                <p><strong>Sebep:</strong> {orderData.cancelReason}</p>
                {orderData.cancelledAt && (
                  <p><strong>İptal Tarihi:</strong> {new Date(orderData.cancelledAt).toLocaleDateString('tr-TR')}</p>
                )}
              </div>
            </div>
          )}

          {orderData.refundedAt && (
            <div className="order-section">
              <h3>İade Bilgisi</h3>
              <div className="address-details">
                <p><strong>İade Tarihi:</strong> {new Date(orderData.refundedAt).toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          )}

          {/* Kargo Takip Bilgileri */}
          {orderData.trackingNumber && (
            <div className="order-section tracking-section" style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '1.5rem',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>📦 Kargo Takip Bilgileri</h3>
                <button
                  onClick={() => fetchTrackingInfo(orderData.orderNumber, email)}
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
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <p><strong>Takip Numarası:</strong> {orderData.trackingNumber}</p>
                <p><strong>Kargo Firması:</strong> {orderData.carrier || 'DHL'}</p>
                {orderData.shippedAt && (
                  <p><strong>Kargoya Verilme:</strong> {new Date(orderData.shippedAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                )}
              </div>

              {isTrackingLoading ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                  <p>Kargo bilgileri yükleniyor...</p>
                </div>
              ) : trackingData ? (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      backgroundColor: trackingData.status === 'DELIVERED' ? '#d4edda' :
                                      trackingData.status === 'IN_TRANSIT' ? '#d1ecf1' :
                                      trackingData.status === 'EXCEPTION' ? '#f8d7da' : '#fff3cd',
                      color: trackingData.status === 'DELIVERED' ? '#155724' :
                             trackingData.status === 'IN_TRANSIT' ? '#0c5460' :
                             trackingData.status === 'EXCEPTION' ? '#721c24' : '#856404'
                    }}>
                      {getTrackingStatusText(trackingData.status)}
                    </div>
                    {trackingData.statusDescription && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                        {trackingData.statusDescription}
                      </p>
                    )}
                  </div>

                  {trackingData.events && trackingData.events.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Kargo Hareketleri</h4>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {trackingData.events.slice(0, 5).map((event, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '0.75rem',
                              marginBottom: '0.5rem',
                              background: 'white',
                              borderRadius: '6px',
                              borderLeft: '4px solid #667eea',
                              fontSize: '0.9rem'
                            }}
                          >
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#333' }}>
                              {formatTrackingDate(event.timestamp)}
                            </div>
                            {event.location && (
                              <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>
                                📍 {event.location}
                              </div>
                            )}
                            {event.description && (
                              <div style={{ color: '#333' }}>{event.description}</div>
                            )}
                          </div>
                        ))}
                        {trackingData.events.length > 5 && (
                          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            +{trackingData.events.length - 5} hareket daha
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <a
                      href={`/kargo-takip?trackingNumber=${orderData.trackingNumber}&orderNumber=${orderData.orderNumber}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.75rem 1.5rem',
                        background: '#667eea',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}
                    >
                      → Detaylı Takip Bilgisi
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                  <p>Kargo takip bilgisi henüz güncellenmedi. "Güncelle" butonuna tıklayarak en güncel bilgileri alabilirsiniz.</p>
                </div>
              )}
            </div>
          )}

          {/* İptal Modal */}
          {showCancelModal && (
            <div className="modal-overlay" onClick={() => !isProcessing && setShowCancelModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Siparişi İptal Et</h3>
                <p>Siparişinizi iptal etmek istediğinizden emin misiniz?</p>
                <div className="form-group">
                  <label>İptal Sebebi</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows="3"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowCancelModal(false)} disabled={isProcessing}>İptal</button>
                  <button onClick={handleCancelOrder} disabled={isProcessing} className="confirm-btn">
                    {isProcessing ? 'İşleniyor...' : 'Onayla'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* İade Modal */}
          {showRefundModal && (
            <div className="modal-overlay" onClick={() => !isProcessing && setShowRefundModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>İade Talebi Oluştur</h3>
                <p>İade talebi oluşturmak istediğinizden emin misiniz?</p>
                <div className="form-group">
                  <label>İade Sebebi</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows="3"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowRefundModal(false)} disabled={isProcessing}>İptal</button>
                  <button onClick={handleRequestRefund} disabled={isProcessing} className="confirm-btn">
                    {isProcessing ? 'İşleniyor...' : 'Onayla'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Bildirim */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' && (
              <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
            <span className="toast-message">{toast.message}</span>
          </div>
          <button 
            className="toast-close" 
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            aria-label="Kapat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderLookup


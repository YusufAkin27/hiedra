import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import SEO from './SEO'
import './Checkout.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Checkout = () => {
  const navigate = useNavigate()
  const cartContext = useCart()
  const { user, accessToken, isAuthenticated } = useAuth()
  const toast = useToast()
  
  const cartItems = cartContext?.cartItems || []
  const getCartTotal = cartContext?.getCartTotal || (() => 0)
  const getCartSubtotal = cartContext?.getCartSubtotal || (() => 0)
  const clearCart = cartContext?.clearCart || (() => {})
  const couponCode = cartContext?.couponCode || null
  const discountAmount = cartContext?.discountAmount || 0
  const cartId = cartContext?.cartId || null
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [userAddresses, setUserAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [selectedInvoiceAddressId, setSelectedInvoiceAddressId] = useState(null)
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [cartExpanded, setCartExpanded] = useState(false)
  const [deliveryAddressExpanded, setDeliveryAddressExpanded] = useState(false)
  const [invoiceAddressExpanded, setInvoiceAddressExpanded] = useState(false)

  // İletişim bilgileri
  const [contactInfo, setContactInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  // Adres bilgileri
  const [addressInfo, setAddressInfo] = useState({
    address: '',
    city: '',
    district: ''
  })

  // Fatura adresi
  const [useSameAddressForInvoice, setUseSameAddressForInvoice] = useState(true)
  const [invoiceAddressInfo, setInvoiceAddressInfo] = useState({
    address: '',
    city: '',
    district: ''
  })

  // Kart bilgileri
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiry: '',
    cvv: ''
  })

  // Sözleşme onayları
  const [agreements, setAgreements] = useState({
    preInformation: false,
    distanceSelling: false
  })
  const [isAcceptingContract, setIsAcceptingContract] = useState(false)
  const [contractAccepted, setContractAccepted] = useState(false)

  // Kullanıcı profil bilgilerini yükle
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadUserProfile()
      loadUserAddresses()
    }
  }, [isAuthenticated, accessToken])

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          const profile = data.data || data
          let firstName = ''
          let lastName = ''
          if (profile.fullName) {
            const nameParts = profile.fullName.trim().split(/\s+/)
            firstName = nameParts[0] || ''
            lastName = nameParts.slice(1).join(' ') || ''
          }
          
          setContactInfo({
            firstName: firstName,
            lastName: lastName,
            email: profile.email || user?.email || '',
            phone: profile.phone || user?.phone || ''
          })
        }
      }
    } catch (error) {
      console.error('Profil bilgileri yüklenirken hata:', error)
    }
  }

  const loadUserAddresses = async () => {
    try {
      setLoadingAddresses(true)
      const response = await fetch(`${API_BASE_URL}/user/addresses`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          const addresses = data.data || []
          setUserAddresses(addresses)
          
          const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0]
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id)
            fillAddressFromSelected(defaultAddress)
            if (useSameAddressForInvoice) {
              setSelectedInvoiceAddressId(defaultAddress.id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Adresler yüklenirken hata:', error)
    } finally {
      setLoadingAddresses(false)
    }
  }

  const fillAddressFromSelected = (address) => {
    if (address) {
      setAddressInfo({
        address: address.addressLine,
        city: address.city,
        district: address.district
      })
    }
  }

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId)
    const address = userAddresses.find(addr => addr.id === addressId)
    if (address) {
      fillAddressFromSelected(address)
      if (useSameAddressForInvoice) {
        setSelectedInvoiceAddressId(addressId)
        setInvoiceAddressInfo({
          address: address.addressLine,
          city: address.city,
          district: address.district
        })
      }
    }
  }

  const handleInvoiceAddressSelect = (addressId) => {
    setSelectedInvoiceAddressId(addressId)
    const address = userAddresses.find(addr => addr.id === addressId)
    if (address) {
      setInvoiceAddressInfo({
        address: address.addressLine,
        city: address.city,
        district: address.district
      })
    }
  }

  const getSelectedAddressDisplay = () => {
    if (selectedAddressId) {
      const address = userAddresses.find(addr => addr.id === selectedAddressId)
      if (address) {
        return `${address.fullName} (${address.district}/${address.city})`
      }
    }
    if (addressInfo.address && addressInfo.city && addressInfo.district) {
      return `${addressInfo.district}, ${addressInfo.city}`
    }
    return 'Adres seçiniz'
  }

  const getSelectedInvoiceAddressDisplay = () => {
    if (useSameAddressForInvoice) {
      return getSelectedAddressDisplay()
    }
    if (selectedInvoiceAddressId) {
      const address = userAddresses.find(addr => addr.id === selectedInvoiceAddressId)
      if (address) {
        return `${address.fullName} (${address.district}/${address.city})`
      }
    }
    if (invoiceAddressInfo.address && invoiceAddressInfo.city && invoiceAddressInfo.district) {
      return `${invoiceAddressInfo.district}, ${invoiceAddressInfo.city}`
    }
    return 'Adres seçiniz'
  }

  // Validasyon fonksiyonları
  const validateContactInfo = () => {
    if (!contactInfo.firstName.trim()) {
      toast.warning('Lütfen adınızı giriniz.')
      return false
    }
    if (!contactInfo.lastName.trim()) {
      toast.warning('Lütfen soyadınızı giriniz.')
      return false
    }
    if (!contactInfo.email.trim() || !contactInfo.email.includes('@')) {
      toast.warning('Lütfen geçerli bir e-posta adresi giriniz.')
      return false
    }
    if (!contactInfo.phone.trim() || contactInfo.phone.length < 10) {
      toast.warning('Lütfen geçerli bir telefon numarası giriniz.')
      return false
    }
    return true
  }

  const validateAddress = () => {
    if (!selectedAddressId && (!addressInfo.address.trim() || !addressInfo.city.trim() || !addressInfo.district.trim())) {
      toast.warning('Lütfen teslimat adres bilgilerinizi giriniz.')
      return false
    }
    if (!useSameAddressForInvoice) {
      if (!selectedInvoiceAddressId && (!invoiceAddressInfo.address.trim() || !invoiceAddressInfo.city.trim() || !invoiceAddressInfo.district.trim())) {
        toast.warning('Lütfen fatura adres bilgilerinizi giriniz.')
        return false
      }
    }
    return true
  }

  const validatePayment = () => {
    const cardNumber = cardInfo.cardNumber.replace(/\s/g, '')
    if (!cardNumber || cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
      toast.warning('Lütfen geçerli bir kart numarası giriniz (16 haneli).')
      return false
    }
    if (!cardInfo.expiry || !/^\d{2}\/\d{2}$/.test(cardInfo.expiry)) {
      toast.warning('Lütfen geçerli bir son kullanma tarihi giriniz (MM/YY).')
      return false
    }
    if (!cardInfo.cvv || cardInfo.cvv.length !== 3 || !/^\d+$/.test(cardInfo.cvv)) {
      toast.warning('Lütfen geçerli bir CVV giriniz (3 haneli).')
      return false
    }
    if (!agreements.preInformation) {
      toast.warning('Lütfen ön bilgilendirme koşullarını onaylayınız.')
      return false
    }
    if (!agreements.distanceSelling) {
      toast.warning('Lütfen mesafeli satış sözleşmesini onaylayınız.')
      return false
    }
    if (!contractAccepted) {
      toast.warning('Lütfen sözleşmeyi onaylayınız.')
      return false
    }
    return true
  }

  // Sözleşme onaylama fonksiyonu
  const handleAcceptContract = async (checked) => {
    if (!checked) {
      setAgreements({ preInformation: false, distanceSelling: false })
      setContractAccepted(false)
      return
    }

    setIsAcceptingContract(true)
    setAgreements({ preInformation: true, distanceSelling: true })

    try {
      const guestUserId = localStorage.getItem('guestUserId')
      const headers = {
        'Content-Type': 'application/json',
      }
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      // Mesafeli Satış Sözleşmesi (SATIS) için onaylama
      const url = `${API_BASE_URL}/contracts/type/SATIS/accept${guestUserId ? `?guestUserId=${encodeURIComponent(guestUserId)}` : ''}`
      const response = await fetch(url, {
        method: 'POST',
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          setContractAccepted(true)
          toast.success('Sözleşme başarıyla onaylandı!')
        } else {
          const errorMsg = data.message || 'Sözleşme onaylanamadı'
          toast.error(errorMsg)
          setAgreements({ preInformation: false, distanceSelling: false })
          setContractAccepted(false)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.message || 'Sözleşme onaylanamadı'
        toast.error(errorMsg)
        setAgreements({ preInformation: false, distanceSelling: false })
        setContractAccepted(false)
    }
    } catch (err) {
      console.error('Sözleşme onaylanırken hata:', err)
      toast.error('Sözleşme onaylanırken bir hata oluştu')
      setAgreements({ preInformation: false, distanceSelling: false })
      setContractAccepted(false)
    } finally {
      setIsAcceptingContract(false)
  }
  }

  // Ödeme işlemi
  const processPayment = async () => {
    try {
      const cleanCardNumber = cardInfo.cardNumber.replace(/\s/g, '')
      const cardExpiry = cardInfo.expiry
      
      const orderDetails = cartItems.map(item => {
        const itemPrice = (item.customizations?.calculatedPrice || item.price) * item.quantity
        const width = item.customizations?.en || 100
        const height = item.customizations?.boy || 200
        
        return {
          productId: item.id,
          productName: item.name,
          width: width,
          height: height,
          pleatType: item.customizations?.pileSikligi === 'pilesiz' ? '1x1' : (item.customizations?.pileSikligi || '1x1'),
          quantity: item.quantity,
          price: itemPrice
        }
      })
      
      let guestUserId = null
      if (!isAuthenticated || !accessToken) {
        guestUserId = localStorage.getItem('guestUserId')
      }

      const paymentRequest = {
        amount: 0,
        cardNumber: cleanCardNumber,
        cardExpiry: cardExpiry,
        cardCvc: cardInfo.cvv,
        firstName: contactInfo.firstName,
        lastName: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone.replace(/\D/g, ''),
        address: (isAuthenticated && selectedAddressId) ? null : addressInfo.address,
        city: (isAuthenticated && selectedAddressId) ? null : addressInfo.city,
        district: (isAuthenticated && selectedAddressId) ? null : addressInfo.district,
        addressDetail: null,
        invoiceAddress: useSameAddressForInvoice ? null : ((isAuthenticated && selectedInvoiceAddressId) ? null : invoiceAddressInfo.address),
        invoiceCity: useSameAddressForInvoice ? null : ((isAuthenticated && selectedInvoiceAddressId) ? null : invoiceAddressInfo.city),
        invoiceDistrict: useSameAddressForInvoice ? null : ((isAuthenticated && selectedInvoiceAddressId) ? null : invoiceAddressInfo.district),
        orderDetails: orderDetails,
        frontendCallbackUrl: window.location.origin + '/payment/3d-callback',
        addressId: (isAuthenticated && selectedAddressId) ? selectedAddressId : null,
        invoiceAddressId: (isAuthenticated && !useSameAddressForInvoice && selectedInvoiceAddressId) ? selectedInvoiceAddressId : null,
        userId: (isAuthenticated && user?.id) ? user.id : null,
        cartId: cartId || null,
        guestUserId: guestUserId,
        couponCode: couponCode || null
      }

      const response = await fetch(`${API_BASE_URL}/payment/card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest)
      })

      const contentType = response.headers.get('content-type') || ''
      const responseText = await response.text()
      
      let data
      try {
        if (!responseText || responseText.trim() === '') {
          return { success: false, message: 'Sunucudan yanıt alınamadı.' }
        }
        data = JSON.parse(responseText)
      } catch (parseError) {
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          sessionStorage.setItem('checkoutData', JSON.stringify({
            contactInfo,
            addressInfo,
            invoiceAddressInfo,
            cardInfo,
            items: cartItems,
            totalPrice: getCartTotal()
          }))
          sessionStorage.setItem('frontendUrl', window.location.origin)
          document.open()
          document.write(responseText)
          document.close()
          return { success: false, message: '3D Secure yönlendirmesi yapılıyor...', redirecting: true }
        }
        return { success: false, message: `Sunucu yanıtı işlenemedi: ${parseError.message}` }
      }

      if (response.ok) {
        const isSuccess = data.isSuccess === true || data.success === true
        
        if (isSuccess && data.data && (typeof data.data === 'string') && 
            (data.data.trim().startsWith('<!DOCTYPE') || data.data.trim().startsWith('<html') || data.data.includes('<form'))) {
          sessionStorage.setItem('checkoutData', JSON.stringify({
            contactInfo,
            addressInfo,
            invoiceAddressInfo,
            cardInfo,
            items: cartItems,
            totalPrice: getCartTotal()
          }))
          sessionStorage.setItem('frontendUrl', window.location.origin)
          document.open()
          document.write(data.data)
          document.close()
          return { success: false, message: '3D Secure yönlendirmesi yapılıyor...', redirecting: true }
        }
        
        if (data.requires3D === true && data.redirectUrl) {
          sessionStorage.setItem('checkoutData', JSON.stringify({
            contactInfo,
            addressInfo,
            invoiceAddressInfo,
            cardInfo,
            items: cartItems,
            totalPrice: getCartTotal()
          }))
          sessionStorage.setItem('frontendUrl', window.location.origin)
          window.location.href = data.redirectUrl
          return { success: false, message: '3D Secure yönlendirmesi yapılıyor...', redirecting: true }
        }
        
        return {
          success: isSuccess,
          message: data.message || (isSuccess ? 'Ödeme başarıyla tamamlandı' : 'Ödeme işlemi başarısız oldu')
        }
      } else {
        return {
          success: false,
          message: data.message || `Hata: ${response.status} ${response.statusText}`
        }
      }
    } catch (err) {
      console.error('Ödeme API hatası:', err)
      return {
        success: false,
        message: err.message || 'Ödeme işlemi sırasında bir hata oluştu.'
      }
    }
  }

  const handleCompleteOrder = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (isProcessing) {
      return
    }
    
    if (!validateContactInfo() || !validateAddress() || !validatePayment()) {
      return
    }
    
    setIsProcessing(true)
    
    try {
      const paymentResult = await processPayment()
      
      if (paymentResult.redirecting) {
        return
      }

      if (paymentResult.success) {
        const orderData = {
          orderNumber: 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          contactInfo: contactInfo,
          addressInfo: addressInfo,
          invoiceAddressInfo: invoiceAddressInfo,
          cardInfo: cardInfo,
          items: cartItems,
          totalPrice: getCartTotal()
        }

        clearCart()
        sessionStorage.removeItem('checkoutData')
        navigate('/siparis-onayi', { state: { orderData } })
      } else {
        setIsProcessing(false)
        navigate('/odeme-basarisiz', { state: { errorMessage: paymentResult.message } })
      }
    } catch (error) {
      console.error('Ödeme işlemi hatası:', error)
      setIsProcessing(false)
      navigate('/odeme-basarisiz')
    }
  }

  const getCardType = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, '')
    if (!number) return null
    if (/^4/.test(number)) return 'visa'
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'mastercard'
    if (/^9792/.test(number)) return 'troy'
    return null
  }

  const formatCardNumber = (value) => {
    const numbers = value.replace(/\s/g, '')
    const formatted = numbers.match(/.{1,4}/g)?.join(' ') || numbers
    return formatted.slice(0, 19)
  }

  const formatExpiry = (value) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length === 0) return ''
    if (numbers.length <= 2) return numbers
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`
  }

  const detectedCardType = getCardType(cardInfo.cardNumber)

  if (cartItems.length === 0) {
    return (
      <div className="checkout-container-mobile">
        <div className="empty-checkout">
          <h2>Sepetiniz boş</h2>
          <p>Ödeme yapmak için sepetinizde ürün bulunmalıdır.</p>
          <button onClick={() => navigate('/')} className="shop-btn">
            Alışverişe Başla
          </button>
        </div>
      </div>
    )
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CheckoutPage',
    name: 'Ödeme - Hiedra Perde',
    description: 'Hiedra Perde siparişinizi tamamlayın. Güvenli ödeme sistemi ile alışveriş yapın.',
    url: window.location.href
  }

  return (
    <div className="checkout-container-mobile">
      <SEO
        title="Ödeme - Perde Satış Ödeme Sayfası"
        description="Perde satış ödeme sayfası. Güvenli ödeme sistemi ile siparişinizi tamamlayın. Hiedra Perde ile güvenli alışveriş."
        keywords="perde ödeme, online perde ödeme, perde satış ödeme, güvenli ödeme, perde sipariş ödeme"
        url="/checkout"
        structuredData={structuredData}
        noindex={true}
      />
      
      <header className="checkout-header-mobile">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1>Güvenli Ödeme</h1>
        <div className="ssl-secured">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>SSL secured</span>
          </div>
      </header>

      <div className="checkout-content-mobile">
        <form onSubmit={handleCompleteOrder} className="checkout-form-mobile">
          {/* Sepetimdeki Ürünler */}
          <div className="cart-summary-section">
            <div className="cart-summary-header" onClick={() => setCartExpanded(!cartExpanded)}>
              <h2>Sepetimdeki Ürünler ({cartItems.length})</h2>
              <svg 
                className={`expand-icon ${cartExpanded ? 'expanded' : ''}`}
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
          </div>
            {cartExpanded && (
              <div className="cart-summary-items">
                {cartItems.map((item) => (
                  <div key={item.itemKey || item.id} className="cart-summary-item">
                    <Link to={`/product/${item.id}`} className="cart-summary-item-image">
                      <img src={item.image} alt={item.name} />
                    </Link>
                    <div className="cart-summary-item-info">
                      <Link to={`/product/${item.id}`} className="item-name">{item.name}</Link>
                      {item.customizations && (
                        <div className="item-specs">
                          <span>En: {item.customizations.en} cm</span>
                          <span>Boy: {item.customizations.boy} cm</span>
                          <span>Pile: {item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}</span>
        </div>
                      )}
                      <div className="item-meta">
                        <span className="item-quantity">{item.quantity}x</span>
                        <span className="item-price">{((item.customizations?.calculatedPrice || item.price) * item.quantity).toFixed(2)} ₺</span>
                      </div>
                    </div>
                  </div>
                ))}
                {discountAmount > 0 && (
                  <div className="cart-savings">
                    <span>Kazancın: {discountAmount.toFixed(2)} ₺</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Teslimat Adresi */}
          <section className="address-section">
            <div className="address-section-header">
              <h2>Teslimat Adresi</h2>
              <button type="button" className="edit-address-btn" onClick={() => navigate('/adresler')}>
                Ekle / Düzenle
              </button>
                  </div>
                  
            {/* İletişim Bilgileri */}
            <div className="contact-info-fields">
                  <div className="form-row">
                    <div className="form-group">
                  <label htmlFor="firstName">Ad <span className="required">*</span></label>
                      <input
                        type="text"
                        id="firstName"
                        value={contactInfo.firstName}
                        onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                        placeholder="Adınız"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                  <label htmlFor="lastName">Soyad <span className="required">*</span></label>
                      <input
                        type="text"
                        id="lastName"
                        value={contactInfo.lastName}
                        onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                        placeholder="Soyadınız"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                <label htmlFor="email">E-posta <span className="required">*</span></label>
                    <input
                      type="email"
                      id="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      placeholder="ornek@email.com"
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                <label htmlFor="phone">Telefon <span className="required">*</span></label>
                    <input
                      type="tel"
                      id="phone"
                      value={contactInfo.phone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '')
                    if (value.startsWith('90') && value.length > 10) value = value.substring(2)
                    if (value.startsWith('0')) value = value.substring(1)
                        if (value.length <= 10) {
                          setContactInfo({ ...contactInfo, phone: value })
                        }
                      }}
                      placeholder="5336360079"
                      maxLength={10}
                      className="form-input"
                      required
                    />
                  </div>
            </div>

            {/* Adres Seçimi */}
            <div className="address-select-wrapper">
              {isAuthenticated && userAddresses.length > 0 ? (
                <div className="address-dropdown">
                  <div className="address-display" onClick={() => setDeliveryAddressExpanded(!deliveryAddressExpanded)}>
                    <span>{getSelectedAddressDisplay()}</span>
                    <svg 
                      className={`dropdown-icon ${deliveryAddressExpanded ? 'expanded' : ''}`}
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                        </div>
                  {deliveryAddressExpanded && (
                    <div className="address-dropdown-list">
                          {userAddresses.map((address) => (
                            <div
                              key={address.id}
                          className={`address-dropdown-item ${selectedAddressId === address.id ? 'selected' : ''}`}
                          onClick={() => {
                            handleAddressSelect(address.id)
                            setDeliveryAddressExpanded(false)
                          }}
                            >
                          <div className="address-dropdown-content">
                            <div className="address-dropdown-name">{address.fullName}</div>
                            <div className="address-dropdown-line">{address.addressLine}</div>
                            <div className="address-dropdown-location">{address.district}, {address.city}</div>
                                </div>
                          {address.isDefault && <span className="default-badge-small">Varsayılan</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
              ) : (
                <div className="address-manual-fields">
                  <div className="form-group">
                    <label htmlFor="address">Adres <span className="required">*</span></label>
                    <input
                      type="text"
                      id="address"
                      value={addressInfo.address}
                      onChange={(e) => setAddressInfo({ ...addressInfo, address: e.target.value })}
                      placeholder="Mahalle, Sokak, Cadde"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">Şehir <span className="required">*</span></label>
                      <input
                        type="text"
                        id="city"
                        value={addressInfo.city}
                        onChange={(e) => setAddressInfo({ ...addressInfo, city: e.target.value })}
                        placeholder="Şehir adı"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="district">İlçe <span className="required">*</span></label>
                      <input
                        type="text"
                        id="district"
                        value={addressInfo.district}
                        onChange={(e) => setAddressInfo({ ...addressInfo, district: e.target.value })}
                        placeholder="İlçe adı"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            </section>

            {/* Fatura Adresi */}
          <section className="address-section">
            <div className="address-section-header">
              <h2>Fatura Adresi</h2>
              <button type="button" className="edit-address-btn" onClick={() => navigate('/adresler')}>
                Ekle / Düzenle
              </button>
            </div>
              
              <div className="form-group">
              <label className="same-address-checkbox">
                  <input
                    type="checkbox"
                    checked={useSameAddressForInvoice}
                    onChange={(e) => {
                      setUseSameAddressForInvoice(e.target.checked)
                      if (e.target.checked) {
                      setSelectedInvoiceAddressId(selectedAddressId)
                        setInvoiceAddressInfo({
                        address: addressInfo.address,
                        city: addressInfo.city,
                        district: addressInfo.district
                      })
                    } else {
                      setSelectedInvoiceAddressId(null)
                      setInvoiceAddressInfo({ address: '', city: '', district: '' })
                      }
                    }}
                />
                <span className="checkbox-custom"></span>
                <span>Faturamı aynı adrese gönder.</span>
                </label>
              </div>

              {!useSameAddressForInvoice && (
              <div className="address-select-wrapper">
                {isAuthenticated && userAddresses.length > 0 ? (
                  <div className="address-dropdown">
                    <div className="address-display" onClick={() => setInvoiceAddressExpanded(!invoiceAddressExpanded)}>
                      <span>{getSelectedInvoiceAddressDisplay()}</span>
                      <svg 
                        className={`dropdown-icon ${invoiceAddressExpanded ? 'expanded' : ''}`}
                        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    {invoiceAddressExpanded && (
                      <div className="address-dropdown-list">
                        {userAddresses.map((address) => (
                          <div
                            key={address.id}
                            className={`address-dropdown-item ${selectedInvoiceAddressId === address.id ? 'selected' : ''}`}
                            onClick={() => {
                              handleInvoiceAddressSelect(address.id)
                              setInvoiceAddressExpanded(false)
                            }}
                          >
                            <div className="address-dropdown-content">
                              <div className="address-dropdown-name">{address.fullName}</div>
                              <div className="address-dropdown-line">{address.addressLine}</div>
                              <div className="address-dropdown-location">{address.district}, {address.city}</div>
                            </div>
                            {address.isDefault && <span className="default-badge-small">Varsayılan</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="address-manual-fields">
                  <div className="form-group">
                      <label htmlFor="invoiceAddress">Fatura Adresi <span className="required">*</span></label>
                    <input
                      type="text"
                      id="invoiceAddress"
                      value={invoiceAddressInfo.address}
                      onChange={(e) => setInvoiceAddressInfo({ ...invoiceAddressInfo, address: e.target.value })}
                      placeholder="Mahalle, Sokak, Cadde"
                        className="form-input"
                      required={!useSameAddressForInvoice}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="invoiceCity">Şehir <span className="required">*</span></label>
                      <input
                        type="text"
                        id="invoiceCity"
                        value={invoiceAddressInfo.city}
                        onChange={(e) => setInvoiceAddressInfo({ ...invoiceAddressInfo, city: e.target.value })}
                        placeholder="Şehir adı"
                          className="form-input"
                          required={!useSameAddressForInvoice}
                      />
                    </div>
                    <div className="form-group">
                        <label htmlFor="invoiceDistrict">İlçe <span className="required">*</span></label>
                      <input
                        type="text"
                        id="invoiceDistrict"
                        value={invoiceAddressInfo.district}
                        onChange={(e) => setInvoiceAddressInfo({ ...invoiceAddressInfo, district: e.target.value })}
                        placeholder="İlçe adı"
                          className="form-input"
                          required={!useSameAddressForInvoice}
                      />
                    </div>
                  </div>
                  </div>
                )}
              </div>
              )}
            </section>

          {/* Ödeme Seçenekleri */}
          <section className="payment-options-section">
            <h2>Ödeme Seçenekleri</h2>
            <div className="payment-option">
              <label className="payment-option-radio">
                <input type="radio" name="paymentMethod" value="card" defaultChecked />
                <span className="radio-custom"></span>
                <span className="payment-option-label">Banka & Kredi Kartı ile Öde</span>
              </label>
                </div>
          </section>

          {/* Kart Bilgileri */}
          <section className="card-info-section">
            <div className="card-info-header">
              <h2>Kart Bilgileri</h2>
              {isAuthenticated && (
                <button type="button" className="saved-card-btn">
                  Kayıtlı Kartımla Öde
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                </button>
              )}
                  </div>

                  <div className="form-group">
              <label htmlFor="cardNumber">Kart Numarası <span className="required">*</span></label>
                    <div className="card-input-wrapper">
                      <input
                        type="tel"
                        id="cardNumber"
                        value={cardInfo.cardNumber}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value)
                          setCardInfo({ ...cardInfo, cardNumber: formatted })
                        }}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        className="form-input card-number-input"
                        required
                      />
                      {detectedCardType && (
                        <div className="detected-card-icon">
                    {detectedCardType === 'visa' && <img src="/images/visa.png" alt="Visa" className="detected-card-logo" />}
                    {detectedCardType === 'mastercard' && <img src="/images/master.png" alt="Mastercard" className="detected-card-logo" />}
                    {detectedCardType === 'troy' && <img src="/images/troy.png" alt="Troy" className="detected-card-logo" />}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                <label htmlFor="expiry">Son Kullanma Tarihi <span className="required">*</span></label>
                      <input
                        type="text"
                        id="expiry"
                        value={cardInfo.expiry}
                        onChange={(e) => {
                          const formatted = formatExpiry(e.target.value)
                          setCardInfo({ ...cardInfo, expiry: formatted })
                        }}
                        placeholder="MM/YY"
                        maxLength="5"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                <label htmlFor="cvv">CVV <span className="required">*</span></label>
                      <input
                        type="tel"
                        id="cvv"
                        value={cardInfo.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '')
                          if (value.length <= 3) {
                            setCardInfo({ ...cardInfo, cvv: value })
                          }
                        }}
                        placeholder="123"
                        maxLength="3"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

            {/* Sözleşme Onayları */}
            <div className="agreements-section">
              <div className="agreement-item">
                <label className="agreement-checkbox">
                  <input
                    type="checkbox"
                    checked={agreements.preInformation && agreements.distanceSelling}
                    onChange={(e) => handleAcceptContract(e.target.checked)}
                    disabled={isAcceptingContract}
                    required
                  />
                  <span className="checkbox-custom"></span>
                  <span className="agreement-text">
                    <Link to="/mesafeli-satis-sozlesmesi" target="_blank" className="agreement-link">
                      Ön Bilgilendirme Koşulları
                    </Link>
                    {' '}ve{' '}
                    <Link to="/mesafeli-satis-sozlesmesi" target="_blank" className="agreement-link">
                      Mesafeli Satış Sözleşmesi
                    </Link>
                    'ni okudum, onaylıyorum. <span className="required">*</span>
                      </span>
                </label>
                    </div>
            </div>
          </section>
        </form>
                  </div>

      {/* Alt Sabit Bar */}
      <div className="checkout-bottom-bar">
        <div className="checkout-total-info">
          <div className="checkout-total-amount">{getCartTotal().toFixed(2)} ₺</div>
          <div className="checkout-shipping-text">Kargo Bedava</div>
        </div>
                    <button 
                      type="button"
          onClick={handleCompleteOrder}
          className="checkout-confirm-btn"
                      disabled={isProcessing}
                    >
          {isProcessing ? 'İşleniyor...' : 'Onayla ve Bitir'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
                    </button>
      </div>
    </div>
  )
}

export default Checkout

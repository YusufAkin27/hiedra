import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import SEO from './SEO'
import './Checkout.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Checkout = () => {
  const navigate = useNavigate()
  const { cartItems, getCartTotal, getCartSubtotal, clearCart, couponCode, discountAmount, cartId } = useCart()
  const { user, accessToken, isAuthenticated } = useAuth()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userAddresses, setUserAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [useSavedAddress, setUseSavedAddress] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(false)

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
    district: '',
    addressDetail: ''
  })


  // Kart bilgileri
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  })

  const totalSteps = 4 // İletişim, Adres, Ödeme, Özet

  // Kullanıcı giriş yapmışsa profil bilgilerini backend'den çek
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadUserProfile()
    } else {
      // Giriş yapmamış kullanıcı için formu temizle
      setContactInfo({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          // fullName'i firstName ve lastName'e ayır
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
      // Hata durumunda user objesinden al
      if (user) {
        let firstName = ''
        let lastName = ''
        if (user.fullName) {
          const nameParts = user.fullName.trim().split(/\s+/)
          firstName = nameParts[0] || ''
          lastName = nameParts.slice(1).join(' ') || ''
        }
        setContactInfo({
          firstName: firstName,
          lastName: lastName,
          email: user.email || '',
          phone: user.phone || ''
        })
      }
    }
  }


  // Login kullanıcı için adresleri yükle ve otomatik doldur
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      if (currentStep === 2) {
        loadUserAddresses()
      } else if (currentStep === 1) {
        // İlk adımda da adresleri yükle ki varsayılan adres hazır olsun
        loadUserAddresses()
      }
    }
  }, [isAuthenticated, accessToken, currentStep])

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
          
          // Varsayılan adresi seç veya ilk adresi seç
          const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0]
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id)
            setUseSavedAddress(true)
            fillAddressFromSelected(defaultAddress)
            
            // Eğer adres bilgileri boşsa ve varsayılan adres varsa, otomatik doldur
            if (!addressInfo.address && !addressInfo.city && !addressInfo.district) {
              fillAddressFromSelected(defaultAddress)
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
        district: address.district,
        addressDetail: address.addressDetail || ''
      })
    }
  }

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId)
    const address = userAddresses.find(addr => addr.id === addressId)
    if (address) {
      fillAddressFromSelected(address)
    }
  }

  // İletişim bilgileri validasyonu
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

  // Adres bilgileri validasyonu
  const validateAddressInfo = () => {
    if (!addressInfo.address.trim()) {
      toast.warning('Lütfen adres bilgilerinizi giriniz.')
      return false
    }
    if (!addressInfo.city.trim()) {
      toast.warning('Lütfen şehir bilgisini giriniz.')
      return false
    }
    if (!addressInfo.district.trim()) {
      toast.warning('Lütfen ilçe bilgisini giriniz.')
      return false
    }
 
    return true
  }

  // Kart bilgileri validasyonu
  const validateCardInfo = () => {
    const cardNumber = cardInfo.cardNumber.replace(/\s/g, '')
    if (!cardNumber || cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
      toast.warning('Lütfen geçerli bir kart numarası giriniz (16 haneli).')
      return false
    }
    if (!cardInfo.cardName.trim()) {
      toast.warning('Lütfen kart üzerindeki ismi giriniz.')
      return false
    }
    if (!cardInfo.expiryMonth || !cardInfo.expiryYear) {
      toast.warning('Lütfen kart son kullanma tarihini seçiniz.')
      return false
    }
    if (!cardInfo.cvv || cardInfo.cvv.length !== 3 || !/^\d+$/.test(cardInfo.cvv)) {
      toast.warning('Lütfen geçerli bir CVV giriniz (3 haneli).')
      return false
    }
    return true
  }

  // Sonraki adıma geç
  const handleNext = () => {
    if (currentStep === 1) {
      // İlk adım: İletişim Bilgileri
      if (validateContactInfo()) {
        setCurrentStep(2)
      }
    } else if (currentStep === 2) {
      // İkinci adım: Adres
      if (validateAddressInfo()) {
        setCurrentStep(3)
      }
    } else if (currentStep === 3) {
      // Üçüncü adım: Ödeme
      if (validateCardInfo()) {
        setCurrentStep(4)
      }
    }
  }

  // Bilgileri düzenleme için ilgili adıma git
  const handleEditContact = () => {
    setCurrentStep(1)
  }

  const handleEditAddress = () => {
    setCurrentStep(2)
  }

  const handleEditPayment = () => {
    setCurrentStep(3)
  }

  // Önceki adıma dön
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Sipariş numarası oluştur
  const generateOrderNumber = () => {
    return 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  }


  const processPayment = async () => {
    try {
      // Kart numarasından boşlukları kaldır
      const cleanCardNumber = cardInfo.cardNumber.replace(/\s/g, '')
      
      // Son kullanma tarihini MM/YY formatına çevir
      const cardExpiry = `${cardInfo.expiryMonth}/${cardInfo.expiryYear}`
      
      // Sipariş detaylarını hazırla
      // NOT: Price gönderiliyor ama backend'de tekrar hesaplanıp doğrulanacak (güvenlik için)
      const orderDetails = cartItems.map(item => {
        // Her ürün için toplam fiyatı hesapla
        const itemPrice = (item.customizations?.calculatedPrice || item.price) * item.quantity
        
        // Width ve height için varsayılan değerler (backend validation için)
        const width = item.customizations?.en || 100 // Varsayılan 100 cm
        const height = item.customizations?.boy || 200 // Varsayılan 200 cm
        
        return {
          productId: item.id, // Backend'in gerçek fiyatları bulması için ürün ID'si
          productName: item.name, // Sadece gösterim amaçlı
          width: width,
          height: height,
          pleatType: item.customizations?.pileSikligi === 'pilesiz' ? '1x1' : (item.customizations?.pileSikligi || '1x1'),
          quantity: item.quantity,
          price: itemPrice // Backend'de tekrar hesaplanıp doğrulanacak
        }
      })
      
      // PaymentRequest objesi oluştur
      // Amount göndermiyoruz veya 0 gönderiyoruz - Backend hesaplasın
      let guestUserId = null
      if (!isAuthenticated || !accessToken) {
        guestUserId = localStorage.getItem('guestUserId')
      }

      const paymentRequest = {
        amount: 0, // Backend kendi hesaplamalı - Güvenlik için frontend'den fiyat göndermiyoruz
        cardNumber: cleanCardNumber,
        cardExpiry: cardExpiry,
        cardCvc: cardInfo.cvv,
        firstName: contactInfo.firstName,
        lastName: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone.replace(/\D/g, ''), // Sadece rakamlar
        address: addressInfo.address,
        city: addressInfo.city,
        district: addressInfo.district,
        addressDetail: addressInfo.addressDetail || null,
        orderDetails: orderDetails, // Backend bu detaylardan fiyatları hesaplayacak
        frontendCallbackUrl: window.location.origin + '/payment/3d-callback', // Frontend callback URL'i
        // Login kullanıcı için adres bilgileri
        addressId: (isAuthenticated && useSavedAddress && selectedAddressId) ? selectedAddressId : null,
        userId: (isAuthenticated && user?.id) ? user.id : null,
        // Sepet bilgileri (kupon bilgisini almak için)
        cartId: cartId || null,
        guestUserId: guestUserId,
        // Kupon bilgisi (sepetten alınacak ama frontend'den de gönderilebilir)
        couponCode: couponCode || null
      }

      console.log('Ödeme isteği gönderiliyor (GÜVENLİK: Fiyatlar backend\'de hesaplanacak):', paymentRequest)
      console.log('OrderDetails (price gönderilmedi, backend hesaplayacak):', orderDetails)

      const response = await fetch(`${API_BASE_URL}/payment/card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest)
      })

      // Response içeriğini kontrol et
      const contentType = response.headers.get('content-type') || ''
      const responseText = await response.text()
      
      // JSON response parse et
      let data
      try {
        if (!responseText || responseText.trim() === '') {
          return {
            success: false,
            message: 'Sunucudan yanıt alınamadı.'
          }
        }
        data = JSON.parse(responseText)
        console.log('Ödeme API Response:', data)
      } catch (parseError) {
        console.error('JSON parse hatası:', parseError)
        // HTML response olabilir (doğrudan HTML gelmişse)
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          console.log('HTML response alındı (JSON parse hatasından sonra), 3D Secure sayfası açılıyor...')
          
          // Checkout bilgilerini session'a kaydet
          sessionStorage.setItem('checkoutData', JSON.stringify({
            contactInfo,
            addressInfo,
            cardInfo,
            items: cartItems,
            totalPrice: getCartTotal()
          }))
          
          // Frontend URL'ini de kaydet (backend'den redirect için)
          sessionStorage.setItem('frontendUrl', window.location.origin)
          
          // HTML'i render et
          document.open()
          document.write(responseText)
          document.close()
          
          return {
            success: false,
            message: '3D Secure yönlendirmesi yapılıyor...',
            redirecting: true
          }
        }
        return {
          success: false,
          message: `Sunucu yanıtı işlenemedi: ${parseError.message}`
        }
      }

      // Response durumunu kontrol et
      if (response.ok) {
        // Backend ResponseMessage formatı: { message: string, success: boolean, data?: string }
        const isSuccess = data.isSuccess === true || data.success === true
        
        // JSON içinde HTML data varsa (3D Secure için)
        if (isSuccess && data.data && (typeof data.data === 'string') && 
            (data.data.trim().startsWith('<!DOCTYPE') || data.data.trim().startsWith('<html') || data.data.includes('<form'))) {
          console.log('3D Secure HTML alındı, sayfa açılıyor...')
          
          // Checkout bilgilerini session'a kaydet
          sessionStorage.setItem('checkoutData', JSON.stringify({
            contactInfo,
            addressInfo,
            cardInfo,
            items: cartItems,
            totalPrice: getCartTotal()
          }))
          
          // Frontend URL'ini de kaydet (backend'den redirect için)
          sessionStorage.setItem('frontendUrl', window.location.origin)
          
          // HTML içeriğini render et (data.data field'ındaki HTML)
          const htmlContent = data.data
          
          // HTML'i doğrudan render et (içindeki script otomatik çalışacak ve form submit edilecek)
          document.open()
          document.write(htmlContent)
          document.close()
          
          return {
            success: false,
            message: '3D Secure yönlendirmesi yapılıyor...',
            redirecting: true
          }
        }
        
        // Eğer 3D Secure yönlendirmesi gerekiyorsa (redirectUrl ile)
        if (data.requires3D === true && data.redirectUrl) {
          // Checkout bilgilerini session'a kaydet
          sessionStorage.setItem('checkoutData', JSON.stringify({
            contactInfo,
            addressInfo,
            cardInfo,
            items: cartItems,
            totalPrice: getCartTotal()
          }))
          
          // Frontend URL'ini de kaydet (backend'den redirect için)
          sessionStorage.setItem('frontendUrl', window.location.origin)
          
          // 3D Secure sayfasına yönlendir
          window.location.href = data.redirectUrl
          return {
            success: false,
            message: '3D Secure yönlendirmesi yapılıyor...',
            redirecting: true
          }
        }
        
        return {
          success: isSuccess,
          message: data.message || (isSuccess ? 'Ödeme başarıyla tamamlandı' : 'Ödeme işlemi başarısız oldu')
        }
      } else {
        // HTTP hata durumu
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

  // Siparişi tamamla
  const handleCompleteOrder = async (e) => {
    // Form submit'i engelle
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Eğer zaten işlem yapılıyorsa, tekrar istek atma
    if (isProcessing) {
      console.log('Ödeme işlemi zaten devam ediyor, yeni istek atılmıyor')
      return
    }
    
    setIsProcessing(true)
    
    // Ödeme işlemini başlat
    try {
      const paymentResult = await processPayment()
      
      if (paymentResult.redirecting) {
        // 3D Secure yönlendirmesi yapılıyor, burada bekle
        // Yönlendirme window.location.href ile yapıldı
        return
      }

      if (paymentResult.success) {
        // Ödeme başarılı (3D Secure gerektirmeyen direkt ödeme)
        const orderData = {
          orderNumber: generateOrderNumber(),
          contactInfo: contactInfo,
          addressInfo: addressInfo,
          cardInfo: cardInfo,
          items: cartItems,
          totalPrice: getCartTotal()
        }

        // Sepeti temizle
        clearCart()

        // Session'ı temizle
        sessionStorage.removeItem('checkoutData')

        // Başarılı ödeme sayfasına yönlendir
        navigate('/siparis-onayi', { state: { orderData } })
      } else {
        // Ödeme başarısız - sepeti koru
        setIsProcessing(false)
        // Başarısız ödeme sayfasına yönlendir
        navigate('/odeme-basarisiz', { state: { errorMessage: paymentResult.message } })
      }
    } catch (error) {
      // Hata durumunda başarısız sayfasına yönlendir
      console.error('Ödeme işlemi hatası:', error)
      setIsProcessing(false)
      navigate('/odeme-basarisiz')
    }
  }

  // Kart tipi algıla
  const getCardType = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, '')
    if (!number) return null
    
    // Visa: 4 ile başlar
    if (/^4/.test(number)) return 'visa'
    // Mastercard: 51-55 veya 2221-2720 ile başlar
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'mastercard'
    // American Express: 34 veya 37 ile başlar
    if (/^3[47]/.test(number)) return 'amex'
    // Discover: 6011, 65, veya 644-649 ile başlar
    if (/^6(?:011|5|4[4-9])/.test(number)) return 'discover'
    // Troy: 9792 ile başlar
    if (/^9792/.test(number)) return 'troy'
    
    return null
  }

  // Kart numarası formatla (4 haneli gruplar)
  const formatCardNumber = (value) => {
    const numbers = value.replace(/\s/g, '')
    const formatted = numbers.match(/.{1,4}/g)?.join(' ') || numbers
    return formatted.slice(0, 19) // 16 haneli kart + 3 boşluk
  }

  const detectedCardType = getCardType(cardInfo.cardNumber)

  if (cartItems.length === 0) {
    return (
      <div className="checkout-container">
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
    <div className="checkout-container">
      <SEO
        title="Ödeme - Perde Satış Ödeme Sayfası"
        description="Perde satış ödeme sayfası. Güvenli ödeme sistemi ile siparişinizi tamamlayın. Hiedra Perde ile güvenli alışveriş."
        keywords="perde ödeme, online perde ödeme, perde satış ödeme, güvenli ödeme, perde sipariş ödeme"
        url="/checkout"
        structuredData={structuredData}
        noindex={true}
      />
      <header className="checkout-header">
        <h1>Ödeme</h1>
        <div className="checkout-steps">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className={`step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
              <div className="step-number">{step}</div>
              <div className="step-label">
                {step === 1 && 'İletişim'}
                {step === 2 && 'Adres'}
                {step === 3 && 'Ödeme'}
                {step === 4 && 'Özet'}
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="checkout-content">
        <div className="checkout-form-section">
          {/* Adım 1: İletişim Bilgileri */}
          {currentStep === 1 && (
            <section className="checkout-step">
              <h2>İletişim Bilgileri</h2>
              
              {/* Giriş yapmış kullanıcı için bilgilendirme */}
              {isAuthenticated && user && (
                <div style={{ 
                  padding: '1rem', 
                  marginBottom: '1.5rem', 
                  backgroundColor: '#e7f3ff', 
                  borderRadius: '4px',
                  border: '1px solid #b3d9ff',
                  fontSize: '0.9rem',
                  color: '#004085'
                }}>
                  <p style={{ margin: 0 }}>
                    <strong>Bilgi:</strong> İletişim bilgileriniz profilinizden otomatik olarak doldurulmuştur. 
                    İsterseniz değiştirebilirsiniz.
                  </p>
                </div>
              )}
              
              {/* Giriş yapmamış kullanıcı için bilgilendirme */}
              {!isAuthenticated && (
                <div style={{ 
                  padding: '1rem', 
                  marginBottom: '1.5rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <p style={{ margin: 0, color: '#495057' }}>
                    Lütfen iletişim bilgilerinizi giriniz. Tüm alanları doldurmanız gerekmektedir.
                  </p>
                </div>
              )}
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">
                    Ad <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={contactInfo.firstName}
                    onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                    placeholder="Adınız"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">
                    Soyad <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={contactInfo.lastName}
                    onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                    placeholder="Soyadınız"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="email">
                  E-posta <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">
                  Telefon <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={contactInfo.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    if (value.length <= 11) {
                      setContactInfo({ ...contactInfo, phone: value })
                    }
                  }}
                  placeholder="05XX XXX XX XX"
                  autoComplete="tel"
                  required
                />
              </div>
            </section>
          )}

          {/* Adım 2: Adres Bilgileri */}
          {currentStep === 2 && (
            <section className="checkout-step">
              <h2>Adres Bilgileri</h2>
              
              {/* Guest kullanıcı için bilgilendirme */}
              {!isAuthenticated && (
                <div style={{ 
                  padding: '1rem', 
                  marginBottom: '1.5rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <p style={{ margin: 0, color: '#495057' }}>
                    Lütfen teslimat adresinizi giriniz. Tüm alanları doldurmanız gerekmektedir.
                  </p>
                </div>
              )}
              
              {/* Giriş yapmış kullanıcı için bilgilendirme */}
              {isAuthenticated && userAddresses.length > 0 && (
                <div style={{ 
                  padding: '1rem', 
                  marginBottom: '1.5rem', 
                  backgroundColor: '#e7f3ff', 
                  borderRadius: '4px',
                  border: '1px solid #b3d9ff',
                  fontSize: '0.9rem',
                  color: '#004085'
                }}>
                  <p style={{ margin: 0 }}>
                    <strong>Bilgi:</strong> Varsayılan adresiniz otomatik olarak seçilmiştir. 
                    Kayıtlı adreslerinizden birini seçebilir veya yeni adres girebilirsiniz.
                  </p>
                </div>
              )}
              
              {/* Login kullanıcı için kayıtlı adresler */}
              {isAuthenticated && userAddresses.length > 0 && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={useSavedAddress}
                      onChange={(e) => {
                        setUseSavedAddress(e.target.checked)
                        if (e.target.checked && selectedAddressId) {
                          const address = userAddresses.find(addr => addr.id === selectedAddressId)
                          if (address) {
                            fillAddressFromSelected(address)
                          }
                        } else if (!e.target.checked) {
                          // Yeni adres girmek istiyor, formu temizle
                          setAddressInfo({
                            address: '',
                            city: '',
                            district: '',
                            addressDetail: ''
                          })
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Kayıtlı adreslerimden seç
                  </label>
                  
                  {useSavedAddress && (
                    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                      {loadingAddresses ? (
                        <p>Adresler yükleniyor...</p>
                      ) : (
                        <div>
                          {userAddresses.map((address) => (
                            <div
                              key={address.id}
                              style={{
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                                border: selectedAddressId === address.id ? '2px solid #007bff' : '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: selectedAddressId === address.id ? '#f0f8ff' : '#fff'
                              }}
                              onClick={() => handleAddressSelect(address.id)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                    {address.fullName}
                                    {address.isDefault && (
                                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#28a745' }}>
                                        (Varsayılan)
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                    {address.addressLine}
                                    {address.addressDetail && `, ${address.addressDetail}`}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                    {address.district}, {address.city}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                    {address.phone}
                                  </div>
                                </div>
                                <input
                                  type="radio"
                                  name="selectedAddress"
                                  checked={selectedAddressId === address.id}
                                  onChange={() => handleAddressSelect(address.id)}
                                  style={{ marginLeft: '1rem' }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(!isAuthenticated || !useSavedAddress) && (
                <>
                  {isAuthenticated && !useSavedAddress && (
                    <div style={{ 
                      padding: '0.75rem', 
                      marginBottom: '1rem', 
                      backgroundColor: '#fff3cd', 
                      borderRadius: '4px',
                      border: '1px solid #ffc107',
                      fontSize: '0.9rem',
                      color: '#856404'
                    }}>
                      Yeni adres bilgilerinizi giriniz.
                    </div>
                  )}
                  <div className="form-group">
                <label htmlFor="address">
                  Adres <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={addressInfo.address}
                  onChange={(e) => setAddressInfo({ ...addressInfo, address: e.target.value })}
                  placeholder="Mahalle, Sokak, Cadde"
                  autoComplete="street-address"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="addressDetail">Adres Detayı (Opsiyonel)</label>
                <textarea
                  id="addressDetail"
                  value={addressInfo.addressDetail}
                  onChange={(e) => setAddressInfo({ ...addressInfo, addressDetail: e.target.value })}
                  placeholder="Daire no, kat, bina adı vb."
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">
                    Şehir <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={addressInfo.city}
                    onChange={(e) => setAddressInfo({ ...addressInfo, city: e.target.value })}
                    required
                    placeholder="Şehir adı"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="district">
                    İlçe <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="district"
                    name="district"
                    value={addressInfo.district}
                    onChange={(e) => setAddressInfo({ ...addressInfo, district: e.target.value })}
                    required
                    placeholder="İlçe adı"
                  />
                </div>
              </div>

                </>
              )}
            </section>
          )}

          {/* Adım 3: Kart Bilgileri */}
          {currentStep === 3 && (
            <section className="checkout-step">
              <h2>Ödeme Bilgileri</h2>
              <p className="step-description">Güvenli ödeme için kart bilgilerinizi giriniz</p>
              
              {/* Desteklenen Kartlar */}
              <div className="supported-cards">
                <div className="card-icons">
                  <span className={`card-icon ${detectedCardType === 'visa' ? 'active' : ''}`} title="Visa">
                    <img src="/images/visa.png" alt="Visa" className="card-logo-img" />
                  </span>
                  <span className={`card-icon ${detectedCardType === 'mastercard' ? 'active' : ''}`} title="Mastercard">
                    <img src="/images/master.png" alt="Mastercard" className="card-logo-img" />
                  </span>
                  <span className={`card-icon ${detectedCardType === 'troy' ? 'active' : ''}`} title="Troy">
                    <img src="/images/troy.png" alt="Troy" className="card-logo-img" />
                  </span>
                </div>
              </div>

              <form autoComplete="on">
                <div className="form-group">
                  <label htmlFor="cardNumber">
                    Kart Numarası <span className="required">*</span>
                  </label>
                  <div className="card-input-wrapper">
                    <input
                      type="tel"
                      id="cardNumber"
                      name="cardNumber"
                      value={cardInfo.cardNumber}
                      onChange={(e) => {
                        const formatted = formatCardNumber(e.target.value)
                        setCardInfo({ ...cardInfo, cardNumber: formatted })
                      }}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      autoComplete="cc-number"
                      inputMode="numeric"
                      pattern="[0-9\s]{13,19}"
                      required
                    />
                    {detectedCardType && (
                      <div className="detected-card-icon">
                        {detectedCardType === 'visa' && (
                          <img src="/images/visa.png" alt="Visa" className="detected-card-logo" />
                        )}
                        {detectedCardType === 'mastercard' && (
                          <img src="/images/master.png" alt="Mastercard" className="detected-card-logo" />
                        )}
                        {detectedCardType === 'troy' && (
                          <img src="/images/troy.png" alt="Troy" className="detected-card-logo" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="cardName">
                    Kart Üzerindeki İsim <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="cardName"
                    name="cardName"
                    value={cardInfo.cardName}
                    onChange={(e) => setCardInfo({ ...cardInfo, cardName: e.target.value.toUpperCase() })}
                    placeholder="AD SOYAD"
                    autoComplete="cc-name"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryMonth">
                      Son Kullanma Tarihi <span className="required">*</span>
                    </label>
                    <div className="expiry-inputs">
                      <select
                        id="expiryMonth"
                        name="expiryMonth"
                        value={cardInfo.expiryMonth}
                        onChange={(e) => setCardInfo({ ...cardInfo, expiryMonth: e.target.value })}
                        autoComplete="cc-exp-month"
                        required
                      >
                        <option value="">Ay</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <option key={month} value={String(month).padStart(2, '0')}>
                            {String(month).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select
                        id="expiryYear"
                        name="expiryYear"
                        value={cardInfo.expiryYear}
                        onChange={(e) => setCardInfo({ ...cardInfo, expiryYear: e.target.value })}
                        autoComplete="cc-exp-year"
                        required
                      >
                        <option value="">Yıl</option>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                          <option key={year} value={String(year).slice(-2)}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="cvv">
                      CVV <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="cvv"
                      name="cvv"
                      value={cardInfo.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 3) {
                          setCardInfo({ ...cardInfo, cvv: value })
                        }
                      }}
                      placeholder="123"
                      maxLength="3"
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      pattern="[0-9]{3}"
                      required
                    />
                  </div>
                </div>
              </form>
            </section>
          )}

          {/* Adım 4: Sipariş Özeti */}
          {currentStep === 4 && (
            <section className="checkout-step">
              <h2>Sipariş Özeti</h2>
              <p className="step-description">Lütfen bilgilerinizi kontrol ediniz</p>
              
              <div className="summary-section">
                <div className="summary-info-card">
                  <div className="card-header-with-edit">
                    <h3>İletişim Bilgileri</h3>
                    <button 
                      type="button" 
                      className="edit-info-btn-card"
                      onClick={handleEditContact}
                      aria-label="İletişim bilgilerini düzenle"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                  <div className="info-details">
                    <p><strong>Ad Soyad:</strong> {contactInfo.firstName} {contactInfo.lastName}</p>
                    <p><strong>E-posta:</strong> {contactInfo.email}</p>
                    <p><strong>Telefon:</strong> {contactInfo.phone}</p>
                  </div>
                </div>

                <div className="summary-info-card">
                  <div className="card-header-with-edit">
                    <h3>Adres Bilgileri</h3>
                    <button 
                      type="button" 
                      className="edit-info-btn-card"
                      onClick={handleEditAddress}
                      aria-label="Adres bilgilerini düzenle"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                  <div className="info-details">
                    <p>{addressInfo.address}</p>
                    <p>{addressInfo.district}, {addressInfo.city}</p>
                    {addressInfo.addressDetail && (
                      <p><strong>Adres Detayı:</strong> {addressInfo.addressDetail}</p>
                    )}
                  </div>
                </div>

                <div className="summary-info-card">
                  <div className="card-header-with-edit">
                    <h3>Ödeme Bilgileri</h3>
                    <button 
                      type="button" 
                      className="edit-info-btn-card"
                      onClick={handleEditPayment}
                      aria-label="Ödeme bilgilerini düzenle"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                  <div className="info-details">
                    <p><strong>Kart Numarası:</strong> •••• •••• •••• {cardInfo.cardNumber.length >= 4 ? cardInfo.cardNumber.slice(-4) : ''}</p>
                    <p><strong>Kart Sahibi:</strong> {cardInfo.cardName}</p>
                    <p><strong>Son Kullanma:</strong> {cardInfo.expiryMonth}/{cardInfo.expiryYear}</p>
                  </div>
                </div>

                <div className="summary-info-card">
                  <h3>Sipariş Detayları</h3>
                  <div className="order-items-summary">
                    {cartItems.map((item) => (
                      <div key={item.itemKey || item.id} className="order-item">
                        <div className="order-item-info">
                          <span className="order-item-name">{item.name}</span>
                          {item.customizations && (
                            <div className="order-item-details">
                              <span>En: {item.customizations.en} cm</span>
                              <span>Boy: {item.customizations.boy} cm</span>
                              <span>Pile: {item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}</span>
                            </div>
                          )}
                          <span className="order-item-quantity">Adet: {item.quantity}</span>
                        </div>
                        <div className="order-item-price">
                          {((item.customizations?.calculatedPrice || item.price) * item.quantity).toFixed(2)} ₺
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="order-total-summary">
                    <div className="total-row">
                      <span>Ara Toplam:</span>
                      <span>{getCartSubtotal().toFixed(2)} ₺</span>
                    </div>
                    {discountAmount > 0 && couponCode && (
                      <div className="total-row discount-row">
                        <span>Kupon İndirimi ({couponCode}):</span>
                        <span className="discount-amount">-{discountAmount.toFixed(2)} ₺</span>
                      </div>
                    )}
                    <div className="total-row">
                      <span>Kargo:</span>
                      <span className="free-shipping">Ücretsiz</span>
                    </div>
                    <div className="total-row final">
                      <span>Toplam:</span>
                      <span>{getCartTotal().toFixed(2)} ₺</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Adım Butonları */}
          <div className="checkout-actions">
            {currentStep > 1 && (
              <button type="button" onClick={handleBack} className="btn-back">
                ← Geri
              </button>
            )}
            {currentStep < totalSteps ? (
              <button type="button" onClick={handleNext} className="btn-next">
                {currentStep === 3 ? 'Özet\'e Git →' : 'İlerle →'}
              </button>
            ) : currentStep === 4 ? (
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCompleteOrder(e)
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                className="btn-complete"
                disabled={isProcessing}
              >
                {isProcessing ? 'Ödeme İşleniyor...' : 'Ödeme Yap'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Sipariş Özeti */}
        <aside className="checkout-summary">
          <h2>Sipariş Özeti</h2>
          
          {/* İletişim Bilgileri */}
          {currentStep >= 1 && contactInfo.firstName && (
            <div className="summary-info-section">
              <h3>İletişim</h3>
              <div className="summary-info-content">
                <p>{contactInfo.firstName} {contactInfo.lastName}</p>
                <p>{contactInfo.email}</p>
                {contactInfo.phone && <p>{contactInfo.phone}</p>}
              </div>
            </div>
          )}

          {/* Adres Bilgileri */}
          {currentStep >= 2 && addressInfo.address && (
            <div className="summary-info-section">
              <h3>Adres</h3>
              <div className="summary-info-content">
                <p>{addressInfo.address}</p>
                <p>{addressInfo.district}, {addressInfo.city}</p>
              </div>
            </div>
          )}

          {/* Ödeme Bilgileri */}
          {currentStep >= 3 && cardInfo.cardNumber && (
            <div className="summary-info-section">
              <h3>Ödeme</h3>
              <div className="summary-info-content">
                <p>•••• •••• •••• {cardInfo.cardNumber.length >= 4 ? cardInfo.cardNumber.slice(-4) : ''}</p>
                <p>{cardInfo.cardName}</p>
                <p>{cardInfo.expiryMonth}/{cardInfo.expiryYear}</p>
              </div>
            </div>
          )}

          <div className="summary-items">
            {cartItems.map((item) => (
              <div key={item.itemKey || item.id} className="summary-item">
                <div className="summary-item-info">
                  <span className="item-name">{item.name}</span>
                  {item.customizations && (
                    <div className="item-details">
                      <span>En: {item.customizations.en} cm</span>
                      <span>Boy: {item.customizations.boy} cm</span>
                      <span>Pile: {item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}</span>
                    </div>
                  )}
                </div>
                <div className="summary-item-price">
                  {((item.customizations?.calculatedPrice || item.price) * item.quantity).toFixed(2)} ₺
                </div>
              </div>
            ))}
          </div>
          <div className="summary-total">
            <div className="total-row">
              <span>Ara Toplam:</span>
              <span>{getCartSubtotal().toFixed(2)} ₺</span>
            </div>
            {discountAmount > 0 && couponCode && (
              <div className="total-row discount-row">
                <span>Kupon İndirimi ({couponCode}):</span>
                <span className="discount-amount">-{discountAmount.toFixed(2)} ₺</span>
              </div>
            )}
            <div className="total-row">
              <span>Kargo:</span>
              <span className="free-shipping">Ücretsiz</span>
            </div>
            <div className="total-row final">
              <span>Toplam:</span>
              <span>{getCartTotal().toFixed(2)} ₺</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Checkout


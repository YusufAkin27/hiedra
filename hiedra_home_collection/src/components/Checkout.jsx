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
  const cartContext = useCart()
  const { user, accessToken, isAuthenticated } = useAuth()
  const toast = useToast()
  
  // Cart context'ten değerleri al, eğer undefined ise default değerler kullan
  const cartItems = cartContext?.cartItems || []
  const getCartTotal = cartContext?.getCartTotal || (() => 0)
  const getCartSubtotal = cartContext?.getCartSubtotal || (() => 0)
  const clearCart = cartContext?.clearCart || (() => {})
  const couponCode = cartContext?.couponCode || null
  const discountAmount = cartContext?.discountAmount || 0
  const cartId = cartContext?.cartId || null
  const [currentStep, setCurrentStep] = useState(1) // 1: Adres Bilgileri, 2: Ödeme Bilgileri
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
    district: ''
  })

  // Fatura adresi
  const [useSameAddressForInvoice, setUseSameAddressForInvoice] = useState(true)
  const [invoiceAddressInfo, setInvoiceAddressInfo] = useState({
    address: '',
    city: '',
    district: ''
  })

  // Kart bilgileri - Basitleştirilmiş
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiry: '', // MM/YY formatında
    cvv: ''
  })

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
      loadUserAddresses()
    }
  }, [isAuthenticated, accessToken])

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
        district: address.district
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
  const validateAddressStep = () => {
    if (!validateContactInfo()) {
      return false
    }
    // Kayıtlı adres seçilmediyse, manuel adres bilgileri kontrol edilmeli
    if (!useSavedAddress || !selectedAddressId) {
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
    }
    // Fatura adresi validasyonu
    if (!useSameAddressForInvoice) {
      if (!invoiceAddressInfo.address.trim()) {
        toast.warning('Lütfen fatura adres bilgilerinizi giriniz.')
        return false
      }
      if (!invoiceAddressInfo.city.trim()) {
        toast.warning('Lütfen fatura şehir bilgisini giriniz.')
        return false
      }
      if (!invoiceAddressInfo.district.trim()) {
        toast.warning('Lütfen fatura ilçe bilgisini giriniz.')
        return false
      }
    }
    return true
  }

  // Ödeme bilgileri validasyonu
  const validatePaymentStep = () => {
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
    return true
  }

  // Sonraki adıma geç
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateAddressStep()) {
        setCurrentStep(2)
        // Ödeme bölümüne scroll
        setTimeout(() => {
          const paymentSection = document.querySelector('.payment-section')
          if (paymentSection) {
            paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }
  }

  // Önceki adıma dön
  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
      setTimeout(() => {
        const addressSection = document.querySelector('.address-step')
        if (addressSection) {
          addressSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
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
      
      // Son kullanma tarihi zaten MM/YY formatında
      const cardExpiry = cardInfo.expiry // MM/YY formatında
      
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
        // Kart adı soyadı kaldırıldı - backend'den alınacak
        firstName: contactInfo.firstName,
        lastName: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone.replace(/\D/g, ''), // Sadece rakamlar
        // Adres bilgileri: Kayıtlı adres seçilmediyse manuel girilen adres gönderilir
        address: (isAuthenticated && useSavedAddress && selectedAddressId) 
          ? null  // Kayıtlı adres seçildiyse, addressId gönderilir, address null
          : addressInfo.address,  // Kayıtlı adres seçilmediyse, manuel girilen adres gönderilir
        city: (isAuthenticated && useSavedAddress && selectedAddressId) 
          ? null 
          : addressInfo.city,
        district: (isAuthenticated && useSavedAddress && selectedAddressId) 
          ? null 
          : addressInfo.district,
        addressDetail: null,
        // Fatura adresi
        invoiceAddress: useSameAddressForInvoice ? null : invoiceAddressInfo.address,
        invoiceCity: useSameAddressForInvoice ? null : invoiceAddressInfo.city,
        invoiceDistrict: useSameAddressForInvoice ? null : invoiceAddressInfo.district,
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
    
    // Ödeme bilgileri validasyonu
    if (!validatePaymentStep()) {
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

  // Son kullanma tarihi formatla (MM/YY)
  const formatExpiry = (value) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length === 0) return ''
    if (numbers.length <= 2) return numbers
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`
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
        <div className="checkout-steps-indicator">
          <div className={`step-indicator ${currentStep >= 1 ? 'active' : ''} ${currentStep === 1 ? 'current' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-title">Adres Bilgileri</div>
          </div>
          <div className="step-connector"></div>
          <div className={`step-indicator ${currentStep >= 2 ? 'active' : ''} ${currentStep === 2 ? 'current' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-title">Ödeme Bilgileri</div>
          </div>
        </div>
      </header>

      <div className="checkout-content">
        <div className="checkout-form-section">
          <form onSubmit={handleCompleteOrder} className="checkout-form">
            {/* Temp 1: Adres Bilgileri */}
            {currentStep === 1 && (
              <div className="address-step">
                {/* İletişim Bilgileri */}
                <section className="form-section contact-section">
                  <div className="section-header">
                    <h2>İletişim Bilgileri</h2>
                    <p className="section-description">Siparişiniz için gerekli iletişim bilgilerinizi giriniz</p>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">
                        <span className="label-text">Ad</span>
                        <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={contactInfo.firstName}
                        onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                        placeholder="Adınız"
                        autoComplete="given-name"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">
                        <span className="label-text">Soyad</span>
                        <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={contactInfo.lastName}
                        onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                        placeholder="Soyadınız"
                        autoComplete="family-name"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">
                      <span className="label-text">E-posta</span>
                      <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      placeholder="ornek@email.com"
                      autoComplete="email"
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">
                      <span className="label-text">Telefon</span>
                      <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={contactInfo.phone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '')
                        if (value.startsWith('90') && value.length > 10) {
                          value = value.substring(2)
                        }
                        if (value.startsWith('0')) {
                          value = value.substring(1)
                        }
                        if (value.length <= 10) {
                          setContactInfo({ ...contactInfo, phone: value })
                        }
                      }}
                      placeholder="5336360079"
                      autoComplete="tel"
                      maxLength={10}
                      className="form-input"
                      required
                    />
                    <span className="input-hint">10 haneli telefon numaranızı giriniz (örn: 5336360079)</span>
                  </div>
                </section>

            {/* Adres Bilgileri */}
            <section className="form-section">
              <h2>Adres Bilgileri</h2>
              
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
                          setAddressInfo({
                            address: '',
                            city: '',
                            district: ''
                          })
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Kayıtlı adreslerimden seç
                  </label>
                  
                  {useSavedAddress && (
                    <div className="saved-addresses-container">
                      {loadingAddresses ? (
                        <div className="address-loading">
                          <div className="loading-spinner"></div>
                          <p>Adresler yükleniyor...</p>
                        </div>
                      ) : (
                        <div className="saved-addresses-grid">
                          {userAddresses.map((address) => (
                            <div
                              key={address.id}
                              className={`saved-address-card ${selectedAddressId === address.id ? 'selected' : ''}`}
                              onClick={() => handleAddressSelect(address.id)}
                            >
                              <div className="address-card-header">
                                <div className="address-radio-wrapper">
                                  <input
                                    type="radio"
                                    name="selectedAddress"
                                    checked={selectedAddressId === address.id}
                                    onChange={() => handleAddressSelect(address.id)}
                                    className="address-radio"
                                  />
                                  <div className="radio-custom"></div>
                                </div>
                                {address.isDefault && (
                                  <span className="default-badge">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M8 0L10.163 5.674L16 6.182L12 10.326L12.944 16L8 13.174L3.056 16L4 10.326L0 6.182L5.837 5.674L8 0Z" fill="currentColor"/>
                                    </svg>
                                    Varsayılan
                                  </span>
                                )}
                              </div>
                              <div className="address-card-body">
                                <div className="address-name">
                                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M10 18.3333C13.6819 18.3333 16.6667 15.3486 16.6667 11.6667C16.6667 7.98477 13.6819 5 10 5C6.3181 5 3.33334 7.98477 3.33334 11.6667C3.33334 15.3486 6.3181 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {address.fullName}
                                </div>
                                <div className="address-line">
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 1.33333C5.05448 1.33333 2.66667 3.72114 2.66667 6.66667C2.66667 10.3333 8 14.6667 8 14.6667C8 14.6667 13.3333 10.3333 13.3333 6.66667C13.3333 3.72114 10.9455 1.33333 8 1.33333ZM8 8.66667C7.26362 8.66667 6.66667 8.06971 6.66667 7.33333C6.66667 6.59695 7.26362 6 8 6C8.73638 6 9.33333 6.59695 9.33333 7.33333C9.33333 8.06971 8.73638 8.66667 8 8.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {address.addressLine}
                                </div>
                                <div className="address-location">
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 1.33333C5.05448 1.33333 2.66667 3.72114 2.66667 6.66667C2.66667 10.3333 8 14.6667 8 14.6667C8 14.6667 13.3333 10.3333 13.3333 6.66667C13.3333 3.72114 10.9455 1.33333 8 1.33333ZM8 8.66667C7.26362 8.66667 6.66667 8.06971 6.66667 7.33333C6.66667 6.59695 7.26362 6 8 6C8.73638 6 9.33333 6.59695 9.33333 7.33333C9.33333 8.06971 8.73638 8.66667 8 8.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {address.district}, {address.city}
                                </div>
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

            {/* Fatura Adresi */}
            <section className="form-section">
              <h2>Fatura Adresi</h2>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={useSameAddressForInvoice}
                    onChange={(e) => {
                      setUseSameAddressForInvoice(e.target.checked)
                      if (e.target.checked) {
                        // Aynı adresi kullan, fatura adresini temizle
                        setInvoiceAddressInfo({
                          address: '',
                          city: '',
                          district: ''
                        })
                      }
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Faturam kargo ile aynı adrese gönderilsin
                </label>
              </div>

              {!useSameAddressForInvoice && (
                <>
                  <div className="form-group">
                    <label htmlFor="invoiceAddress">
                      Fatura Adresi <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="invoiceAddress"
                      name="invoiceAddress"
                      value={invoiceAddressInfo.address}
                      onChange={(e) => setInvoiceAddressInfo({ ...invoiceAddressInfo, address: e.target.value })}
                      placeholder="Mahalle, Sokak, Cadde"
                      autoComplete="street-address"
                      required={!useSameAddressForInvoice}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="invoiceCity">
                        Şehir <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="invoiceCity"
                        name="invoiceCity"
                        value={invoiceAddressInfo.city}
                        onChange={(e) => setInvoiceAddressInfo({ ...invoiceAddressInfo, city: e.target.value })}
                        required={!useSameAddressForInvoice}
                        placeholder="Şehir adı"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="invoiceDistrict">
                        İlçe <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="invoiceDistrict"
                        name="invoiceDistrict"
                        value={invoiceAddressInfo.district}
                        onChange={(e) => setInvoiceAddressInfo({ ...invoiceAddressInfo, district: e.target.value })}
                        required={!useSameAddressForInvoice}
                        placeholder="İlçe adı"
                      />
                    </div>
                  </div>
                </>
              )}
            </section>

                {/* Adım Butonları - Adres */}
                <div className="checkout-step-actions">
                  <button 
                    type="button"
                    onClick={handleNextStep}
                    className="btn-next-step"
                  >
                    Ödeme Bilgilerine Geç →
                  </button>
                </div>
              </div>
            )}

            {/* Temp 2: Ödeme Bilgileri */}
            {currentStep === 2 && (
              <div className="payment-step">
                <section className="form-section payment-section">
                  <div className="payment-section-header">
                    <h2>Ödeme Bilgileri</h2>
                    <p className="payment-section-subtitle">Güvenli ödeme için kart bilgilerinizi giriniz</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cardNumber">
                      <span className="label-text">Kart Numarası</span>
                      <span className="required">*</span>
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
                        className="form-input card-number-input"
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
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiry">
                        <span className="label-text">Son Kullanma Tarihi</span>
                        <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="expiry"
                        name="expiry"
                        value={cardInfo.expiry}
                        onChange={(e) => {
                          const formatted = formatExpiry(e.target.value)
                          setCardInfo({ ...cardInfo, expiry: formatted })
                        }}
                        placeholder="MM/YY"
                        maxLength="5"
                        autoComplete="cc-exp"
                        inputMode="numeric"
                        pattern="\d{2}/\d{2}"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cvv">
                        <span className="label-text">CVV</span>
                        <span className="required">*</span>
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
                        className="form-input"
                        required
                      />
                      <span className="input-hint">Kartınızın arkasındaki 3 haneli güvenlik kodu</span>
                    </div>
                  </div>

                  {/* Desteklenen Kartlar */}
                  <div className="supported-cards-section">
                    <p className="supported-cards-label">Kabul Edilen Kartlar</p>
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

                  {/* Adım Butonları - Ödeme */}
                  <div className="checkout-step-actions">
                    <button 
                      type="button"
                      onClick={handlePrevStep}
                      className="btn-prev-step"
                    >
                      ← Geri
                    </button>
                    <button 
                      type="submit"
                      className="btn-complete"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Ödeme İşleniyor...' : 'Ödeme Yap'}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </form>
        </div>

        {/* Sipariş Özeti */}
        <aside className="checkout-summary">
          <div className="summary-header">
            <h2>Sipariş Özeti</h2>
            <div className="item-count-badge">
              {cartItems.length} {cartItems.length === 1 ? 'Ürün' : 'Ürün'}
            </div>
          </div>
          
          <div className="summary-items">
            {cartItems.map((item) => (
              <div key={item.itemKey || item.id} className="summary-item-card">
                <div className="summary-item-content">
                  <div className="summary-item-header">
                    <h3 className="item-name">{item.name}</h3>
                    <div className="item-quantity-badge">{item.quantity}x</div>
                  </div>
                  {item.customizations && (
                    <div className="item-specs">
                      <div className="spec-item">
                        <span className="spec-label">En:</span>
                        <span className="spec-value">{item.customizations.en} cm</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Boy:</span>
                        <span className="spec-value">{item.customizations.boy} cm</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Pile:</span>
                        <span className="spec-value">{item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="summary-item-price">
                  {((item.customizations?.calculatedPrice || item.price) * item.quantity).toFixed(2)} ₺
                </div>
              </div>
            ))}
          </div>
          
          <div className="summary-total-section">
            <div className="total-divider"></div>
            <div className="total-rows">
              <div className="total-row">
                <span className="total-label">Ara Toplam</span>
                <span className="total-value">{getCartSubtotal().toFixed(2)} ₺</span>
              </div>
              {discountAmount > 0 && couponCode && (
                <div className="total-row discount-row">
                  <span className="total-label">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" fill="currentColor"/>
                    </svg>
                    Kupon İndirimi ({couponCode})
                  </span>
                  <span className="total-value discount-amount">-{discountAmount.toFixed(2)} ₺</span>
                </div>
              )}
              <div className="total-row shipping-row">
                <span className="total-label">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4H10V12H2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 6H14L15 7V12H10V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12C5.55228 12 6 11.5523 6 11C6 10.4477 5.55228 10 5 10C4.44772 10 4 10.4477 4 11C4 11.5523 4.44772 12 5 12Z" fill="currentColor"/>
                    <path d="M12 12C12.5523 12 13 11.5523 13 11C13 10.4477 12.5523 10 12 10C11.4477 10 11 10.4477 11 11C11 11.5523 11.4477 12 12 12Z" fill="currentColor"/>
                  </svg>
                  Kargo
                </span>
                <span className="total-value free-shipping">Ücretsiz</span>
              </div>
            </div>
            <div className="total-divider"></div>
            <div className="total-final">
              <span className="final-label">Toplam</span>
              <span className="final-value">{getCartTotal().toFixed(2)} ₺</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Checkout


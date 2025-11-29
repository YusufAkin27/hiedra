import React, { useEffect } from 'react'
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import LazyImage from './LazyImage'
import './OrderConfirmation.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const OrderConfirmation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated, accessToken } = useAuth()
  const [orderData, setOrderData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  
  // Backend'den sipariş detaylarını çek
  const fetchOrderDetails = async (orderNumber) => {
    try {
      setLoading(true)
      setError('')

      // Eğer kullanıcı giriş yapmışsa ve email varsa, backend'den çek
      if (isAuthenticated && user?.email && accessToken) {
        const response = await fetch(`${API_BASE_URL}/orders/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            orderNumber: orderNumber,
            customerEmail: user.email
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.isSuccess || data.success) {
            const order = data.data || data
            // Backend'den gelen veriyi orderData formatına çevir
            const formattedData = {
              orderNumber: order.orderNumber || orderNumber,
              contactInfo: {
                firstName: order.customerName?.split(' ')[0] || '',
                lastName: order.customerName?.split(' ').slice(1).join(' ') || '',
                email: order.customerEmail || user.email || '',
                phone: order.customerPhone || ''
              },
              addressInfo: order.addresses && order.addresses.length > 0 ? {
                address: order.addresses[0].addressLine || '',
                city: order.addresses[0].city || '',
                district: order.addresses[0].district || '',
                addressDetail: order.addresses[0].addressDetail || ''
              } : {},
              cardInfo: {
                cardNumber: order.paymentMethod === 'CREDIT_CARD' ? '****' : ''
              },
              items: order.orderItems ? order.orderItems.map(item => ({
                id: item.productId,
                name: item.productName || 'Ürün',
                price: item.price || 0,
                quantity: item.quantity || 1,
                image: item.productImage || null,
                customizations: {
                  en: item.width || 0,
                  boy: item.height || 0,
                  pileSikligi: item.pleatType || 'pilesiz',
                  calculatedPrice: item.price || 0
                }
              })) : [],
              totalPrice: order.totalAmount || order.totalPrice || 0,
              orderDate: order.orderDate || new Date().toISOString(),
              status: order.status || 'PENDING'
            }
            setOrderData(formattedData)
            setLoading(false)
            return
          }
        }
      }

      // Backend'den çekilemediyse veya kullanıcı giriş yapmamışsa, sessionStorage'dan al
      let data = location.state?.orderData || null
      
      if (!data) {
        try {
          const lastOrderData = sessionStorage.getItem('lastOrderData')
          if (lastOrderData) {
            data = JSON.parse(lastOrderData)
            sessionStorage.removeItem('lastOrderData')
          }
        } catch (e) {
          console.error('SessionStorage parse hatası:', e)
        }
      }

      // Eğer hala data yoksa, checkout data'dan oluştur
      if (!data && orderNumber) {
        try {
          const checkoutData = sessionStorage.getItem('checkoutData')
          if (checkoutData) {
            const parsedCheckout = JSON.parse(checkoutData)
            data = {
              orderNumber: orderNumber,
              contactInfo: parsedCheckout.contactInfo || {},
              addressInfo: parsedCheckout.addressInfo || {},
              cardInfo: parsedCheckout.cardInfo || {},
              items: parsedCheckout.items || [],
              totalPrice: parsedCheckout.totalPrice || 0,
              orderDate: new Date().toISOString()
            }
            sessionStorage.removeItem('checkoutData')
          } else {
            data = {
              orderNumber: orderNumber,
              contactInfo: {},
              addressInfo: {},
              cardInfo: {},
              items: [],
              totalPrice: 0,
              orderDate: new Date().toISOString()
            }
          }
        } catch (e) {
          console.error('Checkout data parse hatası:', e)
          data = {
            orderNumber: orderNumber,
            contactInfo: {},
            addressInfo: {},
            cardInfo: {},
            items: [],
            totalPrice: 0,
            orderDate: new Date().toISOString()
          }
        }
      }

      if (data) {
        setOrderData(data)
        setLoading(false)
      } else {
        setError('Sipariş bilgileri bulunamadı')
        setLoading(false)
      }
    } catch (err) {
      console.error('Sipariş detayları yüklenirken hata:', err)
      setError('Sipariş detayları yüklenirken bir hata oluştu')
      setLoading(false)
    }
  }

  useEffect(() => {
    // URL'den order parametresini al - hem searchParams hem de window.location'dan kontrol et
    let urlOrderNumber = searchParams.get('order')
    
    // Eğer searchParams'ta yoksa, window.location.search'ten al
    if (!urlOrderNumber) {
      const urlParams = new URLSearchParams(window.location.search)
      urlOrderNumber = urlParams.get('order')
    }
    
    // URL'den order numarasını temizle (trim ve decode)
    if (urlOrderNumber) {
      urlOrderNumber = urlOrderNumber.trim()
      console.log('URL\'den order numarası alındı:', urlOrderNumber)
      fetchOrderDetails(urlOrderNumber)
    } else {
      // URL'de order numarası yoksa, state veya sessionStorage'dan al
      let data = location.state?.orderData || null
      
      if (!data) {
        try {
          const lastOrderData = sessionStorage.getItem('lastOrderData')
          if (lastOrderData) {
            data = JSON.parse(lastOrderData)
            sessionStorage.removeItem('lastOrderData')
          }
        } catch (e) {
          console.error('SessionStorage parse hatası:', e)
        }
      }

      if (data) {
        setOrderData(data)
        setLoading(false)
      } else {
        console.warn('Order data bulunamadı, ana sayfaya yönlendiriliyor')
        navigate('/', { replace: true })
      }
    }
  }, [searchParams, location, navigate, isAuthenticated, user, accessToken])
  
  if (loading) {
    return (
      <div className="order-confirmation-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '2rem auto' }}>
          <div className="spinner" style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (error || !orderData) {
    return (
      <div className="order-confirmation-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="error-icon" style={{ color: '#e74c3c', marginBottom: '1rem' }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2>Sipariş Bulunamadı</h2>
        <p>{error || 'Sipariş bilgileri yüklenemedi.'}</p>
        <Link to="/" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Ana Sayfaya Dön
        </Link>
      </div>
    )
  }

  // Sipariş numarası: orderData'dan gelen
  const orderNumber = orderData.orderNumber || 'ORD-' + Date.now()
  const orderDateObj = orderData.orderDate ? new Date(orderData.orderDate) : new Date()
  const orderDate = orderDateObj.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Order',
    orderNumber: orderNumber,
    orderDate: new Date().toISOString(),
    customer: {
      '@type': 'Person',
      name: `${orderData.contactInfo.firstName} ${orderData.contactInfo.lastName}`,
      email: orderData.contactInfo.email,
      telephone: orderData.contactInfo.phone
    },
    totalPrice: orderData.totalPrice
  }

  return (
    <div className="order-confirmation-container">
      <SEO
        title="Sipariş Onayı"
        description="Siparişiniz başarıyla alındı. Sipariş numaranız ve detayları."
        keywords="sipariş onayı, sipariş numarası, perde sipariş, sipariş teşekkür"
        url="/siparis-onayi"
        structuredData={structuredData}
      />
      
      <div className="confirmation-content">
        <div className="success-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <header className="confirmation-header">
          <h1>Siparişiniz Alındı!</h1>
          <p className="confirmation-subtitle">Siparişiniz için teşekkür ederiz</p>
        </header>

        <div className="order-details-card">
          <div className="order-number-section">
            <h2>Sipariş Numarası</h2>
            <p className="order-number">{orderNumber}</p>
            <p className="order-date">Sipariş Tarihi: {orderDate}</p>
          </div>

          <div className="order-info-grid">
            {(orderData.contactInfo.firstName || orderData.contactInfo.email || orderData.contactInfo.phone) && (
              <div className="info-section">
                <h3>Fatura Bilgileri</h3>
                <div className="info-content">
                  {(orderData.contactInfo.firstName || orderData.contactInfo.lastName) && (
                    <p><strong>Ad Soyad:</strong> {orderData.contactInfo.firstName || ''} {orderData.contactInfo.lastName || ''}</p>
                  )}
                  {orderData.contactInfo.email && (
                    <p><strong>E-posta:</strong> {orderData.contactInfo.email}</p>
                  )}
                  {orderData.contactInfo.phone && (
                    <p><strong>Telefon:</strong> {orderData.contactInfo.phone}</p>
                  )}
                </div>
              </div>
            )}

            {(orderData.addressInfo.address || orderData.addressInfo.city) && (
              <div className="info-section">
                <h3>Teslimat Adresi</h3>
                <div className="info-content">
                  {orderData.addressInfo.address && (
                    <p>{orderData.addressInfo.address}</p>
                  )}
                  {(orderData.addressInfo.district || orderData.addressInfo.city) && (
                    <p>{orderData.addressInfo.district || ''}{orderData.addressInfo.district && orderData.addressInfo.city ? ', ' : ''}{orderData.addressInfo.city || ''}</p>
                  )}
                  {orderData.addressInfo.addressDetail && (
                    <p><strong>Adres Detayı:</strong> {orderData.addressInfo.addressDetail}</p>
                  )}
                </div>
              </div>
            )}

            {(orderData.cardInfo.cardNumber || orderData.totalPrice > 0) && (
              <div className="info-section">
                <h3>Ödeme Bilgileri</h3>
                <div className="info-content">
                  <p><strong>Ödeme Yöntemi:</strong> Kredi Kartı</p>
                  {orderData.cardInfo.cardNumber && orderData.cardInfo.cardNumber.length >= 4 && (
                    <p><strong>Kart:</strong> •••• •••• •••• {orderData.cardInfo.cardNumber.slice(-4)}</p>
                  )}
                  {orderData.totalPrice > 0 && (
                    <p><strong>Toplam Tutar:</strong> {orderData.totalPrice.toFixed(2)} ₺</p>
                  )}
                </div>
              </div>
            )}

            {orderData.items && orderData.items.length > 0 && (
              <div className="info-section full-width">
                <h3>Sipariş Detayları</h3>
                <div className="order-items-list">
                  {orderData.items.map((item, index) => (
                    <div key={index} className="confirmation-item">
                      {item.image && (
                        <div className="item-image">
                          <LazyImage
                            src={item.image}
                            alt={item.name}
                            className="product-image"
                          />
                        </div>
                      )}
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        {item.customizations && (
                          <div className="item-customizations">
                            {item.customizations.en && (
                              <span>En: {item.customizations.en} cm</span>
                            )}
                            {item.customizations.boy && (
                              <span>Boy: {item.customizations.boy} cm</span>
                            )}
                            {item.customizations.pileSikligi && (
                              <span>Pile: {item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}</span>
                            )}
                          </div>
                        )}
                        <span className="item-quantity">Adet: {item.quantity}</span>
                      </div>
                      <div className="item-price">
                        {((item.customizations?.calculatedPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)} ₺
                      </div>
                    </div>
                  ))}
                </div>
                {orderData.totalPrice > 0 && (
                  <div className="order-summary">
                    <div className="summary-row">
                      <span>Ara Toplam:</span>
                      <span>{orderData.totalPrice.toFixed(2)} ₺</span>
                    </div>
                    <div className="summary-row">
                      <span>Kargo:</span>
                      <span className="free-shipping">Ücretsiz</span>
                    </div>
                    <div className="summary-row total">
                      <span>Toplam:</span>
                      <span>{orderData.totalPrice.toFixed(2)} ₺</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="confirmation-actions">
          <p className="info-text">Sipariş durumunuzu <Link to="/siparis-sorgula">Sipariş Sorgula</Link> sayfasından takip edebilirsiniz.</p>
          <div className="action-buttons">
            <Link to="/" className="btn-primary">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmation


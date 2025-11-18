import React, { useEffect } from 'react'
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom'
import SEO from './SEO'
import './OrderConfirmation.css'

const OrderConfirmation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [orderData, setOrderData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  
  useEffect(() => {
    // Eğer /payment-success route'undan geliyorsa, ana sayfaya yönlendir
    if (location.pathname === '/payment-success') {
      console.log('Payment-success sayfasından ana sayfaya yönlendiriliyor...')
      navigate('/', { replace: true })
      return
    }
    
    // ÖNCE: URL'den order parametresini al (backend redirect ile gelen: ?order=ORD-123)
    const urlOrderNumber = searchParams.get('order')
    
    console.log('OrderConfirmation component yüklendi, URL order:', urlOrderNumber)
    
    // URL'den, location state'ten veya sessionStorage'dan sipariş bilgilerini al
    let data = location.state?.orderData || null
    
    // Eğer state'te yoksa sessionStorage'dan al
    if (!data) {
      try {
        const lastOrderData = sessionStorage.getItem('lastOrderData')
        if (lastOrderData) {
          data = JSON.parse(lastOrderData)
          console.log('Order data sessionStorage\'dan alındı:', data)
          // SessionStorage'dan sildik (tek kullanımlık)
          sessionStorage.removeItem('lastOrderData')
        }
      } catch (e) {
        console.error('SessionStorage parse hatası:', e)
      }
    }
    
    // Eğer URL'den order numarası geldiyse ama orderData yoksa, orderData oluştur
    if (urlOrderNumber && !data) {
      console.log('URL\'den order numarası alındı, orderData oluşturuluyor:', urlOrderNumber)
      // SessionStorage'dan checkout data'yı al
      try {
        const checkoutData = sessionStorage.getItem('checkoutData')
        if (checkoutData) {
          const parsedCheckout = JSON.parse(checkoutData)
          data = {
            orderNumber: urlOrderNumber,
            contactInfo: parsedCheckout.contactInfo || {},
            addressInfo: parsedCheckout.addressInfo || {},
            cardInfo: parsedCheckout.cardInfo || {},
            items: parsedCheckout.items || [],
            totalPrice: parsedCheckout.totalPrice || 0
          }
          // Checkout data'yı temizle
          sessionStorage.removeItem('checkoutData')
          console.log('OrderData URL\'den oluşturuldu:', data)
        } else {
          // Sadece order numarası ile minimal orderData oluştur
          data = {
            orderNumber: urlOrderNumber,
            contactInfo: {},
            addressInfo: {},
            cardInfo: {},
            items: [],
            totalPrice: 0
          }
          console.log('Minimal orderData oluşturuldu (sadece order numarası):', data)
        }
      } catch (e) {
        console.error('Checkout data parse hatası:', e)
        // Hata durumunda minimal orderData
        data = {
          orderNumber: urlOrderNumber,
          contactInfo: {},
          addressInfo: {},
          cardInfo: {},
          items: [],
          totalPrice: 0
        }
      }
    }
    
    // Eğer URL'den order numarası varsa, mutlaka orderData oluştur
    if (urlOrderNumber && !data) {
      data = {
        orderNumber: urlOrderNumber,
        contactInfo: {},
        addressInfo: {},
        cardInfo: {},
        items: [],
        totalPrice: 0
      }
      console.log('URL\'den order numarası geldi, minimal orderData oluşturuldu:', data)
    }
    
    if (data) {
      setOrderData(data)
      setLoading(false)
    } else {
      // Eğer hiçbir veri yoksa ve URL'de order numarası da yoksa ana sayfaya yönlendir
      console.warn('Order data bulunamadı, ana sayfaya yönlendiriliyor')
      navigate('/', { replace: true })
    }
  }, [searchParams, location, navigate])
  
  if (loading || !orderData) {
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

  // Sipariş numarası: orderData'dan gelen
  const orderNumber = orderData.orderNumber || 'ORD-' + Date.now()
  const orderDate = new Date().toLocaleDateString('tr-TR', {
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
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        {item.customizations && (
                          <div className="item-customizations">
                            <span>En: {item.customizations.en} cm</span>
                            <span>Boy: {item.customizations.boy} cm</span>
                            <span>Pile: {item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}</span>
                          </div>
                        )}
                        <span className="item-quantity">Adet: {item.quantity}</span>
                      </div>
                      <div className="item-price">
                        {((item.customizations?.calculatedPrice || item.price) * item.quantity).toFixed(2)} ₺
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
            <button 
              onClick={() => window.print()} 
              className="btn-secondary"
            >
              Yazdır
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmation


import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import './Cart.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Cart = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartSubtotal,
    refreshCart,
    discountAmount,
    couponCode,
    setDiscountAmount,
    setCouponCode,
  } = useCart()
  const { accessToken, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [couponInput, setCouponInput] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isRemovingCoupon, setIsRemovingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')

  // Sayfa yüklendiğinde backend'den sepeti çek
  useEffect(() => {
    refreshCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kupon uygula
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponError('Lütfen kupon kodunu giriniz')
      return
    }

    if (!isAuthenticated) {
      setCouponError('Kupon uygulamak için lütfen giriş yapınız')
      return
    }

    try {
      setIsApplyingCoupon(true)
      setCouponError('')
      setCouponSuccess('')

      let guestUserId = null
      if (!isAuthenticated || !accessToken) {
        guestUserId = localStorage.getItem('guestUserId')
      }

      const url = `${API_BASE_URL}/cart/apply-coupon${guestUserId ? `?guestUserId=${guestUserId}` : ''}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          couponCode: couponInput.trim().toUpperCase()
        })
      })

      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        setCouponSuccess('Kupon başarıyla uygulandı!')
        setCouponInput('')
        // Sepeti yeniden yükle
        await refreshCart()
      } else {
        setCouponError(data.message || 'Kupon uygulanamadı')
      }
    } catch (error) {
      console.error('Kupon uygulanırken hata:', error)
      setCouponError('Kupon uygulanırken bir hata oluştu')
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  // Kuponu kaldır
  const handleRemoveCoupon = async () => {
    try {
      setIsRemovingCoupon(true)
      setCouponError('')
      setCouponSuccess('')

      let guestUserId = null
      if (!isAuthenticated || !accessToken) {
        guestUserId = localStorage.getItem('guestUserId')
      }

      const url = `${API_BASE_URL}/cart/coupon${guestUserId ? `?guestUserId=${guestUserId}` : ''}`
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      })

      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        setCouponSuccess('Kupon kaldırıldı')
        setCouponCode(null)
        setDiscountAmount(0)
        // Sepeti yeniden yükle
        await refreshCart()
      } else {
        setCouponError(data.message || 'Kupon kaldırılamadı')
      }
    } catch (error) {
      console.error('Kupon kaldırılırken hata:', error)
      setCouponError('Kupon kaldırılırken bir hata oluştu')
    } finally {
      setIsRemovingCoupon(false)
    }
  }

  // Backend'den sepet öğesini sil
  const handleRemoveFromCart = async (productId, itemKey = null, cartItemId = null) => {
    try {
      // Eğer backend'den gelen bir item ise (cartItemId varsa), backend'den sil
      if (cartItemId && itemKey && itemKey.startsWith('backend_')) {
        // Giriş yapmış kullanıcı için guestUserId gönderme
        let guestUserId = null
        if (!isAuthenticated || !accessToken) {
          guestUserId = localStorage.getItem('guestUserId')
        }
        const url = `${API_BASE_URL}/cart/items/${cartItemId}${guestUserId ? `?guestUserId=${guestUserId}` : ''}`
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          }
        })

        if (response.ok) {
          // Backend'den sepeti yeniden yükle
          await refreshCart()
          return
        }
      }
      
      // Fallback: Local storage'dan sil
      removeFromCart(productId, itemKey)
    } catch (error) {
      console.error('Sepetten ürün silinirken hata:', error)
      // Hata durumunda local storage'dan sil
      removeFromCart(productId, itemKey)
    }
  }

  // Backend'de sepet öğesi miktarını güncelle
  const handleUpdateQuantity = async (productId, newQuantity, itemKey = null, cartItemId = null) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId, itemKey, cartItemId)
      return
    }

    try {
      // Eğer backend'den gelen bir item ise (cartItemId varsa), backend'de güncelle
      if (cartItemId && itemKey && itemKey.startsWith('backend_')) {
        // Giriş yapmış kullanıcı için guestUserId gönderme
        let guestUserId = null
        if (!isAuthenticated || !accessToken) {
          guestUserId = localStorage.getItem('guestUserId')
        }
        const url = `${API_BASE_URL}/cart/items/${cartItemId}${guestUserId ? `?guestUserId=${guestUserId}` : ''}`
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          },
          body: JSON.stringify({
            quantity: newQuantity
          })
        })

        if (response.ok) {
          // Backend'den sepeti yeniden yükle
          await refreshCart()
          return
        }
      }
      
      // Fallback: Local storage'da güncelle
      updateQuantity(productId, newQuantity, itemKey)
    } catch (error) {
      console.error('Sepet miktarı güncellenirken hata:', error)
      // Hata durumunda local storage'da güncelle
      updateQuantity(productId, newQuantity, itemKey)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Sepetiniz Boş</h2>
          <p>Alışverişe başlamak için ürünlerimizi inceleyin</p>
          <Link to="/" className="shop-btn">
            Alışverişe Başla
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>Sepetim</h1>
        <p className="cart-item-count">{cartItems.length} ürün</p>
      </div>

      <div className="cart-content">
        <div className="cart-items-section">
          <div className="cart-items-header">
            <h2>Ürünler</h2>
            <button className="clear-cart-btn" onClick={clearCart}>
              Sepeti Temizle
            </button>
          </div>
          
          <div className="cart-items">
            {cartItems.map((item, index) => (
              <div key={item.itemKey || `${item.id}_${index}`} className="cart-item">
                <Link to={`/product/${item.id}`} className="cart-item-image-wrapper">
                  <div className="cart-item-image">
                    <img src={item.image} alt={item.name} />
                  </div>
                  {item.quantity > 1 && (
                    <div className="quantity-badge">
                      {item.quantity}x
                    </div>
                  )}
                </Link>
                
                <div className="cart-item-content">
                  <div className="cart-item-main-info">
                    <div className="cart-item-title-section">
                      <Link to={`/product/${item.id}`} className="cart-item-name">
                        {item.name}
                      </Link>
                      {item.category && (
                        <span className="cart-item-category">{item.category}</span>
                      )}
                    </div>
                    <button
                      className="remove-item-btn"
                      onClick={() => handleRemoveFromCart(item.id, item.itemKey, item.cartItemId)}
                      aria-label="Ürünü kaldır"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  
                  {item.customizations && (
                    <div className="cart-item-customizations">
                      <div className="customization-item">
                        <span className="customization-label">En</span>
                        <span className="customization-value">{item.customizations.en} cm</span>
                      </div>
                      <div className="customization-item">
                        <span className="customization-label">Boy</span>
                        <span className="customization-value">{item.customizations.boy} cm</span>
                      </div>
                      <div className="customization-item">
                        <span className="customization-label">Pile</span>
                        <span className="customization-value">
                          {item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="cart-item-actions">
                    <div className="cart-item-price-section">
                      <span className="price-label">Birim Fiyat</span>
                      <span className="unit-price">
                        {(item.customizations?.calculatedPrice || item.price).toFixed(2)} ₺
                      </span>
                    </div>
                    <div className="cart-quantity-controls">
                      <span className="quantity-label">Adet</span>
                      <div className="cart-quantity">
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.itemKey, item.cartItemId)}
                          aria-label="Azalt"
                          className="quantity-btn"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.itemKey, item.cartItemId)}
                          aria-label="Artır"
                          className="quantity-btn"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-total-price">
                      <span className="total-label">Toplam</span>
                      <span className="total-price">
                        {((item.customizations?.calculatedPrice || item.price) * item.quantity).toFixed(2)} ₺
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-summary">
          <h3>Sipariş Özeti</h3>
          
          {/* Kupon Uygulama Bölümü */}
          <div className="coupon-section">
            {couponCode ? (
              <div className="coupon-applied">
                <div className="coupon-applied-header">
                  <div className="coupon-icon-small">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </div>
                  <div className="coupon-applied-info">
                    <span className="coupon-code-label">Kupon:</span>
                    <span className="coupon-code-value">{couponCode}</span>
                  </div>
                  <span className="coupon-discount">-{discountAmount.toFixed(2)} ₺</span>
                </div>
                <button
                  className="remove-coupon-btn"
                  onClick={handleRemoveCoupon}
                  disabled={isRemovingCoupon}
                >
                  {isRemovingCoupon ? 'Kaldırılıyor...' : 'Kaldır'}
                </button>
              </div>
            ) : (
              <div className="coupon-input-group">
                <input
                  type="text"
                  placeholder="Kupon kodu"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase())
                    setCouponError('')
                    setCouponSuccess('')
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyCoupon()
                    }
                  }}
                  className="coupon-input"
                  disabled={isApplyingCoupon || !isAuthenticated}
                />
                <button
                  className="apply-coupon-btn"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !isAuthenticated || !couponInput.trim()}
                >
                  {isApplyingCoupon ? '...' : 'Uygula'}
                </button>
              </div>
            )}
            {couponError && (
              <div className="coupon-message coupon-error">{couponError}</div>
            )}
            {couponSuccess && (
              <div className="coupon-message coupon-success">{couponSuccess}</div>
            )}
            {!isAuthenticated && !couponCode && (
              <div className="coupon-hint">Kupon için giriş yapın</div>
            )}
          </div>
          
          <div className="summary-divider"></div>

          <div className="summary-details">
            <div className="summary-row">
              <span>Ara Toplam</span>
              <span>{getCartSubtotal().toFixed(2)} ₺</span>
            </div>
            {discountAmount > 0 && (
              <div className="summary-row discount-row">
                <span>İndirim ({couponCode})</span>
                <span className="discount-amount">-{discountAmount.toFixed(2)} ₺</span>
              </div>
            )}
            <div className="summary-row">
              <span>Kargo</span>
              <span className="free-shipping">Ücretsiz</span>
            </div>
          </div>

          <div className="summary-total">
            <span>Toplam</span>
            <span>{getCartTotal().toFixed(2)} ₺</span>
          </div>

          <button className="checkout-btn" onClick={() => navigate('/checkout')}>
            Ödemeye Geç
          </button>
          
          <Link to="/" className="continue-shopping">
            Alışverişe Devam Et
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Cart


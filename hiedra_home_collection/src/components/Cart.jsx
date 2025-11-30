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

  useEffect(() => {
    refreshCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleRemoveFromCart = async (productId, itemKey = null, cartItemId = null) => {
    try {
      if (cartItemId && itemKey && itemKey.startsWith('backend_')) {
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
          await refreshCart()
          return
        }
      }
      
      removeFromCart(productId, itemKey)
    } catch (error) {
      console.error('Sepetten ürün silinirken hata:', error)
      removeFromCart(productId, itemKey)
    }
  }

  const handleUpdateQuantity = async (productId, newQuantity, itemKey = null, cartItemId = null) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId, itemKey, cartItemId)
      return
    }

    try {
      if (cartItemId && itemKey && itemKey.startsWith('backend_')) {
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
          await refreshCart()
          return
        }
      }
      
      updateQuantity(productId, newQuantity, itemKey)
    } catch (error) {
      console.error('Sepet miktarı güncellenirken hata:', error)
      updateQuantity(productId, newQuantity, itemKey)
    }
  }

  // Ürün ismini kısaltmak için yardımcı fonksiyon
  const truncateProductName = (name, maxLength = 40) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <div className="cart-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <h2>Sepetiniz Boş</h2>
          <p>Alışverişe başlamak için ürünlerimizi inceleyin</p>
          <Link to="/" className="cart-empty-btn">
            Alışverişe Başla
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="cart-wrapper">
        {/* Header */}
      <div className="cart-header">
        <h1>Sepetim</h1>
          <span className="cart-count">{cartItems.length} ürün</span>
          </div>
          
        {/* Main Content */}
        <div className="cart-main">
          {/* Left Column - Items */}
          <div className="cart-left-column">
            <div className="cart-items-wrapper">
              <div className="cart-items-list">
            {cartItems.map((item, index) => (
                  <div key={item.itemKey || `${item.id}_${index}`} className="cart-item-card">
                    <Link to={`/product/${item.id}`} className="cart-item-image-link">
                  <div className="cart-item-image">
                    <img src={item.image} alt={item.name} />
                  </div>
                </Link>
                
                    <div className="cart-item-info">
                      <Link to={`/product/${item.id}`} className="cart-item-name">
                        {truncateProductName(item.name, 60)}
                      </Link>
                      
                      {item.customizations && (
                        <div className="cart-item-specs">
                          <span>En: {item.customizations.en} cm</span>
                          <span>Boy: {item.customizations.boy} cm</span>
                          <span>Pile: {item.customizations.pileSikligi === 'pilesiz' ? 'Pilesiz' : item.customizations.pileSikligi}</span>
                        </div>
                      )}

                      <div className="cart-item-bottom">
                        <div className="cart-item-quantity">
                          <button
                            className="cart-qty-btn"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.itemKey, item.cartItemId)}
                            aria-label="Azalt"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.itemKey, item.cartItemId)}
                            aria-label="Artır"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                        </div>
                        <div className="cart-item-price">
                          {item.subtotal ? item.subtotal.toFixed(2) : ((item.customizations?.calculatedPrice || item.price) * item.quantity).toFixed(2)} ₺
                        </div>
                      </div>
                    </div>

                    <button
                      className="cart-item-remove"
                      onClick={() => handleRemoveFromCart(item.id, item.itemKey, item.cartItemId)}
                      aria-label="Kaldır"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
                      </div>
                    </div>

            {/* Coupon Section - Mobil için */}
            <div className="cart-coupon-section cart-coupon-mobile">
              {couponCode ? (
                <div className="cart-coupon-applied">
                  <span className="cart-coupon-code-text">{couponCode}</span>
                  <span className="cart-coupon-discount-text">-{discountAmount.toFixed(2)} ₺</span>
                        <button 
                    className="cart-coupon-remove-btn"
                    onClick={handleRemoveCoupon}
                    disabled={isRemovingCoupon}
                  >
                    {isRemovingCoupon ? '...' : 'Kaldır'}
                        </button>
                </div>
              ) : (
                <div className="cart-coupon-input-wrapper">
                  <input
                    type="text"
                    placeholder="İndirim Kodu Giriniz"
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
                    className="cart-coupon-input-simple"
                    disabled={isApplyingCoupon || !isAuthenticated}
                  />
                        <button 
                    className="cart-coupon-apply-btn"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !isAuthenticated || !couponInput.trim()}
                  >
                    {isApplyingCoupon ? '...' : 'Uygula'}
                        </button>
                </div>
              )}
              {couponError && (
                <div className="cart-coupon-message-error">{couponError}</div>
              )}
              {couponSuccess && (
                <div className="cart-coupon-message-success">{couponSuccess}</div>
              )}
          </div>
        </div>

          {/* Right Column - Summary (PC için) */}
          <div className="cart-right-column">
            <div className="cart-summary-card">
              <h3 className="cart-summary-title">Sipariş Özeti</h3>
          
              {/* Coupon Section - PC için */}
              <div className="cart-coupon-section cart-coupon-desktop">
            {couponCode ? (
                  <div className="cart-coupon-applied">
                    <span className="cart-coupon-code-text">{couponCode}</span>
                    <span className="cart-coupon-discount-text">-{discountAmount.toFixed(2)} ₺</span>
                <button
                      className="cart-coupon-remove-btn"
                  onClick={handleRemoveCoupon}
                  disabled={isRemovingCoupon}
                >
                      {isRemovingCoupon ? '...' : 'Kaldır'}
                </button>
              </div>
            ) : (
                  <div className="cart-coupon-input-wrapper">
                <input
                  type="text"
                      placeholder="İndirim Kodu Giriniz"
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
                      className="cart-coupon-input-simple"
                  disabled={isApplyingCoupon || !isAuthenticated}
                />
                <button
                      className="cart-coupon-apply-btn"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !isAuthenticated || !couponInput.trim()}
                >
                  {isApplyingCoupon ? '...' : 'Uygula'}
                </button>
              </div>
            )}
            {couponError && (
                  <div className="cart-coupon-message-error">{couponError}</div>
            )}
            {couponSuccess && (
                  <div className="cart-coupon-message-success">{couponSuccess}</div>
            )}
          </div>
          
              {/* Summary Details */}
              <div className="cart-summary-details">
                <div className="cart-summary-row">
              <span>Ara Toplam</span>
              <span>{getCartSubtotal().toFixed(2)} ₺</span>
            </div>
            {discountAmount > 0 && (
                  <div className="cart-summary-row cart-summary-discount">
                <span>İndirim ({couponCode})</span>
                    <span>-{discountAmount.toFixed(2)} ₺</span>
              </div>
            )}
                <div className="cart-summary-row">
              <span>Kargo</span>
                  <span className="cart-shipping-free">Ücretsiz</span>
            </div>
          </div>

              {/* Total */}
              <div className="cart-summary-total">
            <span>Toplam</span>
            <span>{getCartTotal().toFixed(2)} ₺</span>
          </div>

              {/* Actions */}
              <button className="cart-checkout-btn" onClick={() => navigate('/checkout')}>
                Sepeti Onayla
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
          </button>
              <Link to="/" className="cart-continue-link">
            Alışverişe Devam Et
          </Link>
            </div>
          </div>

          {/* Bottom Action Bar - Sadece Mobil için */}
          <div className="cart-bottom-bar">
            <div className="cart-total-info">
              <div className="cart-total-amount">{getCartTotal().toFixed(2)} ₺</div>
              <div className="cart-shipping-text">
                {discountAmount > 0 ? (
                  <>Kargo Bedava • Kupon ile <strong>{discountAmount.toFixed(2)} ₺</strong> kazandınız</>
                ) : (
                  <>Kargo Bedava</>
                )}
              </div>
            </div>
            <button className="cart-confirm-btn" onClick={() => navigate('/checkout')}>
              Sepeti Onayla
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart

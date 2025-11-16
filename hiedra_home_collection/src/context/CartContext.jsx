import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext()

// LocalStorage key
const CART_STORAGE_KEY = 'hiedra_cart'
const GUEST_USER_ID_KEY = 'guestUserId'
const CART_EXPIRY_DAYS = 30 // 30 gün süre
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// LocalStorage'dan sepeti yükle
const loadCartFromStorage = () => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) return []
    
    const cartData = JSON.parse(stored)
    
    // Süre kontrolü
    if (cartData.expiry && new Date().getTime() > cartData.expiry) {
      localStorage.removeItem(CART_STORAGE_KEY)
      return []
    }
    
    return cartData.items || []
  } catch (error) {
    console.error('Sepet yüklenirken hata:', error)
    return []
  }
}

// LocalStorage'a sepeti kaydet
const saveCartToStorage = (items) => {
  try {
    const expiryDate = new Date().getTime() + (CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    const cartData = {
      items,
      expiry: expiryDate,
      savedAt: new Date().getTime()
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData))
  } catch (error) {
    console.error('Sepet kaydedilirken hata:', error)
  }
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const { isAuthenticated, accessToken } = useAuth()
  // İlk yüklemede boş sepet - sadece backend'den yüklenecek
  const [cartItems, setCartItems] = useState([])
  const [isLoadingCart, setIsLoadingCart] = useState(false)

  // Backend'den sepeti çek
  const fetchCartFromBackend = async () => {
    try {
      setIsLoadingCart(true)
      
      // Giriş yapmış kullanıcı için guestUserId gönderme, sadece accessToken gönder
      // Guest kullanıcılar için guestUserId gönder
      let guestUserId = null
      if (!isAuthenticated || !accessToken) {
        guestUserId = localStorage.getItem(GUEST_USER_ID_KEY)
      }
      
      const url = `${API_BASE_URL}/cart${guestUserId ? `?guestUserId=${guestUserId}` : ''}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      })

      if (!response.ok) {
        // Response ok değilse, boş sepet döndür
        console.warn('Sepet backend\'den yüklenemedi, status:', response.status)
        setCartItems([])
        return []
      }

      const data = await response.json()
      
      if (data.isSuccess || data.success) {
        const cart = data.data || data
        // Backend'den gelen cart items'ı frontend formatına çevir
        const formattedItems = (cart.items || []).map(item => {
          // Subtotal ve unitPrice'ı doğru parse et
          const subtotal = item.subtotal ? (typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : parseFloat(item.subtotal.toString())) : 0
          const unitPrice = item.unitPrice ? (typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : parseFloat(item.unitPrice.toString())) : 0
          const productPrice = item.product?.price ? (typeof item.product.price === 'string' ? parseFloat(item.product.price) : parseFloat(item.product.price.toString())) : 0
          
          return {
            id: item.product?.id || item.productId,
            name: item.product?.name || item.productName || 'Ürün',
            price: unitPrice > 0 ? unitPrice : (productPrice > 0 ? productPrice : 0),
            image: item.product?.coverImageUrl || item.product?.image || '/images/perde1kapak.jpg',
            quantity: item.quantity || 1,
            category: item.product?.category?.name || item.product?.category || 'Genel',
            customizations: (item.width || item.height || item.pleatType) ? {
              en: item.width,
              boy: item.height,
              pileSikligi: item.pleatType,
              calculatedPrice: subtotal > 0 ? subtotal : (unitPrice > 0 ? unitPrice * (item.quantity || 1) : 0)
            } : null,
            itemKey: item.id ? `backend_${item.id}` : null,
            cartItemId: item.id // Backend'deki cart item ID'si
          }
        })
        setCartItems(formattedItems)
        // Backend'den gelen sepeti localStorage'a da kaydet (sync için)
        saveCartToStorage(formattedItems)
        return formattedItems
      } else {
        // Backend başarısız yanıt döndü
        console.warn('Sepet backend\'den yüklenemedi:', data.message)
        setCartItems([])
        return []
      }
    } catch (error) {
      console.error('Sepet backend\'den yüklenirken hata:', error)
      // Hata durumunda boş sepet döndür
      setCartItems([])
      return []
    } finally {
      setIsLoadingCart(false)
    }
  }

  const hasInitialized = useRef(false)
  const lastAuthState = useRef({ isAuthenticated, accessToken })

  // İlk yüklemede localStorage'dan sepeti yükle (hızlı başlangıç için)
  useEffect(() => {
    if (!hasInitialized.current) {
      const storedItems = loadCartFromStorage()
      if (storedItems && storedItems.length > 0) {
        setCartItems(storedItems)
      }
      hasInitialized.current = true
    }
  }, [])

  // Auth durumu değiştiğinde backend'den sepeti çek (sadece gerçek değişiklikte)
  useEffect(() => {
    const authChanged = 
      lastAuthState.current.isAuthenticated !== isAuthenticated ||
      lastAuthState.current.accessToken !== accessToken

    if (authChanged && hasInitialized.current) {
      // Auth durumu değişti, backend'den sepeti çek
      fetchCartFromBackend()
      lastAuthState.current = { isAuthenticated, accessToken }
    } else if (!hasInitialized.current) {
      // İlk yükleme - auth durumunu kaydet ama sepet çekme (localStorage'dan yüklendi)
      lastAuthState.current = { isAuthenticated, accessToken }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken])

  // Sepet her değiştiğinde localStorage'a kaydet (fallback için)
  useEffect(() => {
    saveCartToStorage(cartItems)
  }, [cartItems])

  const addToCart = (product, customizations = {}) => {
    setCartItems((prevItems) => {
      // Özel fiyatlandırma bilgileri varsa ekle
      const cartItem = {
        ...product,
        quantity: customizations.quantity || 1,
        customizations: customizations.en || customizations.boy || customizations.pileSikligi 
          ? {
              en: customizations.en,
              boy: customizations.boy,
              pileSikligi: customizations.pileSikligi,
              calculatedPrice: customizations.calculatedPrice || product.price
            }
          : null
      }
      
      // Özel fiyatlandırmalı ürünler için benzersiz key oluştur
      const itemKey = customizations.en || customizations.boy || customizations.pileSikligi
        ? `${product.id}_${customizations.en}_${customizations.boy}_${customizations.pileSikligi}`
        : product.id
      
      const existingItem = prevItems.find((item) => {
        if (item.customizations && cartItem.customizations) {
          return item.id === product.id && 
                 item.customizations.en === cartItem.customizations.en &&
                 item.customizations.boy === cartItem.customizations.boy &&
                 item.customizations.pileSikligi === cartItem.customizations.pileSikligi
        }
        return item.id === product.id && !item.customizations && !cartItem.customizations
      })
      
      if (existingItem) {
        return prevItems.map((item) => {
          const isSameItem = item.customizations && cartItem.customizations
            ? item.id === product.id && 
              item.customizations.en === cartItem.customizations.en &&
              item.customizations.boy === cartItem.customizations.boy &&
              item.customizations.pileSikligi === cartItem.customizations.pileSikligi
            : item.id === product.id && !item.customizations && !cartItem.customizations
          
          if (isSameItem) {
            return { 
              ...item, 
              quantity: item.quantity + (customizations.quantity || 1)
            }
          }
          return item
        })
      }
      return [...prevItems, { ...cartItem, itemKey }]
    })
  }

  const removeFromCart = (productId, itemKey = null) => {
    setCartItems((prevItems) => {
      if (itemKey) {
        // Özel fiyatlandırmalı ürün ise itemKey ile sil
        return prevItems.filter((item) => item.itemKey !== itemKey)
      }
      // Normal ürün ise id ile sil (ilk eşleşeni)
      return prevItems.filter((item) => item.id !== productId)
    })
  }

  const updateQuantity = (productId, quantity, itemKey = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, itemKey)
      return
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (itemKey) {
          // Özel fiyatlandırmalı ürün ise itemKey ile bul
          return item.itemKey === itemKey ? { ...item, quantity } : item
        }
        // Normal ürün ise id ile bul (ilk eşleşeni)
        return item.id === productId && !item.itemKey ? { ...item, quantity } : item
      })
    )
  }

  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  // Memoize edilmiş sepet toplamı - performans için
  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.customizations?.calculatedPrice || item.price
      return total + itemPrice * item.quantity
    }, 0)
  }, [cartItems])

  // Memoize edilmiş sepet ürün sayısı - performans için
  const getCartItemsCount = useCallback(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0)
  }, [cartItems])
  
  // Memoize edilmiş değerler - component'lerde kullanım için
  const cartTotal = useMemo(() => getCartTotal(), [getCartTotal])
  const cartItemsCount = useMemo(() => getCartItemsCount(), [getCartItemsCount])

  // Backend'den sepeti yeniden yükle
  const refreshCart = async () => {
    return await fetchCartFromBackend()
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemsCount,
        cartTotal,
        cartItemsCount,
        refreshCart,
        isLoadingCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}


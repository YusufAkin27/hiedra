import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import LazyImage from './LazyImage'
import CategoryHeader from './CategoryHeader'
import './CategoriesShowcase.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

/**
 * CategoriesShowcase Component
 * Kategorik ürünleri listeler ve her kategoriye ait alt ürünleri gösterir
 * 
 * @param {Array} categories - Kategoriler ve ürünleri içeren array
 * @param {Function} onProductClick - Ürün detay sayfasına gitmek için callback (opsiyonel)
 * @param {String} apiBaseUrl - API base URL (opsiyonel, default env'den alınır)
 */
const CategoriesShowcase = ({ 
  categories = [], 
  onProductClick,
  apiBaseUrl = API_BASE_URL 
}) => {
  const navigate = useNavigate()
  const { addToCart, refreshCart } = useCart()
  const { accessToken } = useAuth()
  const toast = useToast()
  
  const [selectedProducts, setSelectedProducts] = useState({})
  const [transitioningCategories, setTransitioningCategories] = useState({})
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedDetailImage, setSelectedDetailImage] = useState(null)
  const [detailModalPosition, setDetailModalPosition] = useState(null)
  
  // Modal state'leri
  const [isPricingModalOpen, setIsPricingModalOpen] = useState({})
  const [modalMeasurements, setModalMeasurements] = useState({})
  const [modalCalculatedPrices, setModalCalculatedPrices] = useState({})
  const [isModalCalculatingPrice, setIsModalCalculatingPrice] = useState({})
  const [isModalDropdownOpen, setIsModalDropdownOpen] = useState({})
  const [modalErrors, setModalErrors] = useState({})
  
  const pileOptions = [
    { value: '1x1', label: 'Seyrek (1x1)' },
    { value: '1x2', label: '1x2' },
    { value: '1x3', label: '1x3' }
  ]
  
  // İlk yüklemede her kategori için ilk ürünü seç
  useEffect(() => {
    if (categories && categories.length > 0) {
      const initialSelected = {}
      categories.forEach(category => {
        if (category.products && category.products.length > 0) {
          initialSelected[category.name] = category.products[0]
        }
      })
      setSelectedProducts(initialSelected)
    }
  }, [categories])
  
  // Ürün detay sayfasına git
  const handleProductClick = (productId) => {
    if (onProductClick) {
      onProductClick(productId)
    } else {
      navigate(`/product/${productId}`)
    }
  }
  
  // Kategori için ürün seç
  const handleColorSelect = (product, categoryName) => {
    setSelectedProducts(prev => ({
      ...prev,
      [categoryName]: product
    }))
    
    setTransitioningCategories(prev => ({
      ...prev,
      [categoryName]: true
    }))
    
    setTimeout(() => {
      setTransitioningCategories(prev => ({
        ...prev,
        [categoryName]: false
      }))
    }, 150)
  }
  
  // Fiyat hesaplama
  const calculatePrice = useCallback(async (categoryName, enValue, boyValue, pileValue) => {
    if (!enValue || !boyValue || !pileValue) {
      setModalCalculatedPrices(prev => {
        const newPrices = { ...prev }
        delete newPrices[categoryName]
        return newPrices
      })
      return Promise.resolve()
    }
    
    const selectedProduct = selectedProducts[categoryName]
    if (!selectedProduct || !selectedProduct.id) {
      setModalCalculatedPrices(prev => {
        const newPrices = { ...prev }
        delete newPrices[categoryName]
        return newPrices
      })
      return Promise.resolve()
    }
    
    const enNum = parseFloat(enValue)
    const boyNum = parseFloat(boyValue)
    
    if (isNaN(enNum) || isNaN(boyNum)) {
      return Promise.resolve()
    }
    
    // Pile çarpanını parse et
    let pileMultiplier = 1
    try {
      const parts = pileValue.split('x')
      if (parts.length === 2) {
        pileMultiplier = parseFloat(parts[1])
        if (isNaN(pileMultiplier)) pileMultiplier = 1
      }
    } catch (e) {
      pileMultiplier = 1
    }
    
    // Ürün fiyatını al
    let price = 0
    if (selectedProduct.price !== undefined && selectedProduct.price !== null) {
      if (typeof selectedProduct.price === 'number') {
        price = selectedProduct.price
      } else if (typeof selectedProduct.price === 'string') {
        price = parseFloat(selectedProduct.price) || 0
      }
    }
    
    // Fiyat hesapla: Metre Fiyatı * En (metre) * Pile Çarpanı
    const enMetre = enNum / 100.0
    const calculated = price * enMetre * pileMultiplier
    
    setModalCalculatedPrices(prev => ({
      ...prev,
      [categoryName]: calculated
    }))
    
    return Promise.resolve(calculated)
  }, [selectedProducts])
  
  // Modal aç/kapat
  const openPricingModal = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName)
    if (category && category.products && category.products.length > 0) {
      if (!selectedProducts[categoryName] || !selectedProducts[categoryName].id) {
        setSelectedProducts(prev => ({
          ...prev,
          [categoryName]: category.products[0]
        }))
      }
    }
    
    // Default pile değerini '1x1' olarak ayarla
    setModalMeasurements(prev => ({
      ...prev,
      [categoryName]: {
        ...prev[categoryName],
        pileSikligi: '1x1'
      }
    }))
    
    setIsPricingModalOpen(prev => ({
      ...prev,
      [categoryName]: true
    }))
    
    // Modal açıldığında modalın bulunduğu kategori bölümüne scroll et
    setTimeout(() => {
      // Önce kategori bölümünü bul
      const categorySection = document.querySelector(`[data-category-name="${categoryName}"]`)
      if (categorySection) {
        // Kategori bölümünü ekranın ortasına getir
        const rect = categorySection.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const targetY = scrollTop + rect.top - (window.innerHeight / 2) + (rect.height / 2)
        window.scrollTo({ top: targetY, behavior: 'smooth' })
      } else {
        // Eğer kategori bölümü bulunamazsa, modal overlay'e scroll et
        const modalOverlay = document.querySelector(`.pricing-modal-overlay-home`)
        if (modalOverlay) {
          // Modal overlay fixed olduğu için, sayfayı üst kısmına scroll et
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }, 150)
  }
  
  const closePricingModal = (categoryName) => {
    setIsPricingModalOpen(prev => ({
      ...prev,
      [categoryName]: false
    }))
    
    // Formu temizle
    setModalMeasurements(prev => {
      const newMeasurements = { ...prev }
      delete newMeasurements[categoryName]
      return newMeasurements
    })
    
    setModalCalculatedPrices(prev => {
      const newPrices = { ...prev }
      delete newPrices[categoryName]
      return newPrices
    })
    
    setModalErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[categoryName]
      return newErrors
    })
  }
  
  // Modal ölçü değişikliği
  const handleModalMeasurementChange = (categoryName, field, value) => {
    setModalMeasurements(prev => {
      const currentMeasurement = prev[categoryName] || {}
      
      // Eğer en veya boy değişiyorsa ve pileSikligi yoksa, default olarak '1x1' set et
      if ((field === 'en' || field === 'boy') && !currentMeasurement.pileSikligi) {
        return {
          ...prev,
          [categoryName]: {
            ...currentMeasurement,
            [field]: value,
            pileSikligi: '1x1'
          }
        }
      }
      
      return {
        ...prev,
        [categoryName]: {
          ...currentMeasurement,
          [field]: value
        }
      }
    })
    
    // Hata temizle
    setModalErrors(prev => {
      const newErrors = { ...prev }
      if (newErrors[categoryName]) {
        delete newErrors[categoryName][field]
        if (Object.keys(newErrors[categoryName]).length === 0) {
          delete newErrors[categoryName]
        }
      }
      return newErrors
    })
  }
  
  // Ölçü validasyonu ve fiyat hesaplama
  useEffect(() => {
    const timeouts = {}
    
    Object.keys(modalMeasurements).forEach(categoryName => {
      const measurement = modalMeasurements[categoryName]
      const selectedProduct = selectedProducts[categoryName]
      
      if (timeouts[categoryName]) {
        clearTimeout(timeouts[categoryName])
      }
      
      const pileValue = measurement?.pileSikligi || '1x1'
      if (measurement && measurement.en && measurement.boy && pileValue && selectedProduct && selectedProduct.id) {
        setIsModalCalculatingPrice(prev => ({ ...prev, [categoryName]: true }))
        timeouts[categoryName] = setTimeout(async () => {
          try {
            await calculatePrice(categoryName, measurement.en, measurement.boy, pileValue)
          } finally {
            setIsModalCalculatingPrice(prev => ({ ...prev, [categoryName]: false }))
          }
        }, 500)
      }
    })
    
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [modalMeasurements, selectedProducts, calculatePrice])
  
  // Modal'dan sepete ekle
  const handleModalAddToCart = async (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName)
    if (!category || !category.products || category.products.length === 0) {
      toast.error('Kategori veya ürün bulunamadı.')
      return
    }
    
    let selectedProduct = selectedProducts[categoryName]
    if (!selectedProduct || !selectedProduct.id) {
      selectedProduct = category.products[0]
    }
    
    if (!selectedProduct || !selectedProduct.id) {
      toast.error('Ürün bilgisi bulunamadı.')
      return
    }
    
    const measurement = modalMeasurements[categoryName]
    const calculatedPrice = modalCalculatedPrices[categoryName]
    
    const pileValue = measurement?.pileSikligi || '1x1'
    
    if (!measurement || !measurement.en || !measurement.boy) {
      toast.warning('Lütfen en ve boy değerlerini girin!')
      return
    }
    
    const enNum = parseFloat(measurement.en)
    const boyNum = parseFloat(measurement.boy)
    
    if (isNaN(enNum) || isNaN(boyNum)) {
      toast.warning('Lütfen geçerli sayısal değerler giriniz.')
      return
    }
    
    if (enNum < 50 || enNum > 1000) {
      toast.warning('Genişlik değeri 50 ile 1000 cm arasında olmalıdır.')
      return
    }
    
    if (boyNum < 30 || boyNum > 270) {
      toast.warning('Yükseklik değeri 30 ile 270 cm arasında olmalıdır.')
      return
    }
    
    let finalPrice = calculatedPrice
    if (!finalPrice || finalPrice <= 0) {
      let pileMultiplier = 1
      try {
        const parts = pileValue.split('x')
        if (parts.length === 2) {
          pileMultiplier = parseFloat(parts[1])
          if (isNaN(pileMultiplier)) pileMultiplier = 1
        }
      } catch (e) {
        pileMultiplier = 1
      }
      
      let price = 0
      if (selectedProduct.price !== undefined && selectedProduct.price !== null) {
        if (typeof selectedProduct.price === 'number') {
          price = selectedProduct.price
        } else if (typeof selectedProduct.price === 'string') {
          price = parseFloat(selectedProduct.price) || 0
        }
      }
      
      const enMetre = enNum / 100.0
      finalPrice = price * enMetre * pileMultiplier
      
      if (finalPrice <= 0) {
        toast.error('Fiyat hesaplanamadı. Lütfen ürün fiyatının doğru olduğundan emin olun.')
        return
      }
    }
    
    try {
      let guestUserId = null
      if (!accessToken) {
        guestUserId = localStorage.getItem('guestUserId')
        if (!guestUserId) {
          guestUserId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
          localStorage.setItem('guestUserId', guestUserId)
        }
      }
      
      const url = `${apiBaseUrl}/cart/items${guestUserId ? `?guestUserId=${guestUserId}` : ''}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: 1,
          width: enNum,
          height: boyNum,
          pleatType: pileValue
        })
      })
      
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('Response parse hatası:', parseError)
        throw new Error('Sunucudan geçersiz yanıt alındı')
      }
      
      if (response.ok) {
        const isSuccess = data.isSuccess === true || data.success === true || (data.data && data.data.id)
        
        if (isSuccess) {
          if (refreshCart) {
            try {
              await refreshCart()
            } catch (refreshError) {
              console.error('Sepet yenileme hatası:', refreshError)
            }
          }
          
          toast.success('Ürün sepete başarıyla eklendi!')
          closePricingModal(categoryName)
        } else {
          const errorMessage = data.message || data.error || 'Ürün sepete eklenemedi'
          throw new Error(errorMessage)
        }
      } else {
        const errorMessage = data.message || data.error || `Sunucu hatası: ${response.status} ${response.statusText}`
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', error)
      const errorMessage = error.message || 'Ürün sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.'
      toast.error(errorMessage)
    }
  }
  
  // Renk hex kodu al
  const getColorHex = (colorValue) => {
    if (!colorValue) return null
    
    const trimmed = colorValue.trim()
    
    if (trimmed.startsWith('#')) {
      const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      if (hexPattern.test(trimmed)) {
        return trimmed
      }
    }
    
    const colorMap = {
      'beyaz': '#ffffff', 'white': '#ffffff',
      'siyah': '#000000', 'black': '#000000',
      'kahverengi': '#8B4513', 'brown': '#8B4513',
      'krem': '#FFFDD0', 'cream': '#FFFDD0',
      'bej': '#F5F5DC', 'beige': '#F5F5DC',
      'gri': '#808080', 'gray': '#808080', 'grey': '#808080',
      'mavi': '#0000FF', 'blue': '#0000FF',
      'yeşil': '#008000', 'green': '#008000',
      'kırmızı': '#FF0000', 'red': '#FF0000',
      'sarı': '#FFFF00', 'yellow': '#FFFF00',
      'turuncu': '#FFA500', 'orange': '#FFA500',
      'pembe': '#FFC0CB', 'pink': '#FFC0CB',
      'mor': '#800080', 'purple': '#800080',
      'lacivert': '#000080', 'navy': '#000080',
      'turkuaz': '#40E0D0', 'turquoise': '#40E0D0',
      'bordo': '#800020', 'burgundy': '#800020',
    }
    const normalized = trimmed.toLowerCase()
    return colorMap[normalized] || trimmed
  }
  
  if (!categories || categories.length === 0) {
    return null
  }
  
  return (
    <div className="categories-showcase-home">
      {categories.map(category => {
        const selectedProduct = selectedProducts[category.name] || category.products[0]
        
        if (!selectedProduct) return null
        
        return (
          <div key={category.name} className="category-section-home" data-category-name={category.name}>
            <CategoryHeader 
              title={category.name} 
              subtitle={`${category.products.length} ürün`} 
            />
            
            <div className="category-product-showcase-home">
              {/* Sol taraf - Büyük fotoğraf */}
              <div className="product-image-section-home">
                <div 
                  className={`main-product-image-wrapper-home ${transitioningCategories[category.name] ? 'fade-out' : 'fade-in'}`}
                  onClick={() => handleProductClick(selectedProduct.id)}
                  style={{ cursor: 'pointer' }}
                  title={`${selectedProduct.name} - Ürün detayını görüntüle`}
                >
                  <LazyImage
                    src={selectedProduct.image || ''}
                    alt={selectedProduct.name}
                    className="main-product-image-home"
                    isLCP={category.name === categories[0]?.name}
                    fetchPriority={category.name === categories[0]?.name ? "high" : "auto"}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    width={600}
                    height={600}
                  />
                  {/* Detay fotoğraf önizleme */}
                  {selectedProduct.detailImages && selectedProduct.detailImages.length > 0 && selectedProduct.detailImages[0] && (
                    <div 
                      className="detail-image-preview-home"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Ürün fotoğrafı alanının pozisyonunu al
                        const imageWrapper = e.currentTarget.closest('.main-product-image-wrapper-home')
                        if (imageWrapper) {
                          const rect = imageWrapper.getBoundingClientRect()
                          setDetailModalPosition({
                            top: rect.top,
                            left: rect.left,
                            width: rect.width * 0.85, // %15 küçük
                            height: rect.height * 0.85 // %15 küçük
                          })
                        } else {
                          // Eğer wrapper bulunamazsa varsayılan pozisyon
                          setDetailModalPosition(null)
                        }
                        setSelectedDetailImage(selectedProduct.detailImages[0])
                        setIsDetailModalOpen(true)
                      }}
                      title="Detay fotoğrafını görüntüle"
                    >
                      <div className="detail-image-preview-overlay-home">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                      </div>
                      <LazyImage
                        src={selectedProduct.detailImages[0]}
                        alt={`${selectedProduct.name} detay`}
                        className="detail-image-preview-img-home"
                      />
                    </div>
                  )}
                </div>
                
                {/* Fiyatlandırma Modal */}
                {isPricingModalOpen[category.name] && selectedProduct && (
                  <div 
                    className="pricing-modal-overlay-home"
                    onClick={() => closePricingModal(category.name)}
                  >
                    <div 
                      className="pricing-modal-content-home"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        className="pricing-modal-close-home"
                        onClick={() => closePricingModal(category.name)}
                        aria-label="Kapat"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                      
                      <div className="pricing-modal-header-home">
                        <h3 className="pricing-modal-title-home">Özel Fiyatlandırma</h3>
                        <p className="pricing-modal-subtitle-home">{selectedProduct.name}</p>
                      </div>
                      
                      <div className="pricing-modal-form-home">
                        <div className="measurement-inputs-home">
                          <div className="measurement-input-group-home">
                            <label htmlFor={`modal-en-${category.name}`}>
                              Genişlik (cm) <span className="required">*</span>
                              <span className="form-hint">Min: 50 cm, Max: 1000 cm</span>
                            </label>
                            <input
                              id={`modal-en-${category.name}`}
                              type="number"
                              min="50"
                              max="1000"
                              step="0.1"
                              placeholder="Örn: 200"
                              value={modalMeasurements[category.name]?.en || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                handleModalMeasurementChange(category.name, 'en', value)
                              }}
                              className={`measurement-input-home ${modalErrors[category.name]?.en ? 'input-error' : ''}`}
                              required
                            />
                            {modalErrors[category.name]?.en && (
                              <span className="error-message-home">{modalErrors[category.name].en}</span>
                            )}
                          </div>
                          <div className="measurement-input-group-home">
                            <label htmlFor={`modal-boy-${category.name}`}>
                              Yükseklik (cm) <span className="required">*</span>
                              <span className="form-hint">Min: 30 cm, Max: 270 cm</span>
                            </label>
                            <input
                              id={`modal-boy-${category.name}`}
                              type="number"
                              min="30"
                              max="270"
                              step="0.1"
                              placeholder="Örn: 250"
                              value={modalMeasurements[category.name]?.boy || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                handleModalMeasurementChange(category.name, 'boy', value)
                              }}
                              className={`measurement-input-home ${modalErrors[category.name]?.boy ? 'input-error' : ''}`}
                              required
                            />
                            {modalErrors[category.name]?.boy && (
                              <span className="error-message-home">{modalErrors[category.name].boy}</span>
                            )}
                          </div>
                          <div className="measurement-input-group-home">
                            <label htmlFor={`modal-pile-${category.name}`}>
                              Pile Sıklığı <span className="required">*</span>
                            </label>
                            <div className="custom-dropdown-home">
                              <button
                                type="button"
                                className="dropdown-trigger-home"
                                onClick={() => setIsModalDropdownOpen(prev => ({
                                  ...prev,
                                  [category.name]: !prev[category.name]
                                }))}
                                onBlur={() => setTimeout(() => setIsModalDropdownOpen(prev => ({
                                  ...prev,
                                  [category.name]: false
                                })), 200)}
                              >
                                <span className="dropdown-selected-home">
                                  {pileOptions.find(opt => opt.value === (modalMeasurements[category.name]?.pileSikligi || '1x1'))?.label || pileOptions[0].label}
                                </span>
                                <svg 
                                  className={`dropdown-arrow-home ${isModalDropdownOpen[category.name] ? 'open' : ''}`}
                                  width="20" 
                                  height="20" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2"
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                              {isModalDropdownOpen[category.name] && (
                                <div className="dropdown-menu-home">
                                  {pileOptions.map(option => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      className="dropdown-option-home"
                                      onClick={() => {
                                        handleModalMeasurementChange(category.name, 'pileSikligi', option.value)
                                        setIsModalDropdownOpen(prev => ({
                                          ...prev,
                                          [category.name]: false
                                        }))
                                      }}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {isModalCalculatingPrice[category.name] && (
                          <div className="price-calculating-home">
                            <span>Fiyat hesaplanıyor...</span>
                          </div>
                        )}
                        
                        {modalCalculatedPrices[category.name] && modalCalculatedPrices[category.name] > 0 && (
                          <div className="calculated-price-section-home">
                            <div className="price-breakdown-home">
                              <span>Toplam Fiyat:</span>
                              <span className="price-value-home">{modalCalculatedPrices[category.name].toFixed(2)} ₺</span>
                            </div>
                          </div>
                        )}
                        
                        <button
                          className="add-to-cart-btn-home"
                          onClick={() => handleModalAddToCart(category.name)}
                          disabled={
                            !modalMeasurements[category.name]?.en || 
                            !modalMeasurements[category.name]?.boy || 
                            !!modalErrors[category.name]?.en ||
                            !!modalErrors[category.name]?.boy
                          }
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                          </svg>
                          Sepete Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sağ taraf - Ürün detayları ve renk seçenekleri */}
              <div className={`product-details-section-home ${transitioningCategories[category.name] ? 'fade-out' : 'fade-in'}`}>
                <div className="product-header-info-home">
                  <h2 className="product-title-home">{selectedProduct.name}</h2>
                  {selectedProduct.productCode && (
                    <p className="product-code-home">Kod: {selectedProduct.productCode}</p>
                  )}
                  {selectedProduct.averageRating > 0 && (
                    <div 
                      className="product-rating-section-home review-link"
                      onClick={() => {
                        if (onProductClick) {
                          onProductClick(selectedProduct.id)
                        } else {
                          navigate(`/product/${selectedProduct.id}#reviews`)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="product-rating-stars-home">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill={i < Math.floor(selectedProduct.averageRating) ? "#FFD700" : "none"} stroke="#FFD700" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                      {selectedProduct.averageRating > 0 && (
                        <span className="product-rating-value-home">{selectedProduct.averageRating.toFixed(1)}</span>
                      )}
                      {selectedProduct.reviewCount > 0 && (
                        <span className="product-review-count-home">({selectedProduct.reviewCount} değerlendirme)</span>
                      )}
                    </div>
                  )}
                  <div className="product-price-large-home">
                    <span className="price-label-home">Metre Fiyatı:</span>
                    <span className="price-value-home">{selectedProduct.price.toFixed(2)} ₺</span>
                  </div>
                </div>
                
                {/* Renk Seçimi */}
                {category.products.length > 0 && (
                  <div className="color-selection-section-home">
                    <h3 className="color-selection-title-home">RENK SEÇİMİ</h3>
                    <div className="color-options-home">
                      {category.products.map(product => {
                        const colorHex = getColorHex(product.color)
                        return (
                          <button
                            key={product.id}
                            className={`color-option-home ${selectedProduct.id === product.id ? 'active' : ''}`}
                            onClick={() => handleColorSelect(product, category.name)}
                            title={product.color || product.name}
                          >
                            <div 
                              className="color-swatch-home"
                              style={{ 
                                backgroundColor: colorHex || '#ccc'
                              }}
                            >
                              {selectedProduct.id === product.id && (
                                <div className="color-checkmark-home">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className="color-product-name-home">{product.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                
                {/* Sepete Ekle Butonu */}
                <div className="product-actions-home">
                  <button
                    className="open-pricing-modal-btn-home"
                    onClick={() => openPricingModal(category.name)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    Sepete Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* Detay Fotoğraf Modal */}
      {isDetailModalOpen && selectedDetailImage && (
        <div 
          className="detail-modal-overlay-home"
          onClick={() => {
            setIsDetailModalOpen(false)
            setDetailModalPosition(null)
          }}
        >
          <div 
            className="detail-modal-content-home"
            onClick={(e) => e.stopPropagation()}
            style={detailModalPosition ? {
              position: 'fixed',
              top: `${detailModalPosition.top + (detailModalPosition.height * 0.075)}px`,
              left: `${detailModalPosition.left + (detailModalPosition.width * 0.075)}px`,
              width: `${detailModalPosition.width}px`,
              height: `${detailModalPosition.height}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              margin: 0,
              transform: 'none',
              border: 'none',
              boxShadow: 'none',
              padding: 0
            } : {}}
          >
            <button 
              className="detail-modal-close-home"
              onClick={() => {
                setIsDetailModalOpen(false)
                setDetailModalPosition(null)
              }}
              aria-label="Kapat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <LazyImage
              src={selectedDetailImage}
              alt="Ürün detay"
              className="detail-modal-image-home"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoriesShowcase


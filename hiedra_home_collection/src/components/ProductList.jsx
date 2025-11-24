import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import LazyImage from './LazyImage'
import Loading from './Loading'
import SEO from './SEO'
import CategoryHeader from './CategoryHeader'
import './ProductList.css'

// Ürün Özellikleri Accordion Component - React.memo ile optimize et
const ProductSpecificationsAccordion = React.memo(({ selectedProduct }) => {
  const [isOpen, setIsOpen] = useState(false)

  const hasSpecs = selectedProduct.mountingType || selectedProduct.material || 
    selectedProduct.lightTransmittance || 
    (selectedProduct.pieceCount && selectedProduct.pieceCount > 0) || 
    selectedProduct.usageArea || selectedProduct.color

  if (!hasSpecs) return null

  return (
    <div className="product-specifications-accordion">
      <button 
        className="specifications-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="specifications-title">Ürün Özellikleri</h4>
        <svg 
          className={`accordion-arrow ${isOpen ? 'open' : ''}`}
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
      {isOpen && (
        <div className="specifications-content">
          <div className="specifications-grid">
            {selectedProduct.mountingType && (
              <div className="spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <div className="spec-content">
                  <span className="spec-label">Takma Şekli</span>
                  <span className="spec-value">{selectedProduct.mountingType}</span>
                </div>
              </div>
            )}
            {selectedProduct.material && (
              <div className="spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <div className="spec-content">
                  <span className="spec-label">Materyal</span>
                  <span className="spec-value">{selectedProduct.material}</span>
                </div>
              </div>
            )}
            {selectedProduct.lightTransmittance && (
              <div className="spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <div className="spec-content">
                  <span className="spec-label">Işık Geçirgenliği</span>
                  <span className="spec-value">{selectedProduct.lightTransmittance}</span>
                </div>
              </div>
            )}
            {selectedProduct.pieceCount && selectedProduct.pieceCount > 0 && (
              <div className="spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <div className="spec-content">
                  <span className="spec-label">Parça Sayısı</span>
                  <span className="spec-value">{selectedProduct.pieceCount} Adet</span>
                </div>
              </div>
            )}
            {selectedProduct.usageArea && (
              <div className="spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="spec-content">
                  <span className="spec-label">Kullanım Alanı</span>
                  <span className="spec-value">{selectedProduct.usageArea}</span>
                </div>
              </div>
            )}
            {selectedProduct.color && (
              <div className="spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
                <div className="spec-content">
                  <span className="spec-label">Renk</span>
                  <span className="spec-value">{selectedProduct.color}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const ProductList = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { addToCart, refreshCart } = useCart()
  const { accessToken } = useAuth()
  const toast = useToast()
  
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState({})
  const [transitioningCategories, setTransitioningCategories] = useState({}) // Her kategori için geçiş durumu
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedDetailImage, setSelectedDetailImage] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  // Modal state'leri
  const [isPricingModalOpen, setIsPricingModalOpen] = useState({}) // Her kategori için modal durumu
  const [modalMeasurements, setModalMeasurements] = useState({}) // Modal içindeki ölçüler
  const [modalCalculatedPrices, setModalCalculatedPrices] = useState({}) // Modal içindeki hesaplanan fiyatlar
  const [isModalCalculatingPrice, setIsModalCalculatingPrice] = useState({}) // Modal içindeki hesaplama durumu
  const [isModalDropdownOpen, setIsModalDropdownOpen] = useState({}) // Modal içindeki dropdown durumu
  const [modalErrors, setModalErrors] = useState({}) // Modal içindeki hata mesajları
  
  const pileOptions = [
    { value: '1x1', label: 'Seyrek (1x1)' },
    { value: '1x2', label: '1x2' },
    { value: '1x3', label: '1x3' }
  ]
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  
  // URL'den arama terimini al
  const searchParams = new URLSearchParams(location.search)
  const searchTerm = searchParams.get('search') || ''
  
  // URL'den arama terimini input'a set et
  useEffect(() => {
    if (searchTerm) {
      setSearchInput(searchTerm)
    }
  }, [searchTerm])

  // Backend'den ürünleri ve kategorileri çek
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        
        // Hem ürünleri hem de kategorileri paralel olarak çek
        // Performans için sayfalama kullan - ilk 100 ürün yeterli
        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/products?page=0&size=100`),
          fetch(`${API_BASE_URL}/categories`)
        ])
        
        if (productsResponse.ok) {
          const data = await productsResponse.json()
          if (data.isSuccess || data.success) {
            // Backend Page<Product> döndürüyor, content array'ini al
            let productsData = []
            if (data.data) {
              // Page yapısı: { content: [...], totalElements: ..., totalPages: ..., ... }
              if (data.data.content && Array.isArray(data.data.content)) {
                productsData = data.data.content
              } else if (Array.isArray(data.data)) {
                // Eğer direkt array ise
                productsData = data.data
              }
            }
            
            if (!Array.isArray(productsData)) {
              console.warn('productsData array değil, boş array kullanılıyor:', productsData)
              productsData = []
            }
            
            // Kategorileri de çek ve ürünlere ekle
            let categoriesMap = {}
            if (categoriesResponse.ok) {
              const categoriesData = await categoriesResponse.json()
              if (categoriesData.isSuccess || categoriesData.success) {
                const categoriesList = categoriesData.data || []
                categoriesList.forEach(cat => {
                  categoriesMap[cat.id] = {
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-') || ''
                  }
                })
              }
            }
            // Backend formatını frontend formatına çevir ve sadece stokta olan ürünleri filtrele
            const formattedProducts = productsData
              .filter(product => (product.quantity || 0) > 0) // Sadece stokta olan ürünler
              .map(product => {
                const categoryId = product.category?.id || null
                const categoryInfo = categoryId && categoriesMap[categoryId] 
                  ? categoriesMap[categoryId]
                  : {
                      id: categoryId,
                      name: product.category?.name || 'Genel',
                      slug: product.category?.slug || product.category?.name?.toLowerCase().replace(/\s+/g, '-') || ''
                    }
                
                return {
                  id: product.id,
                  name: product.name,
                  price: product.price ? parseFloat(product.price) : 0,
                  image: product.coverImageUrl || '/images/perde1kapak.jpg',
                  detailImages: product.detailImageUrl ? [product.detailImageUrl] : [],
                  description: product.description || product.shortDescription || '',
                  shortDescription: product.shortDescription || '',
                  category: categoryInfo.name,
                  categoryId: categoryInfo.id,
                  categorySlug: categoryInfo.slug,
                  color: product.color || '',
                  inStock: (product.quantity || 0) > 0,
                  productCode: product.productCode || product.code || product.sku || '',
                  quantity: product.quantity || 0,
                  // Ürün özellikleri
                  mountingType: product.mountingType || '',
                  material: product.material || '',
                  lightTransmittance: product.lightTransmittance || '',
                  pieceCount: product.pieceCount || null,
                  usageArea: product.usageArea || '',
                  // İstatistikler
                  reviewCount: product.reviewCount || 0,
                  averageRating: product.averageRating || 0,
                  viewCount: product.viewCount || 0,
                }
              })
            setProducts(formattedProducts)
          } else {
            console.warn('Ürünler yüklenemedi:', data.message || 'Bilinmeyen hata')
          }
        } else {
          console.error('API yanıtı başarısız:', response.status, response.statusText)
          try {
            const errorData = await response.json().catch(() => ({}))
            console.error('Hata detayı:', errorData)
          } catch (e) {
            console.error('Hata yanıtı parse edilemedi')
          }
        }
      } catch (error) {
        console.error('Ürünler yüklenirken hata:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Kategorilere göre grupla
  const categories = useMemo(() => {
    const categoryMap = {}
    
    products.forEach(product => {
      const categoryName = product.category
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          id: product.categoryId,
          slug: product.categorySlug,
          products: []
        }
      }
      categoryMap[categoryName].products.push(product)
    })
    
    // Kategorileri alfabetik sırala ve her kategorinin ürünlerini sırala
    return Object.values(categoryMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(cat => ({
        ...cat,
        products: cat.products.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter(cat => cat.products.length > 0) // Sadece ürünü olan kategorileri göster
  }, [products])

  // Gelişmiş arama fonksiyonu - useCallback ile memoize et
  const searchInProduct = useCallback((product, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return false
    
    const searchLower = searchTerm.toLowerCase().trim()
    const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0)
    
    // Eğer tek kelime ise, her alanda ara
    if (searchWords.length === 1) {
      const word = searchWords[0]
      return (
        (product.name && product.name.toLowerCase().includes(word)) ||
        (product.description && product.description.toLowerCase().includes(word)) ||
        (product.shortDescription && product.shortDescription.toLowerCase().includes(word)) ||
        (product.category && product.category.toLowerCase().includes(word)) ||
        (product.productCode && product.productCode.toLowerCase().includes(word)) ||
        (product.color && product.color.toLowerCase().includes(word)) ||
        (product.material && product.material.toLowerCase().includes(word)) ||
        (product.mountingType && product.mountingType.toLowerCase().includes(word)) ||
        (product.usageArea && product.usageArea.toLowerCase().includes(word)) ||
        (product.lightTransmittance && product.lightTransmittance.toLowerCase().includes(word))
      )
    }
    
    // Çok kelimeli aramada, tüm kelimelerin eşleşmesi gerekir
    const searchableText = [
      product.name,
      product.description,
      product.shortDescription,
      product.category,
      product.productCode,
      product.color,
      product.material,
      product.mountingType,
      product.usageArea,
      product.lightTransmittance
    ].filter(Boolean).join(' ').toLowerCase()
    
    return searchWords.every(word => searchableText.includes(word))
  }, [])

  // Arama sonuçlarını filtrele ve sırala - optimize edilmiş
  const filteredProducts = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') return products
    
    const searchLower = searchTerm.toLowerCase().trim()
    const results = products.filter(product => searchInProduct(product, searchTerm))
    
    // Sonuçları öncelik sırasına göre sırala
    return results.sort((a, b) => {
      // İsim eşleşmesi en yüksek öncelik
      const aNameMatch = a.name.toLowerCase().includes(searchLower)
      const bNameMatch = b.name.toLowerCase().includes(searchLower)
      if (aNameMatch && !bNameMatch) return -1
      if (!aNameMatch && bNameMatch) return 1
      
      // Ürün kodu eşleşmesi ikinci öncelik
      const aCodeMatch = a.productCode && a.productCode.toLowerCase().includes(searchLower)
      const bCodeMatch = b.productCode && b.productCode.toLowerCase().includes(searchLower)
      if (aCodeMatch && !bCodeMatch) return -1
      if (!aCodeMatch && bCodeMatch) return 1
      
      // İsim başlangıcı eşleşmesi üçüncü öncelik
      const aStartsWith = a.name.toLowerCase().startsWith(searchLower)
      const bStartsWith = b.name.toLowerCase().startsWith(searchLower)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      
      // Alfabetik sıralama
      return a.name.localeCompare(b.name)
    })
  }, [products, searchTerm, searchInProduct])
  
  // Arama önerileri oluştur - optimize edilmiş (debounce ile)
  const generateSearchSuggestions = useMemo(() => {
    if (!searchInput || searchInput.trim().length < 2) return []
    
    const inputLower = searchInput.toLowerCase().trim()
    const suggestions = new Set()
    
    // Performans için sadece ilk 50 üründe ara
    const limitedProducts = products.slice(0, 50)
    
    // Ürün isimlerinden öneriler
    limitedProducts.forEach(product => {
      if (product.name && product.name.toLowerCase().includes(inputLower)) {
        const words = product.name.split(/\s+/)
        words.forEach(word => {
          if (word.toLowerCase().startsWith(inputLower) && word.length > inputLower.length) {
            suggestions.add(word)
          }
        })
      }
    })
    
    // Kategori önerileri
    limitedProducts.forEach(product => {
      if (product.category && product.category.toLowerCase().includes(inputLower)) {
        suggestions.add(product.category)
      }
    })
    
    // Renk önerileri
    limitedProducts.forEach(product => {
      if (product.color && product.color.toLowerCase().includes(inputLower)) {
        suggestions.add(product.color)
      }
    })
    
    // Ürün kodları
    limitedProducts.forEach(product => {
      if (product.productCode && product.productCode.toLowerCase().includes(inputLower)) {
        suggestions.add(product.productCode)
      }
    })
    
    return Array.from(suggestions).slice(0, 8)
  }, [searchInput, products])
  
  // Arama önerilerini güncelle - debounce ile optimize et (main-thread work azaltma)
  useEffect(() => {
    if (searchInput.trim().length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce - 300ms bekle, main-thread'i bloklamadan
    const timeoutId = setTimeout(() => {
      setSearchSuggestions(generateSearchSuggestions)
      setShowSuggestions(true)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput, generateSearchSuggestions])

  // Ürün detay sayfasına git
  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`)
  }

  const handleReviewNavigation = useCallback((productId) => {
    if (!productId) return
    navigate(`/product/${productId}#reviews`)
  }, [navigate])

  const handleReviewKeyDown = useCallback((event, productId, callback) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback(productId)
    }
  }, [])

  // Kategori için ürün seç - hızlı ve smooth animasyon
  const handleColorSelect = (product, categoryName) => {
    // Hemen yeni ürünü seç (gecikme yok)
    setSelectedProducts(prev => ({
      ...prev,
      [categoryName]: product
    }))
    
    // Sadece kısa bir fade efekti için
    setTransitioningCategories(prev => ({
      ...prev,
      [categoryName]: true
    }))
    
    // Çok kısa süre sonra animasyonu bitir
    setTimeout(() => {
      setTransitioningCategories(prev => ({
        ...prev,
        [categoryName]: false
      }))
    }, 150)
  }


  // Fiyat hesaplama - Metre Fiyatı * En (metre) * Pile Çarpanı
  const calculatePrice = React.useCallback(async (categoryName, enValue, boyValue, pileValue) => {
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
    
    
    if (isNaN(enNum) || isNaN(boyNum) || enNum < 50 || enNum > 1000 || boyNum < 30 || boyNum > 270) {
      setModalCalculatedPrices(prev => {
        const newPrices = { ...prev }
        delete newPrices[categoryName]
        return newPrices
      })
      return Promise.resolve()
    }

    // Pile çarpanını parse et (1x2 -> 2, 1x3 -> 3, 1x1 -> 1)
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

    // Formül: Metre Fiyatı * En (metre) * Pile Çarpanı
    // Boy fiyatlandırmaya dahil değil, sadece en kullanılıyor
    const enMetre = enNum / 100.0
    let price = 0
    
    // Ürün fiyatını al - farklı formatları kontrol et
    if (selectedProduct.price !== undefined && selectedProduct.price !== null) {
      if (typeof selectedProduct.price === 'number') {
        price = selectedProduct.price
      } else if (typeof selectedProduct.price === 'string') {
        price = parseFloat(selectedProduct.price) || 0
      }
    }
    
    const calculated = price * enMetre * pileMultiplier
    
    setModalCalculatedPrices(prev => ({
      ...prev,
      [categoryName]: Math.round(calculated * 100) / 100
    }))
    
    return Promise.resolve(calculated)
  }, [selectedProducts])

  // Modal aç/kapat
  const openPricingModal = (categoryName) => {
    // Kategoriyi bul ve ürün seçimini kontrol et
    const category = categories.find(cat => cat.name === categoryName)
    if (category && category.products && category.products.length > 0) {
      // Eğer bu kategori için ürün seçilmemişse, ilk ürünü seç
      if (!selectedProducts[categoryName] || !selectedProducts[categoryName].id) {
        setSelectedProducts(prev => ({
          ...prev,
          [categoryName]: category.products[0]
        }))
      }
    }
    
    setIsPricingModalOpen(prev => ({
      ...prev,
      [categoryName]: true
    }))
    // Modal açıldığında varsayılan değerleri set et
    setModalMeasurements(prev => ({
      ...prev,
      [categoryName]: {
        en: '',
        boy: '',
        pileSikligi: '1x1'
      }
    }))
    // Body scroll'unu engelle
    document.body.style.overflow = 'hidden'
    // İlk input'a focus yap
    setTimeout(() => {
      const firstInput = document.getElementById(`modal-en-${categoryName}`)
      if (firstInput) {
        firstInput.focus()
      }
    }, 100)
  }

  const closePricingModal = (categoryName) => {
    setIsPricingModalOpen(prev => {
      const updated = { ...prev, [categoryName]: false }
      // Eğer hiç modal açık değilse body scroll'unu aç
      if (!Object.values(updated).some(v => v)) {
        document.body.style.overflow = ''
      }
      return updated
    })
    // Modal kapandığında temizle
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
  
  // Component unmount olduğunda body scroll'unu aç
  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  
  // ESC tuşu ile modal kapat
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        Object.keys(isPricingModalOpen).forEach(categoryName => {
          if (isPricingModalOpen[categoryName]) {
            closePricingModal(categoryName)
          }
        })
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isPricingModalOpen])

  // Validasyon fonksiyonu
  const validateMeasurement = (field, value) => {
    if (!value || value.trim() === '') {
      return { isValid: false, message: '' } // Boş değer için hata gösterme, sadece required kontrolü
    }
    
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      return { isValid: false, message: 'Lütfen geçerli bir sayı giriniz.' }
    }
    
    if (field === 'en') {
      if (numValue < 50) {
        return { isValid: false, message: 'Genişlik en az 50 cm olmalıdır.' }
      }
      if (numValue > 1000) {
        return { isValid: false, message: 'Genişlik en fazla 1000 cm olabilir.' }
      }
    } else if (field === 'boy') {
      if (numValue < 30) {
        return { isValid: false, message: 'Yükseklik en az 30 cm olmalıdır.' }
      }
      if (numValue > 270) {
        return { isValid: false, message: 'Yükseklik en fazla 270 cm olabilir.' }
      }
    }
    
    return { isValid: true, message: '' }
  }

  // Modal içinde ölçü değişikliği
  const handleModalMeasurementChange = (categoryName, field, value) => {
    const newValue = value || ''
    
    // Validasyon yap
    const validation = validateMeasurement(field, newValue)
    
    // Ölçüyü güncelle
    setModalMeasurements(prev => ({
      ...prev,
      [categoryName]: {
        ...prev[categoryName],
        [field]: newValue
      }
    }))
    
    // Hata durumunu güncelle
    setModalErrors(prev => ({
      ...prev,
      [categoryName]: {
        ...prev[categoryName],
        [field]: validation.isValid ? '' : validation.message
      }
    }))
  }
  
  // Modal içinde ölçü değişikliklerinde fiyat hesapla - useEffect ile debounce
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
          } catch (error) {
            console.error('Fiyat hesaplama hatası:', error)
          } finally {
            setIsModalCalculatingPrice(prev => ({ ...prev, [categoryName]: false }))
          }
        }, 300)
      } else {
        setModalCalculatedPrices(prev => {
          const newPrices = { ...prev }
          delete newPrices[categoryName]
          return newPrices
        })
        setIsModalCalculatingPrice(prev => ({ ...prev, [categoryName]: false }))
      }
    })
    
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [modalMeasurements, selectedProducts, calculatePrice])

  // Modal'dan sepete ekle - Backend API ile
  const handleModalAddToCart = async (categoryName) => {
    // Kategoriyi bul
    const category = categories.find(cat => cat.name === categoryName)
    if (!category || !category.products || category.products.length === 0) {
      toast.error('Kategori veya ürün bulunamadı.')
      return
    }
    
    // Seçili ürünü al, yoksa kategori'nin ilk ürününü kullan
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

    // Fiyat kontrolü - eğer hesaplanmamışsa tekrar hesapla
    let finalPrice = calculatedPrice
    if (!finalPrice || finalPrice <= 0) {
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
      finalPrice = price * enMetre * pileMultiplier
      
      if (finalPrice <= 0) {
        toast.error('Fiyat hesaplanamadı. Lütfen ürün fiyatının doğru olduğundan emin olun.')
        return
      }
    }

    try {
      // Giriş yapmış kullanıcı için guestUserId gönderme, sadece accessToken gönder
      // Guest kullanıcılar için guestUserId gönder
      let guestUserId = null
      if (!accessToken) {
        guestUserId = localStorage.getItem('guestUserId')
        if (!guestUserId) {
          guestUserId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
          localStorage.setItem('guestUserId', guestUserId)
        }
      }

      // Backend'e sepete ekleme isteği
      const url = `${API_BASE_URL}/cart/items${guestUserId ? `?guestUserId=${guestUserId}` : ''}`

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

      // Response'u parse et
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('Response parse hatası:', parseError)
        throw new Error('Sunucudan geçersiz yanıt alındı')
      }

      if (response.ok) {
        // Backend response formatını kontrol et
        const isSuccess = data.isSuccess === true || data.success === true || (data.data && data.data.id)
        
        if (isSuccess) {
          // Backend'den sepeti yeniden yükle
          if (refreshCart) {
            try {
              await refreshCart()
            } catch (refreshError) {
              console.error('Sepet yenileme hatası:', refreshError)
              // Sepet yenileme hatası kritik değil, devam et
            }
          }
          
          // Başarı mesajı göster
          toast.success('Ürün sepete başarıyla eklendi!')
          
          // Modal'ı kapat ve formu temizle
          closePricingModal(categoryName)
        } else {
          // Response ok ama success false
          const errorMessage = data.message || data.error || 'Ürün sepete eklenemedi'
          throw new Error(errorMessage)
        }
      } else {
        // HTTP error status
        const errorMessage = data.message || data.error || `Sunucu hatası: ${response.status} ${response.statusText}`
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', error)
      const errorMessage = error.message || 'Ürün sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.'
      toast.error(errorMessage)
    }
  }

  // Color field'ı direkt hex kodu içeriyor, kontrol et ve döndür
  const getColorHex = (colorValue) => {
    if (!colorValue) return null
    
    const trimmed = colorValue.trim()
    
    // Eğer zaten hex formatındaysa (# ile başlıyorsa) direkt kullan
    if (trimmed.startsWith('#')) {
      const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      if (hexPattern.test(trimmed)) {
        return trimmed
      }
    }
    
    // Hex formatında değilse, renk adı olabilir - fallback için renk map'i
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
    return colorMap[normalized] || trimmed // Eğer map'te yoksa direkt değeri döndür (hex olabilir)
  }

  // Arama terimini vurgula
  const highlightSearchTerm = (text, term) => {
    if (!term || !text) return text
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="search-highlight">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    )
  }

  // Arama modunda tüm ürünleri göster
  if (searchTerm) {
    return (
      <div className="product-list-container">
        <SEO
          title={`"${searchTerm}" Arama Sonuçları`}
          description={`"${searchTerm}" için ${filteredProducts.length} ürün bulundu`}
          url={`/?search=${encodeURIComponent(searchTerm)}`}
        />
        <header className="product-list-header-premium">
          <div className="section-header-content-premium">
            <div className="section-header-badge-premium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span>Arama Sonuçları</span>
            </div>
            <h1 className="section-header-title-premium">
              "{searchTerm}" için {filteredProducts.length} sonuç bulundu
            </h1>
            <p className="section-header-subtitle-premium">
              Aradığınız kriterlere uygun ürünler aşağıda listelenmiştir
            </p>
          </div>
        </header>

        {filteredProducts.length === 0 ? (
          <div className="no-products-search">
            <div className="no-products-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h2>Ürün Bulunamadı</h2>
            <p>"{searchTerm}" için aradığınız kriterlere uygun ürün bulunamadı.</p>
            <div className="no-products-suggestions">
              <p>Öneriler:</p>
              <ul>
                <li>Farklı anahtar kelimeler deneyin</li>
                <li>Yazım hatalarını kontrol edin</li>
                <li>Daha genel terimler kullanın</li>
                <li>Ürün kodunu doğrudan arayın</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="product-grid-search">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className="product-card-search" 
                onClick={() => handleProductClick(product.id)}
              >
                <div className="product-card-search-image">
                  <LazyImage src={product.image} alt={product.name} />
                  {product.inStock && (
                    <div className="product-stock-badge-search">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Stokta
                    </div>
                  )}
                </div>
                <div className="product-card-info">
                  <div className="product-card-category">{product.category}</div>
                  <h3>{highlightSearchTerm(product.name, searchTerm)}</h3>
                  {product.productCode && (
                    <div className="product-card-code">Kod: {highlightSearchTerm(product.productCode, searchTerm)}</div>
                  )}
                  {product.color && (
                    <div className="product-card-color">Renk: {product.color}</div>
                  )}
                  <p className="product-price">Başlangıç: {product.price.toFixed(2)} ₺</p>
                  {(product.averageRating > 0 || product.reviewCount > 0) && (
                    <div
                      className="product-card-rating review-link"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleReviewNavigation(product.id)}
                      onKeyDown={(e) => handleReviewKeyDown(e, product.id, handleReviewNavigation)}
                      aria-label={`${product.name} yorumlarını görüntüle`}
                    >
                      <div className="rating-stars-small">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill={star <= Math.floor(product.averageRating) ? "#FFD700" : "none"}
                            stroke={star <= Math.floor(product.averageRating) ? "#FFD700" : "#ddd"}
                            strokeWidth="2"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                      <span className="rating-value-small">{product.averageRating.toFixed(1)}</span>
                      {product.reviewCount > 0 && (
                        <span className="review-count-small">({product.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Arama fonksiyonu
  const handleSearch = (e) => {
    e.preventDefault()
    const trimmedInput = searchInput.trim()
    if (trimmedInput) {
      setIsSearching(true)
      setShowSuggestions(false)
      navigate(`/?search=${encodeURIComponent(trimmedInput)}`)
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setIsSearching(false), 500)
    }
  }
  
  // Öneri seçildiğinde
  const handleSuggestionClick = (suggestion) => {
    setSearchInput(suggestion)
    setShowSuggestions(false)
    setIsSearching(true)
    navigate(`/?search=${encodeURIComponent(suggestion)}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => setIsSearching(false), 500)
  }
  
  // Arama input değiştiğinde
  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value)
  }
  
  // Dışarı tıklandığında önerileri kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.hero-search-form') && !event.target.closest('.search-suggestions')) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className="product-list-container">
        <Loading size="large" text="Ürünler yükleniyor..." variant="page" />
      </div>
    )
  }

  // Structured Data for SEO - Product Collection
  const productCollectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Perde Satış - Tül Perde ve Modern Perde Modelleri',
    description: 'Perde satış ve tül perde fiyatları için Hiedra Perde. Zebra perde, Klasik perde, Stor perde, Jaluzi perde ve tül perde modelleri. Uygun perde fiyatı ile kaliteli perde satış.',
    url: typeof window !== 'undefined' ? window.location.href : 'https://hiedra.com',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.slice(0, 10).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          description: product.description || product.shortDescription || '',
          image: product.image,
          category: product.category,
          brand: {
            '@type': 'Brand',
            name: 'Hiedra Perde'
          },
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'TRY',
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: typeof window !== 'undefined' ? `${window.location.origin}/product/${product.id}` : `https://hiedra.com/product/${product.id}`
          }
        }
      }))
    }
  }

  // FAQ Schema for SEO
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Perde satış fiyatları nasıl belirlenir?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Perde satış fiyatları metre fiyatı, en ölçüsü ve pile sıklığına göre hesaplanır. Tül perde fiyatları ve diğer perde modelleri için sitemizdeki fiyatlandırma aracını kullanabilirsiniz.'
        }
      },
      {
        '@type': 'Question',
        name: 'Tül perde fiyatı nedir?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tül perde fiyatı ürün modeline, ölçüye ve pile sıklığına göre değişiklik gösterir. Detaylı tül perde fiyatları için ürün sayfalarını ziyaret edebilirsiniz.'
        }
      },
      {
        '@type': 'Question',
        name: 'Perde satış için hangi ölçüler geçerlidir?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Perde satış için genişlik 50-1000 cm, yükseklik 30-270 cm arasında özel ölçü perde siparişi verebilirsiniz.'
        }
      },
      {
        '@type': 'Question',
        name: 'Zebra perde fiyatı ne kadar?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Zebra perde fiyatı metre fiyatı, en ölçüsü ve pile sıklığına göre hesaplanır. Güncel zebra perde fiyatları için ürün sayfalarını inceleyebilirsiniz.'
        }
      },
      {
        '@type': 'Question',
        name: 'Perde teslimat süresi ne kadar?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Perde teslimat süresi siparişinizin hazırlanması ve kargo süresine bağlıdır. Genellikle 3-7 iş günü içinde perde teslimatı yapılmaktadır.'
        }
      }
    ]
  }

  return (
    <div className="product-list-container">
      <SEO
        title="Perde Satış - Tül Perde Fiyatları | Zebra Perde, Klasik Perde | Hiedra Perde"
        description="Perde satış ve tül perde fiyatları için Hiedra Perde. Zebra perde, Klasik perde, Stor perde, Jaluzi perde ve tül perde modelleri. Uygun perde fiyatı, kaliteli perde kumaşı, hızlı perde teslimat. Bingöl perde satışı, Erzurum perde satışı. Online perde satış için doğru adres!"
        keywords="perde satış, tül perde, perde tül, perde fiyatı, tül perde fiyatı, perde tül fiyatı, zebra perde, zebra perde satış, zebra perde fiyatı, klasik perde, klasik perde satış, klasik perde fiyatı, stor perde, stor perde satış, stor perde fiyatı, jaluzi perde, jaluzi perde satış, jaluzi perde fiyatı, tül perde satış, online perde satış, perde satın al, perdeler, perde fiyatları, uygun perde, uygun perde fiyatları, kaliteli perde, kaliteli perde satış, bingöl perde, bingöl perde satışı, bingöl tül perde, erzurum perde, erzurum perde satışı, erzurum tül perde, perde modelleri, perde çeşitleri, perde koleksiyonu, perde kumaşı, perde kumaşları, perde ölçüsü, özel ölçü perde, perde sipariş, perde teslimat, metre perde fiyatı, m2 perde fiyatı"
        url="/"
        structuredData={[productCollectionSchema, faqSchema]}
      />
      
      {/* Modern Hero Section */}
      <section className="hero-section-modern">
        <div className="hero-content-modern">
          <h1 className="hero-title-modern">Perde Satış - Tül Perde ve Modern Perde Modelleri</h1>
          <h2 className="hero-subtitle-modern">Uygun Perde Fiyatları ile Toptan Fiyatına Perakende Satış</h2>
          
          {/* Arama Çubuğu */}
          <form className="hero-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="hero-search-input"
              placeholder="Ürünün ismini, kodunu veya etiketini yazınız."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="hero-search-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </form>
          
          {/* İstatistik */}
          <div className="hero-statistics">
            <div className="stat-number">53.000+</div>
            <div className="stat-label">Mutlu Müşteri Siparişi</div>
          </div>
          
          {/* Açıklama */}
          <div className="hero-description">
            <h3 className="description-title">Özelleştirilebilir Perde Modelleri - Perde Satış ve Tül Perde Fiyatları</h3>
            <p className="description-text">
              Perde satış ve tül perde fiyatları için Hiedra Perde. En, boy, Pile ve bir çok ayrıntılı seçenek ile kendi perdenizi oluşturun. 
              Uygun perde fiyatı ile zebra perde, klasik perde, stor perde, jaluzi perde ve tül perde modelleri. 
              Türkiye'de ilk defa Villa, tiny house, bungalov ve benzeri yerler için 
              Çatı eğimli perdeler ile size özel seçenekler. Kaliteli perde kumaşı, hızlı perde teslimat.
            </p>
          </div>
        </div>
      </section>
      
      {/* Premium Section Header */}
      <header className="product-list-header-premium">
        <div className="section-header-content-premium">
          <div className="section-header-badge-premium">
            <span>Koleksiyonlarımız</span>
          </div>
          <h1 className="section-header-title-premium">Perde Satış - Özenle Seçilmiş Perde Modelleri</h1>
          <p className="section-header-subtitle-premium">
            Perde satış ve tül perde fiyatları için özenle seçilmiş perde koleksiyonlarımızı keşfedin. Zebra perde, klasik perde, stor perde, jaluzi perde ve tül perde modelleri. Uygun perde fiyatı ile kaliteli perde satış.
          </p>
        </div>
      </header>

      <div className="categories-showcase-home">
        {categories.map(category => {
          const selectedProduct = selectedProducts[category.name] || category.products[0]
          
          return (
            <div key={category.name} className="category-section-home">
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
                      isLCP={category.name === categories[0]?.name} // İlk kategori LCP
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
                          e.stopPropagation() // Ana fotoğrafın onClick'ini tetikleme
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
                </div>

                {/* Sağ taraf - Ürün detayları ve renk seçenekleri */}
                <div className={`product-details-section-home ${transitioningCategories[category.name] ? 'fade-out' : 'fade-in'}`}>
                  <div className="product-header-info-home">
                    <h2 className="product-title-home">{selectedProduct.name}</h2>
                    {selectedProduct.productCode && (
                      <p className="product-code-home">Kod: {selectedProduct.productCode}</p>
                    )}
                    {/* Yıldız Puanı */}
                    {(selectedProduct.averageRating > 0 || selectedProduct.reviewCount > 0) && (
                      <div
                        className="product-rating-section-home review-link"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleReviewNavigation(selectedProduct.id)}
                        onKeyDown={(e) => handleReviewKeyDown(e, selectedProduct.id, handleReviewNavigation)}
                        aria-label="Ürün yorumlarını görüntüle"
                      >
                        <div className="product-rating-stars-home">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const filled = star <= Math.floor(selectedProduct.averageRating);
                            const halfFilled = !filled && star - 0.5 <= selectedProduct.averageRating;
                            const gradientId = `half-gradient-home-${selectedProduct.id}-${star}`;
                            return (
                              <svg
                                key={star}
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill={filled ? "#FFD700" : halfFilled ? `url(#${gradientId})` : "none"}
                                stroke={filled || halfFilled ? "#FFD700" : "#ddd"}
                                strokeWidth="2"
                              >
                                {halfFilled && (
                                  <defs>
                                    <linearGradient id={gradientId}>
                                      <stop offset="50%" stopColor="#FFD700" />
                                      <stop offset="50%" stopColor="transparent" />
                                    </linearGradient>
                                  </defs>
                                )}
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            );
                          })}
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

                  {/* Ürün Özellikleri - CategoryDetail gibi tüm özellikler */}
                  {(selectedProduct.mountingType || selectedProduct.material || selectedProduct.lightTransmittance || 
                    selectedProduct.usageArea || selectedProduct.pieceCount || selectedProduct.color) && (
                    <div className="product-features-home">
                      {selectedProduct.mountingType && (
                        <div className="product-feature-item-home">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <span>Takma Şekli: {selectedProduct.mountingType}</span>
                        </div>
                      )}
                      {selectedProduct.material && (
                        <div className="product-feature-item-home">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                          </svg>
                          <span>Materyal: {selectedProduct.material}</span>
                        </div>
                      )}
                      {selectedProduct.lightTransmittance && (
                        <div className="product-feature-item-home">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                          </svg>
                          <span>Işık Geçirgenliği: {selectedProduct.lightTransmittance}</span>
                        </div>
                      )}
                      {selectedProduct.usageArea && (
                        <div className="product-feature-item-home">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>Kullanım Alanı: {selectedProduct.usageArea}</span>
                        </div>
                      )}
                      {selectedProduct.pieceCount && selectedProduct.pieceCount > 0 && (
                        <div className="product-feature-item-home">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                          <span>Parça Sayısı: {selectedProduct.pieceCount} Adet</span>
                        </div>
                      )}
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
      </div>

      {/* Fiyatlandırma Modal'ları */}
      {categories.map(category => {
        const selectedProduct = selectedProducts[category.name] || category.products[0]
        if (!isPricingModalOpen[category.name] || !selectedProduct) return null
        
        return (
          <div 
            key={`pricing-modal-${category.name}`}
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
                          strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {isModalDropdownOpen[category.name] && (
                        <div className="dropdown-menu-home">
                          {pileOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`dropdown-option-home ${(modalMeasurements[category.name]?.pileSikligi || '1x1') === option.value ? 'selected' : ''}`}
                              onClick={() => {
                                handleModalMeasurementChange(category.name, 'pileSikligi', option.value)
                                setIsModalDropdownOpen(prev => ({
                                  ...prev,
                                  [category.name]: false
                                }))
                              }}
                            >
                              <span className="option-label-home">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="form-info-home">
                      Pile sıklığı fiyatlandırmayı etkiler: 1x1 (x1), 1x2 (x2), 1x3 (x3)
                    </p>
                  </div>
                </div>
                
                <button
                  className="add-to-cart-btn-home"
                  onClick={() => handleModalAddToCart(category.name)}
                  disabled={
                    !modalMeasurements[category.name]?.en || 
                    !modalMeasurements[category.name]?.boy || 
                    !modalMeasurements[category.name]?.pileSikligi ||
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
        )
      })}

      {/* Detay Fotoğraf Modal */}
      {isDetailModalOpen && selectedDetailImage && (
        <div 
          className="detail-modal-overlay-home"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div 
            className="detail-modal-content-home"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="detail-modal-close-home"
              onClick={() => setIsDetailModalOpen(false)}
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

export default ProductList

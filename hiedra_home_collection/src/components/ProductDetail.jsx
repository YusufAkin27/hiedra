import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import LazyImage from './LazyImage'
import SEO from './SEO'
import './ProductDetail.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const { accessToken } = useAuth()
  const location = useLocation()
  const reviewSectionRef = useRef(null)
  const loadMoreReviewsRef = useRef(null)
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [addToCartError, setAddToCartError] = useState('')
  const [addToCartSuccess, setAddToCartSuccess] = useState(false)
  
  // Fiyatlandırma formu state'leri
  const [en, setEn] = useState('')
  const [boy, setBoy] = useState('')
  const [pileSikligi, setPileSikligi] = useState('1x1')
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [allProducts, setAllProducts] = useState([]) // Tüm ürünler (ilgili ürünler için)
  const [formErrors, setFormErrors] = useState({ en: '', boy: '' }) // Form hata mesajları
  const [activeImageIndex] = useState(0)
  const [reviews, setReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState(null)
  const [reviewPageMeta, setReviewPageMeta] = useState({
    page: 0,
    size: 6,
    hasNext: true,
    totalElements: 0,
    totalPages: 0
  })
  const [isFetchingReviews, setIsFetchingReviews] = useState(false)
  const [reviewSortOption, setReviewSortOption] = useState('LATEST')
  const [withImageReviewsOnly, setWithImageReviewsOnly] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [modalImageSrc, setModalImageSrc] = useState(null)
  const galleryImages = useMemo(() => {
    if (!product) return []
    const images = []
    if (product.image) {
      images.push(product.image)
    }
    if (Array.isArray(product.detailImages)) {
      product.detailImages
        .filter(Boolean)
        .forEach(img => images.push(img))
    }
    return images
      .filter(Boolean)
      .filter((img, index, arr) => arr.indexOf(img) === index)
  }, [product])

  const currentImage = galleryImages[activeImageIndex] || galleryImages[0] || product?.image || '/images/perde1kapak.jpg'
  const detailImage = galleryImages.length > 1 ? galleryImages[1] : null

  useEffect(() => {
    if (isDetailModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDetailModalOpen])

  const openDetailModal = useCallback((imageSrc) => {
    if (!imageSrc) return
    setModalImageSrc(imageSrc)
    setIsDetailModalOpen(true)
  }, [])

  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false)
    setModalImageSrc(null)
  }, [])

  const pileOptions = [
    { value: '1x1', label: 'Pilesiz (1x1)' },
    { value: '1x2', label: '1x2'  },
    { value: '1x3', label: '1x3' }
  ]

  // Renk hex kodunu parse et
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
    return colorMap[normalized] || trimmed
  }

  // Backend'den ürün bilgilerini çek
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setProduct(null) // Önce temizle
        
        // ID'yi parse et
        const productId = typeof id === 'string' ? parseInt(id, 10) : id
        
        if (isNaN(productId)) {
          console.error('Geçersiz ürün ID:', id)
          setIsLoading(false)
          return
        }

        console.log('Ürün detayı çekiliyor, ID:', productId)
        
        const response = await fetch(`${API_BASE_URL}/products/${productId}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Backend yanıtı:', data)
          
          if (data.isSuccess || data.success) {
            const productData = data.data || data
            
            // Price'ı number'a çevir
            const price = typeof productData.price === 'number' 
              ? productData.price 
              : parseFloat(productData.price) || 0
            
            setProduct({
              ...productData,
              id: productData.id || productId,
              name: productData.name || 'Ürün',
              price: price,
              // Backend'den gelen veriyi frontend formatına çevir
              image: productData.coverImageUrl || productData.image || '/images/perde1kapak.jpg',
              detailImages: productData.detailImageUrl 
                ? (Array.isArray(productData.detailImageUrl) 
                    ? productData.detailImageUrl 
                    : [productData.detailImageUrl])
                : [],
              inStock: (productData.quantity || 0) > 0,
              category: productData.category?.name || productData.category || 'Genel',
              // Ürün özellikleri
              mountingType: productData.mountingType || '',
              material: productData.material || '',
              lightTransmittance: productData.lightTransmittance || '',
              pieceCount: productData.pieceCount || null,
              usageArea: productData.usageArea || '',
              color: productData.color || '',
              // İstatistikler
              reviewCount: productData.reviewCount || 0,
              averageRating: productData.averageRating || 0,
              viewCount: productData.viewCount || 0,
            })
          } else {
            console.error('Backend yanıt hatası:', data)
            setProduct(null)
          }
        } else if (response.status === 404) {
          console.error('Ürün bulunamadı (404)')
          setProduct(null)
        } else {
          console.error('HTTP hatası:', response.status)
          setProduct(null)
        }
      } catch (error) {
        console.error('Ürün yüklenirken hata:', error)
        setProduct(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  useEffect(() => {
    if (!product) return
    if (location.hash === '#reviews') {
      // Yorumlar yüklendikten sonra scroll yap
      if (reviewSectionRef.current && !isFetchingReviews && reviews.length > 0) {
        setTimeout(() => {
          reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      } else if (reviewSectionRef.current && !isFetchingReviews) {
        // Yorumlar yoksa bile scroll yap
        setTimeout(() => {
          reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [location.hash, product, isFetchingReviews, reviews.length])

  const handleScrollToReviews = useCallback(() => {
    if (reviewSectionRef.current) {
      reviewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const formatReviewDate = useCallback((value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('tr-TR')
  }, [])

  const fetchReviews = useCallback(async ({ page = 0, reset = false } = {}) => {
    if (!product?.id) return Promise.resolve()
    setIsFetchingReviews(true)
    if (reset) {
      setReviewError('')
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: '6',
        sort: reviewSortOption,
        withImagesOnly: withImageReviewsOnly ? 'true' : 'false'
      })

      const response = await fetch(`${API_BASE_URL}/reviews/product/${product.id}/page?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Yorumlar getirilemedi.')
      }

      const payload = await response.json()
      if (!(payload?.isSuccess || payload?.success)) {
        throw new Error(payload?.message || 'Yorumlar getirilemedi.')
      }

      const pageData = payload?.data || {}
      setReviews(prev => reset ? (pageData.items || []) : [...prev, ...(pageData.items || [])])
      setReviewSummary(pageData.summary || null)
      setReviewPageMeta({
        page: pageData.page ?? page,
        size: pageData.size ?? 6,
        hasNext: pageData.hasNext ?? false,
        totalElements: pageData.totalElements ?? 0,
        totalPages: pageData.totalPages ?? 0
      })
      return Promise.resolve()
    } catch (error) {
      console.error('Yorumlar yüklenirken hata:', error)
      setReviewError(error.message || 'Yorumlar yüklenirken bir hata oluştu.')
      return Promise.reject(error)
    } finally {
      setIsFetchingReviews(false)
    }
  }, [product?.id, reviewSortOption, withImageReviewsOnly])

  useEffect(() => {
    if (!product?.id) return
    setReviews([])
    setReviewSummary(null)
    setReviewPageMeta(prev => ({
      ...prev,
      page: 0,
      hasNext: true,
      totalElements: 0,
      totalPages: 0
    }))
    fetchReviews({ page: 0, reset: true }).then(() => {
      // Yorumlar yüklendikten sonra, eğer #reviews hash'i varsa scroll yap
      if (location.hash === '#reviews' && reviewSectionRef.current) {
        setTimeout(() => {
          reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      }
    }).catch(() => {
      // Hata olsa bile scroll yap
      if (location.hash === '#reviews' && reviewSectionRef.current) {
        setTimeout(() => {
          reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      }
    })
  }, [product?.id, reviewSortOption, withImageReviewsOnly, fetchReviews, location.hash])

  useEffect(() => {
    const observerTarget = loadMoreReviewsRef.current
    if (!observerTarget || !reviewPageMeta.hasNext) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingReviews) {
        fetchReviews({ page: reviewPageMeta.page + 1, reset: false })
      }
    }, { rootMargin: '200px' })

    observer.observe(observerTarget)
    return () => observer.disconnect()
  }, [reviewPageMeta.hasNext, reviewPageMeta.page, isFetchingReviews, fetchReviews])

  // Tüm ürünleri çek (ilgili ürünler için)
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`)
        if (response.ok) {
          const data = await response.json()
          if (data.isSuccess || data.success) {
            const productsData = data.data || []
            const formattedProducts = productsData.map(p => ({
              id: p.id,
              name: p.name,
              price: p.price ? parseFloat(p.price) : 0,
              image: p.coverImageUrl || '/images/perde1kapak.jpg',
              description: p.description || '',
              category: p.category?.name || 'Genel',
              inStock: (p.quantity || 0) > 0,
            }))
            setAllProducts(formattedProducts)
          }
        }
      } catch (error) {
        console.error('Ürünler yüklenirken hata:', error)
      }
    }
    fetchAllProducts()
  }, [])

  // Ana fotoğraf sabit kalacak, geçiş yok

  // Fallback fiyat hesaplama (backend'e ulaşılamazsa)
  const calculatePriceFallback = React.useCallback((enNum, pileValue) => {
    if (!product || !product.price) {
      setCalculatedPrice(0)
      return
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
    
    // Backend ile aynı mantık: metreCinsindenEn * pileCarpani * pricePerMeter
    const enMetre = enNum / 100.0
    const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0
    const calculated = price * enMetre * pileMultiplier
    setCalculatedPrice(Math.round(calculated * 100) / 100) // 2 ondalık basamak
  }, [product])

  // Backend'den fiyat hesaplama
  const calculatePrice = React.useCallback(async (enValue, boyValue, pileValue) => {
    if (!enValue || !boyValue || !pileValue || !product || !product.id) {
      setCalculatedPrice(0)
      return
    }
    
    const enNum = parseFloat(enValue)
    const boyNum = parseFloat(boyValue)
    
    if (isNaN(enNum) || isNaN(boyNum) || enNum <= 0 || boyNum <= 0) {
      setCalculatedPrice(0)
      return
    }

    setIsCalculatingPrice(true)

    try {
      const response = await fetch(`${API_BASE_URL}/products/${product.id}/calculate-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width: enNum,
          height: boyNum,
          pleatType: pileValue,
          price: product.price
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          const calculatedPriceValue = parseFloat(data.data.calculatedPrice)
          setCalculatedPrice(isNaN(calculatedPriceValue) ? 0 : calculatedPriceValue)
        } else {
          // Backend hatası durumunda fallback hesaplama
          calculatePriceFallback(enNum, pileValue)
        }
      } else {
        // HTTP hatası durumunda fallback hesaplama
        calculatePriceFallback(enNum, pileValue)
      }
    } catch (error) {
      console.error('Fiyat hesaplama hatası:', error)
      // Hata durumunda fallback hesaplama
      calculatePriceFallback(enNum, pileValue)
    } finally {
      setIsCalculatingPrice(false)
    }
  }, [product, calculatePriceFallback])
  
  // Validasyon fonksiyonu
  const validateMeasurement = (field, value) => {
    if (!value || value.trim() === '') {
      return { isValid: false, message: '' }
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

  // Form değişikliklerinde fiyatı hesapla ve validasyon yap
  useEffect(() => {
    // Validasyon
    const enValidation = validateMeasurement('en', en)
    const boyValidation = validateMeasurement('boy', boy)
    
    setFormErrors({
      en: enValidation.message,
      boy: boyValidation.message
    })
    
    if (product && product.id && en && boy && pileSikligi && enValidation.isValid && boyValidation.isValid) {
      // Debounce ile backend'e istek at
      const timeoutId = setTimeout(() => {
        calculatePrice(en, boy, pileSikligi)
      }, 500) // 500ms bekle

      return () => clearTimeout(timeoutId)
    } else {
      setCalculatedPrice(0)
    }
  }, [en, boy, pileSikligi, product?.id, product?.price, calculatePrice])

  const totalReviewCount = reviewSummary?.totalReviewCount ?? product?.reviewCount ?? 0
  const derivedAverageRating = reviewSummary?.averageRating ?? product?.averageRating ?? 0
  const imageReviewCount = reviewSummary?.imageReviewCount ?? 0
  const ratingBars = useMemo(() => {
    const breakdown = reviewSummary?.breakdown || {}
    const segments = [
      { label: '5', count: breakdown.fiveStars || 0 },
      { label: '4', count: breakdown.fourStars || 0 },
      { label: '3', count: breakdown.threeStars || 0 },
      { label: '2', count: breakdown.twoStars || 0 },
      { label: '1', count: breakdown.oneStar || 0 }
    ]
    const total = segments.reduce((sum, item) => sum + item.count, 0) || totalReviewCount
    return segments.map(item => ({
      ...item,
      percentage: total ? Math.round((item.count / total) * 100) : 0
    }))
  }, [reviewSummary, totalReviewCount])

  // Structured Data for Product - useMemo ile sarmala
  const structuredData = useMemo(() => {
    if (!product || !product.id || !product.name || !product.price) return null
    
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${product.name || 'Ürün'} - Perde Satış`,
      description: `${product.description || ''} Perde satış için Hiedra'yı ziyaret edin. Kaliteli kumaş, uygun fiyat, hızlı teslimat.`,
      image: product.image ? (product.image.startsWith('http') ? product.image : `${typeof window !== 'undefined' ? window.location.origin : 'https://hiedra.com'}${product.image}`) : '/images/perde1kapak.jpg',
      sku: `PROD-${product.id}`,
      mpn: `HIEDRA-${product.id}`,
      category: `${product.category || 'Genel'} Perde`,
      brand: {
        '@type': 'Brand',
        name: 'Hiedra Perde'
      },
      manufacturer: {
        '@type': 'Organization',
        name: 'Hiedra Perde'
      },
      offers: {
        '@type': 'Offer',
        url: typeof window !== 'undefined' ? window.location.href : `https://hiedra.com/product/${product.id}`,
        priceCurrency: 'TRY',
        price: (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0).toString(),
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: 'Hiedra Perde'
        },
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'TRY',
          price: (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0).toString(),
          unitCode: 'MTR',
          unitText: 'metre'
        }
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (product.averageRating || derivedAverageRating || 4.8).toString(),
        reviewCount: (product.reviewCount || totalReviewCount || 0).toString(),
        bestRating: '5',
        worstRating: '1'
      },
      review: product.reviewCount > 0 ? [
        {
          '@type': 'Review',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: (product.averageRating || 5).toString(),
            bestRating: '5'
          },
          author: {
            '@type': 'Person',
            name: 'Müşteri'
          },
          reviewBody: `${product.name || 'Ürün'} ürünü kaliteli ve hızlı teslimat ile memnun kaldık.`
        }
      ] : []
    }
  }, [product])

  // Sepete ekleme handler'ı
  const handleAddToCart = React.useCallback(async (e) => {
    e.preventDefault()
    setAddToCartError('')
    setAddToCartSuccess(false)
    
    // Validasyon
    if (!en || !boy) {
      setAddToCartError('Lütfen en ve boy değerlerini giriniz.')
      return
    }
    
    const enNum = parseFloat(en)
    const boyNum = parseFloat(boy)
    
    if (isNaN(enNum) || isNaN(boyNum)) {
      setAddToCartError('Lütfen geçerli sayısal değerler giriniz.')
      return
    }
    
    if (enNum < 50 || enNum > 1000) {
      setAddToCartError('Genişlik değeri 50 ile 1000 cm arasında olmalıdır.')
      return
    }
    
    if (boyNum < 30 || boyNum > 270) {
      setAddToCartError('Yükseklik değeri 30 ile 270 cm arasında olmalıdır.')
      return
    }
    
    if (!product || !product.id) {
      setAddToCartError('Ürün bilgisi bulunamadı.')
      return
    }

    setIsAddingToCart(true)

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
      const response = await fetch(`${API_BASE_URL}/cart/items${guestUserId ? `?guestUserId=${guestUserId}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: quantity,
          width: enNum,
          height: boyNum,
          pleatType: pileSikligi
        })
      })

      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        // Backend'den sepeti yeniden yükle
        if (refreshCart) {
          await refreshCart()
        }
        
        setAddToCartSuccess(true)
        // Başarı mesajı göster, sayfa değişimi yok
      } else {
        throw new Error(data.message || 'Ürün sepete eklenemedi')
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', error)
      setAddToCartError(error.message || 'Ürün sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.')
      // Fallback mekanizması kaldırıldı - sadece API ile çalışıyoruz
    } finally {
      setIsAddingToCart(false)
    }
  }, [product, quantity, en, boy, pileSikligi, calculatedPrice, accessToken, refreshCart])
  
  // Early returns - tüm hooks'tan sonra
  if (isLoading) {
    return (
      <div className="product-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Ürün bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="product-detail-container">
        <div className="product-not-found">
          <h2>Ürün bulunamadı</h2>
          <p>Aradığınız ürün mevcut değil veya silinmiş olabilir.</p>
          <Link to="/" className="back-to-home-btn">Ana Sayfaya Dön</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="product-detail-container">
      {product && (
        <SEO
          title={`${product.name} - ${product.category} Perde Satış | Fiyat: ${product.price} ₺`}
          description={`${product.description} ${product.category} perde satış için en uygun fiyat: ${product.price} ₺. Kaliteli kumaş, hızlı teslimat. Perde satın al.`}
          keywords={`${product.name}, ${product.category} perde satış, ${product.category.toLowerCase()} perde, perde satış, online perde satış, ${product.price} TL perde, kaliteli perde`}
          image={product.image}
          url={`/product/${product.id}`}
          type="product"
          structuredData={structuredData}
        />
      )}
      {product && (
        <div className="product-detail-wrapper">
          {/* Kategori Adı - Sayfanın En Üstü */}
          <div className="product-category-top">
            <span className="product-category-top-text">{product.category || 'Genel'}</span>
          </div>

          {/* Ürün Adı - Kategori Altında, Fotoğraf Üstünde */}
          <div className="product-name-top">
            <h1 className="product-name-top-text">{product.name}</h1>
          </div>

        <div className="product-detail-content">
          <section className="product-detail-images">
            <div className="product-image-section-home">
              <div className="product-image-wrapper">
                <div className="main-product-image-wrapper-home fade-in">
                  <LazyImage
                    src={currentImage || ''}
                    alt={`${product.name} - ${product.category} perde modeli - Görsel ${activeImageIndex + 1}`}
                    className="main-product-image-home"
                    isLCP={true}
                    fetchPriority="high"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                    width={800}
                    height={800}
                  />
                  {detailImage && (
                    <button
                      type="button"
                      className="product-image-thumb"
                      onClick={() => openDetailModal(detailImage)}
                      aria-label="Detay fotoğrafını görüntüle"
                    >
                      <LazyImage
                        src={detailImage}
                        alt={`${product.name} detay fotoğrafı`}
                        className="product-image-thumb-img"
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Ürün Açıklaması - Fotoğrafların Altında */}
            {product.description && (
              <div className="product-description-section">
                <p className="product-description">
                  {product.description}
                </p>
              </div>
            )}
            
            {/* Ürün Özellikleri - Fotoğrafların Altında */}
            {(product.mountingType || product.material || product.lightTransmittance || 
              product.pieceCount || product.color || product.usageArea || product.pleatType || 
              (product.width && product.height)) && (
              <div className="product-specifications-below-images">
                <h3 className="specifications-title-below">
                  <span className="spec-category-name">{product.category || 'Genel'}</span>
                  <span className="spec-title-text">Ürün Özellikleri</span>
                </h3>
                <div className="specifications-grid-below">
                  {product.mountingType && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Takma Şekli</span>
                        <span className="spec-value-below">{product.mountingType}</span>
                      </div>
                    </div>
                  )}
                  {product.material && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Materyal</span>
                        <span className="spec-value-below">{product.material}</span>
                      </div>
                    </div>
                  )}
                  {product.pleatType && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12h18M3 6h18M3 18h18" />
                        </svg>
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Pile</span>
                        <span className="spec-value-below">{product.pleatType}</span>
                      </div>
                    </div>
                  )}
                  {product.lightTransmittance && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Işık Geçirgenliği</span>
                        <span className="spec-value-below">{product.lightTransmittance}</span>
                      </div>
                    </div>
                  )}
                  {product.pieceCount && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Parça Sayısı</span>
                        <span className="spec-value-below">{product.pieceCount} Adet</span>
                      </div>
                    </div>
                  )}
                  {product.color && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                        </svg>
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Renk</span>
                        <div className="spec-color-display-below">
                          <div 
                            className="color-swatch-below"
                            style={{ 
                              backgroundColor: getColorHex(product.color) || '#ccc',
                              border: `2px solid ${getColorHex(product.color) || '#ccc'}`
                            }}
                            title={product.color}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {product.width && product.height && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Beden</span>
                        <span className="spec-value-below">{product.width} x {product.height} cm</span>
                      </div>
                    </div>
                  )}
                  {product.usageArea && (
                    <div className="spec-item-below">
                      <div className="spec-icon-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div className="spec-content-below">
                        <span className="spec-label-below">Kullanım Alanı</span>
                        <span className="spec-value-below">{product.usageArea}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <article className="product-detail-info">
            <div className="product-header-info">
              {product.productCode && (
                <span className="product-code">Ürün Kodu: <strong>{product.productCode}</strong></span>
              )}
              
              {/* Yıldız Puanı ve Yorum Sayısı */}
              {totalReviewCount > 0 && (
                <div className="product-rating-section">
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const rating = derivedAverageRating || 0
                      const filled = star <= Math.floor(rating)
                      return (
                        <svg
                          key={star}
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill={filled ? "#FFD700" : "none"}
                          stroke={filled ? "#FFD700" : "#ddd"}
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )
                    })}
                    {derivedAverageRating > 0 && (
                      <span className="rating-value">{derivedAverageRating.toFixed(1)}</span>
                    )}
                  </div>
                  <span className="review-count">
                    ({totalReviewCount} {totalReviewCount === 1 ? 'yorum' : 'yorum'})
                  </span>
                  <button type="button" className="reviews-anchor-btn" onClick={handleScrollToReviews}>
                    Yorumları Gör
                  </button>
                </div>
              )}
              
              {/* Fiyat - Header'ın hemen altında */}
              <div className="detail-price-section-top">
                <div className="price-info-top">
                  <span className="price-label-top">Metre Fiyatı:</span>
                  <span className="detail-price-top">{product.price.toFixed(2)} ₺</span>
                </div>
              </div>
            </div>
            
            
            {/* Genel Özellikler */}
            <div className="product-features">
              <div className="feature-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Kaliteli Kumaş</span>
              </div>
              <div className="feature-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Hızlı Teslimat</span>
              </div>
              <div className="feature-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Uygun Fiyat</span>
              </div>
            </div>

          {/* Fiyatlandırma Formu */}
          <div className="pricing-form-wrapper">
            <button
              type="button"
              className="pricing-form-toggle"
              onClick={() => setIsFormOpen(!isFormOpen)}
            >
              <h2 className="form-title">Özel Fiyatlandırma</h2>
              <svg 
                className={`form-toggle-arrow ${isFormOpen ? 'open' : ''}`}
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            
            <form 
              className={`pricing-form ${isFormOpen ? 'open' : ''}`}
              onSubmit={handleAddToCart}
            >
              <div className="form-section">
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="en">
                    Genişlik (cm) <span className="required">*</span>
                    <span className="form-hint">Min: 50 cm, Max: 1000 cm</span>
                  </label>
                  <input
                    type="number"
                    id="en"
                    value={en}
                    onChange={(e) => {
                      const value = e.target.value
                      setEn(value)
                    }}
                    min="50"
                    max="1000"
                    step="0.1"
                    placeholder="Örn: 200"
                    className={formErrors.en ? 'input-error' : ''}
                    required
                  />
                  {formErrors.en && (
                    <span className="error-message">{formErrors.en}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="boy">
                    Yükseklik (cm) <span className="required">*</span>
                    <span className="form-hint">Min: 30 cm, Max: 270 cm</span>
                  </label>
                  <input
                    type="number"
                    id="boy"
                    value={boy}
                    onChange={(e) => {
                      const value = e.target.value
                      setBoy(value)
                    }}
                    min="30"
                    max="270"
                    step="0.1"
                    placeholder="Örn: 250"
                    className={formErrors.boy ? 'input-error' : ''}
                    required
                  />
                  {formErrors.boy && (
                    <span className="error-message">{formErrors.boy}</span>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="pileSikligi">
                  Pile Sıklığı <span className="required">*</span>
                </label>
                <div className="custom-dropdown">
                  <button
                    type="button"
                    className="dropdown-trigger"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  >
                    <span className="dropdown-selected">
                      {pileOptions.find(opt => opt.value === pileSikligi)?.label}
                    </span>
                    <svg 
                      className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
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
                  {isDropdownOpen && (
                    <div className="dropdown-menu">
                      {pileOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`dropdown-option ${pileSikligi === option.value ? 'selected' : ''}`}
                          onClick={() => {
                            setPileSikligi(option.value)
                            setIsDropdownOpen(false)
                          }}
                        >
                          <span className="option-label">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="form-info">
                  Pile sıklığı fiyatlandırmayı etkiler: 1x1 (x1), 1x2 (x2), 1x3 (x3)
                </p>
              </div>
              
              {calculatedPrice > 0 && (
                <div className="calculated-price-section">
                  <div className="price-breakdown">
                    <div className="breakdown-item">
                      <span>Metre Fiyatı:</span>
                      <span>{product.price} ₺</span>
                    </div>
                    <div className="breakdown-item">
                      <span>En:</span>
                      <span>{en} cm ({parseFloat(en) / 100} m)</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Pile Çarpanı:</span>
                      <span>{pileSikligi}</span>
                    </div>
                    <div className="breakdown-item total">
                      <span>Toplam Fiyat:</span>
                      <span className="total-price">
                        {isCalculatingPrice ? (
                          <>
                            <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                              animation: 'spin 1s linear infinite',
                              display: 'inline-block',
                              marginRight: '0.5rem',
                              verticalAlign: 'middle'
                            }}>
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Hesaplanıyor...
                          </>
                        ) : (
                          `${calculatedPrice.toFixed(2)} ₺`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="quantity-section">
              <label>Adet:</label>
              <div className="quantity-controls">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            {addToCartError && (
              <div className="error-message" style={{
                padding: '1rem',
                backgroundColor: '#fee',
                color: '#c33',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #fcc'
              }}>
                {addToCartError}
              </div>
            )}
            
            {addToCartSuccess && (
              <div className="success-message" style={{
                padding: '1rem',
                backgroundColor: '#efe',
                color: '#3c3',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #cfc'
              }}>
                ✓ Ürün sepete başarıyla eklendi!
              </div>
            )}

            <button 
              type="submit" 
              className="add-to-cart-btn" 
              disabled={!en || !boy || calculatedPrice === 0 || isAddingToCart || !!formErrors.en || !!formErrors.boy}
            >
              {isAddingToCart ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem'
                  }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Ekleniyor...
                </>
              ) : (
                'Sepete Ekle'
              )}
            </button>
          </form>
          </div>
        </article>
      </div>
    </div>
    )}

      {/* Benzer Ürünler Widget - Aynı kategorideki ürünler */}
      {product && (() => {
        const similarProducts = allProducts
          .filter(p => p.id !== product.id && p.category === (product.category || 'Genel'))
        
        if (similarProducts.length === 0) return null
        
        return (
          <section className="similar-products-widget">
            <div className="similar-products-header">
              <h2 className="similar-products-title">Benzer Ürünler</h2>
              <p className="similar-products-subtitle">{product.category || 'Genel'} kategorisindeki diğer ürünler</p>
            </div>
            <div className="similar-products-scroll-container">
              <div className="similar-products-scroll">
                {similarProducts.map(relatedProduct => (
                  <Link 
                    key={relatedProduct.id} 
                    to={`/product/${relatedProduct.id}`}
                    className="similar-product-item"
                  >
                    <div className="similar-product-image-wrapper">
                      <LazyImage 
                        src={relatedProduct.image}
                        alt={relatedProduct.name}
                        className="similar-product-image"
                      />
                    </div>
                    <div className="similar-product-name">{relatedProduct.name}</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )
      })()}

      {product && (
        <section
          id="reviews-section"
          ref={reviewSectionRef}
          className="product-reviews-section"
        >
          <div className="reviews-header">
            <h2 className="reviews-title">Ürün Yorumları</h2>
            <p className="reviews-subtitle">Gerçek müşteri deneyimleri ve puanlamalar</p>
          </div>
            <div className="reviews-summary-card">
              <div className="reviews-score">
                <span className="reviews-score-value">{(derivedAverageRating || 0).toFixed(1)}</span>
                <span className="reviews-score-max">/ 5</span>
                <span className="reviews-score-text">puan</span>
                <div className="reviews-score-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg
                      key={`summary-star-${star}`}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={star <= Math.round(derivedAverageRating) ? "#FFD700" : "none"}
                      stroke={star <= Math.round(derivedAverageRating) ? "#FFD700" : "#ddd"}
                      strokeWidth="2"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
              </div>
            <div className="reviews-meta">
              <span className="reviews-count-text">
                {totalReviewCount > 0 ? `${totalReviewCount} değerlendirme` : 'Henüz yorum bulunmuyor'}
              </span>
              {imageReviewCount > 0 && (
                <span className="reviews-image-count">{imageReviewCount} fotoğraflı yorum</span>
              )}
              <button type="button" className="reviews-anchor-btn secondary" onClick={handleScrollToReviews}>
                Başa Dön
              </button>
            </div>
          </div>
            <div className="reviews-summary-extras">
            <div className="reviews-filters">
              <label className="reviews-sort-label" htmlFor="review-sort-select">Sırala</label>
              <select
                id="review-sort-select"
                className="reviews-sort-select"
                value={reviewSortOption}
                onChange={(e) => setReviewSortOption(e.target.value)}
              >
                <option value="LATEST">En Yeni</option>
                <option value="OLDEST">En Eski</option>
                <option value="HIGHEST_RATED">En Yüksek Puan</option>
                <option value="LOWEST_RATED">En Düşük Puan</option>
                <option value="MOST_HELPFUL">En Faydalı</option>
              </select>
              <label className="reviews-checkbox">
                <input
                  type="checkbox"
                  checked={withImageReviewsOnly}
                  onChange={(e) => setWithImageReviewsOnly(e.target.checked)}
                />
                <span>Sadece görselli ({imageReviewCount})</span>
              </label>
            </div>
          </div>
          {reviewError && (
            <div className="reviews-error">{reviewError}</div>
          )}
          {isFetchingReviews && reviews.length === 0 ? (
            <div className="reviews-loading">Yorumlar yükleniyor...</div>
          ) : reviews.length > 0 ? (
            <div className="reviews-list">
              {reviews.map((review, index) => {
                const ratingValue = Number(review.rating) || 0
                const reviewDate = formatReviewDate(review.createdAt || review.updatedAt)
                const reviewer = review.reviewer || {}
                const reviewKey = review.id ?? `${index}-${reviewer.email || 'review'}`
                return (
                  <article key={reviewKey} className="review-card">
                    <div className="review-card-header">
                      <div className="review-author-meta">
                        <span className="review-author">{reviewer.name || 'Müşteri'}</span>
                        {reviewDate && <time className="review-date">{reviewDate}</time>}
                      </div>
                      {ratingValue > 0 && (
                        <div className="review-card-rating">
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg
                              key={`${review.id}-${star}`}
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill={star <= Math.round(ratingValue) ? "#FFD700" : "none"}
                              stroke={star <= Math.round(ratingValue) ? "#FFD700" : "#ddd"}
                              strokeWidth="2"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          ))}
                          <span>{ratingValue.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    {review.comment && (
                      <p className="review-comment">
                        {review.comment}
                      </p>
                    )}
                    {review.imageUrls && review.imageUrls.length > 0 && (
                      <div className="review-image-grid">
                        {review.imageUrls.map((url, idx) => (
                          <div
                            key={`${review.id}-img-${idx}`}
                            className="review-image-thumb"
                            aria-label={`Yorum görseli ${idx + 1}`}
                          >
                            <LazyImage src={url} alt={`Yorum görseli ${idx + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
              <div className="reviews-load-more" ref={loadMoreReviewsRef}>
                {isFetchingReviews && reviews.length > 0 && (
                  <span>Daha fazla yorum yükleniyor...</span>
                )}
                {!reviewPageMeta.hasNext && reviews.length > 0 && (
                  <span>Tüm yorumlar yüklendi.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="no-reviews-card">
              <p>{withImageReviewsOnly ? 'Fotoğraflı yorum bulunamadı.' : 'Bu ürün için henüz yorum paylaşılmadı.'}</p>
              <span>Satın alma sonrasında deneyiminizi paylaşarak diğer müşterilere destek olabilirsiniz.</span>
            </div>
          )}
        </section>
      )}
      {isDetailModalOpen && (
        <div className="image-modal-backdrop" onClick={closeDetailModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="image-modal-close"
              onClick={closeDetailModal}
              aria-label="Modalı kapat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <LazyImage
              src={modalImageSrc || detailImage || currentImage}
              alt="Detay görsel"
              className="image-modal-photo"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetail
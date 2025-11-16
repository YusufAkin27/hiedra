import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const intervalRef = useRef(null)
  const isPausedRef = useRef(false)
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [allProducts, setAllProducts] = useState([]) // Tüm ürünler (ilgili ürünler için)

  const pileOptions = [
    { value: '1x1', label: 'Pilesiz (1x1)' },
    { value: '1x2', label: '1x2'  },
    { value: '1x3', label: '1x3' }
  ]

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

  // Tüm görselleri birleştir (ana görsel + detay görselleri) - Memoize edilmiş
  const allImages = useMemo(() => {
    if (!product) return []
    return product.detailImages 
      ? [product.image, ...product.detailImages]
      : [product.image]
  }, [product])

  // Otomatik fotoğraf geçişi
  useEffect(() => {
    // Ürün yoksa veya görsel yoksa çalıştırma
    if (!product || !allImages || allImages.length <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Önceki timer'ı temizle
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Otomatik geçiş timer'ı başlat
    const imagesCount = allImages.length
    
    const startAutoSlide = () => {
      intervalRef.current = setInterval(() => {
        setSelectedImage((prevIndex) => {
          return (prevIndex + 1) % imagesCount
        })
      }, 5000) // 5 saniye
    }

    // Pause durumunu kontrol et, değilse başlat
    if (!isPausedRef.current) {
      startAutoSlide()
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [product, allImages])

  // Manuel thumbnail seçildiğinde timer'ı resetle
  const handleThumbnailClick = (index) => {
    setSelectedImage(index)
    
    // Timer'ı temizle
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Hemen yeniden başlat (yeni seçilen görselden itibaren 5 saniye sayar)
    if (allImages.length > 1) {
      setTimeout(() => {
        if (!isPausedRef.current) {
          intervalRef.current = setInterval(() => {
            setSelectedImage((prevIndex) => {
              return (prevIndex + 1) % allImages.length
            })
          }, 5000)
        }
      }, 100)
    }
  }

  // Mouse hover'da duraklat
  const handleImageHover = () => {
    isPausedRef.current = true
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Mouse leave'de devam et
  const handleImageLeave = () => {
    isPausedRef.current = false
    if (allImages.length > 1 && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setSelectedImage((prevIndex) => {
          const nextIndex = (prevIndex + 1) % allImages.length
          return nextIndex
        })
      }, 5000)
    }
  }

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
  
  // Form değişikliklerinde fiyatı hesapla
  useEffect(() => {
    if (product && product.id && en && boy && pileSikligi) {
      // Debounce ile backend'e istek at
      const timeoutId = setTimeout(() => {
        calculatePrice(en, boy, pileSikligi)
      }, 500) // 500ms bekle

      return () => clearTimeout(timeoutId)
    } else {
      setCalculatedPrice(0)
    }
  }, [en, boy, pileSikligi, product?.id, product?.price, calculatePrice])

  // Structured Data for Product - useMemo ile sarmala
  const structuredData = useMemo(() => {
    if (!product || !product.id || !product.name || !product.price) return null
    
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${product.name || 'Ürün'} - Perde Satış`,
      description: `${product.description || ''} Perde satış için Hiedra'yı ziyaret edin. Kaliteli kumaş, uygun fiyat, hızlı teslimat.`,
      image: (allImages && allImages.length > 0 ? allImages : [product.image || '/images/perde1kapak.jpg']).map(img => {
        if (!img) return ''
        return img.startsWith('http') ? img : `${typeof window !== 'undefined' ? window.location.origin : 'https://hiedra.com'}${img}`
      }).filter(img => img),
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
        ratingValue: (product.averageRating || 4.8).toString(),
        reviewCount: (product.reviewCount || 0).toString(),
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
  }, [product, allImages])

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
    
    if (enNum <= 0 || enNum > 30000) {
      setAddToCartError('En değeri 0 ile 30000 cm arasında olmalıdır.')
      return
    }
    
    if (boyNum <= 0 || boyNum > 500) {
      setAddToCartError('Boy değeri 0 ile 500 cm arasında olmalıdır.')
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
          {/* Üst Badge - Kategori */}
          <div className="product-detail-badge-container">
            <span className="product-detail-badge category-badge-top">
              {product.category || 'Genel'}
            </span>
          </div>

        <div className="product-detail-content">
          <section className="product-detail-images">
            {/* Sol üstte - Detay thumbnailleri */}
            {allImages.length > 1 && (
              <div className="product-side-thumbnails-inside">
                {allImages.slice(0, 3).map((img, index) => (
                  <button
                    key={index}
                    className={`side-thumbnail-inside ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => handleThumbnailClick(index)}
                    onMouseEnter={() => setSelectedImage(index)}
                  >
                    <LazyImage 
                      src={img} 
                      alt={`${product.name} - ${product.category} perde detay görüntüsü ${index + 1}`}
                      className="thumbnail-image"
                    />
                  </button>
                ))}
              </div>
            )}

            <div 
              className="main-image-container"
              onMouseEnter={handleImageHover}
              onMouseLeave={handleImageLeave}
            >
              {/* Etiketler - Üst kısım */}
              <div className="product-badges-top">
                <span className="badge badge-return">14 Gün Koşulsuz İade</span>
                <span className="badge badge-shipping">Ücretsiz Kargo</span>
              </div>
              
              <LazyImage 
                src={allImages[selectedImage]} 
                alt={`${product.name} - ${product.category} perde modeli. ${product.description.substring(0, 120)}`}
                className="main-image"
              />
              <div className="image-gradient-overlay"></div>
              <div className="image-count-indicator">
                {selectedImage + 1} / {allImages.length}
              </div>
              
              {allImages.length > 1 && (
                <div className="auto-slide-indicator">
                  <div className="slide-progress-bar">
                    <div 
                      className="slide-progress-fill"
                      key={selectedImage}
                    ></div>
                  </div>
                </div>
              )}

              {/* Sağ altta detay fotoğrafı butonu */}
              {allImages.length > 3 && (
                <button 
                  className="detail-photo-btn-inside"
                  onClick={() => setSelectedImage(allImages.length > 3 ? 3 : allImages.length - 1)}
                  title="Detay fotoğrafı görüntüle"
                >
                  <LazyImage 
                    src={allImages[allImages.length > 3 ? 3 : allImages.length - 1]} 
                    alt="Detay görüntüle"
                    className="detail-thumbnail"
                  />
                  <div className="detail-btn-overlay">
                    <svg className="zoom-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    <span>Detay Gör</span>
                  </div>
                </button>
              )}
            </div>
          </section>

          <article className="product-detail-info">
            <div className="product-header-info">
              <span className="product-category">{product.category}</span>
              <h1 className="product-name">{product.name}</h1>
              {product.productCode && (
                <span className="product-code">Ürün Kodu: <strong>{product.productCode}</strong></span>
              )}
              
              {/* Yıldız Puanı ve Yorum Sayısı */}
              {((product.averageRating && product.averageRating > 0) || (product.reviewCount && product.reviewCount > 0)) && (
                <div className="product-rating-section">
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const rating = product.averageRating || 0;
                      const filled = star <= Math.floor(rating);
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
                      );
                    })}
                    {product.averageRating > 0 && (
                      <span className="rating-value">{product.averageRating.toFixed(1)}</span>
                    )}
                  </div>
                  {product.reviewCount > 0 && (
                    <span className="review-count">({product.reviewCount} {product.reviewCount === 1 ? 'yorum' : 'yorum'})</span>
                  )}
                </div>
              )}
            </div>
            
            <p className="product-description" style={{ 
              fontSize: '1.1rem', 
              lineHeight: '1.8', 
              marginBottom: '2rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {product.description}
            </p>
            
            {/* Ürün Özellikleri */}
            {(product.mountingType || product.material || product.lightTransmittance || 
              product.pieceCount || product.color || product.usageArea || product.pleatType || 
              (product.width && product.height)) && (
              <div className="product-specifications">
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 600, 
                  marginBottom: '1.5rem',
                  color: 'var(--text-primary)'
                }}>
                  Ürün Özellikleri
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem'
                }}>
                  {product.mountingType && (
                    <div className="spec-item">
                      <div className="spec-label">Takma Şekli</div>
                      <div className="spec-value">{product.mountingType}</div>
                    </div>
                  )}
                  {product.material && (
                    <div className="spec-item">
                      <div className="spec-label">Materyal</div>
                      <div className="spec-value">{product.material}</div>
                    </div>
                  )}
                  {product.pleatType && (
                    <div className="spec-item">
                      <div className="spec-label">Pile</div>
                      <div className="spec-value">{product.pleatType}</div>
                    </div>
                  )}
                  {product.lightTransmittance && (
                    <div className="spec-item">
                      <div className="spec-label">Işık Geçirgenliği</div>
                      <div className="spec-value">{product.lightTransmittance}</div>
                    </div>
                  )}
                  {product.pieceCount && (
                    <div className="spec-item">
                      <div className="spec-label">Parça Sayısı</div>
                      <div className="spec-value">{product.pieceCount}</div>
                    </div>
                  )}
                  {product.color && (
                    <div className="spec-item">
                      <div className="spec-label">Renk</div>
                      <div className="spec-value">{product.color}</div>
                    </div>
                  )}
                  {product.width && product.height && (
                    <div className="spec-item">
                      <div className="spec-label">Beden</div>
                      <div className="spec-value">{product.width} x {product.height} cm</div>
                    </div>
                  )}
                  {product.usageArea && (
                    <div className="spec-item">
                      <div className="spec-label">Kullanım Alanı</div>
                      <div className="spec-value">{product.usageArea}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
            
            <div className="detail-price-section">
              <div className="price-info">
                <span className="price-label">Metre Fiyatı:</span>
                <span className="detail-price">{product.price} ₺</span>
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
                    En (cm) <span className="required">*</span>
                    <span className="form-hint">Max: 30000 cm</span>
                  </label>
                  <input
                    type="number"
                    id="en"
                    value={en}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 30000)) {
                        setEn(value)
                      }
                    }}
                    min="0"
                    max="30000"
                    step="0.1"
                    placeholder="Örn: 200"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="boy">
                    Boy (cm) <span className="required">*</span>
                    <span className="form-hint">Max: 500 cm</span>
                  </label>
                  <input
                    type="number"
                    id="boy"
                    value={boy}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 500)) {
                        setBoy(value)
                      }
                    }}
                    min="0"
                    max="500"
                    step="0.1"
                    placeholder="Örn: 250"
                    required
                  />
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
              disabled={!en || !boy || calculatedPrice === 0 || isAddingToCart}
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

      {/* Sağ alt köşede sabit buton */}
      <button 
        type="button"
        className="product-detail-fab"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          
          // Form'u aç
          setIsFormOpen(true)
          
          // Form'a scroll yap
          setTimeout(() => {
            const formElement = document.querySelector('.pricing-form-wrapper')
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              // İlk input'a odaklan
              setTimeout(() => {
                const firstInput = formElement.querySelector('input[type="number"]')
                if (firstInput) {
                  firstInput.focus()
                }
              }, 600)
            }
          }, 100)
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onMouseUp={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        title="Özelleştir & Sipariş Ver"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <span>Özelleştir & Sipariş Ver</span>
      </button>

      {/* Benzer Ürünler - Ana kartın dışında, daha görünür */}
      {product && (
        <section className="related-products-section">
          <div className="related-products-header">
            <h2>Benzer Ürünler</h2>
            <p className="related-products-subtitle">Size uygun diğer perde modellerini keşfedin</p>
          </div>
          <div className="related-products-grid">
            {allProducts
              .filter(p => p.id !== product.id && p.category === (product.category || 'Genel'))
              .slice(0, 3)
              .map(relatedProduct => (
              <Link 
                key={relatedProduct.id} 
                to={`/product/${relatedProduct.id}`}
                className="related-product-card"
              >
                <div className="related-product-image-wrapper">
                  <LazyImage 
                    src={relatedProduct.image}
                    alt={`${relatedProduct.name} - ${relatedProduct.category} perde satış`}
                    className="related-product-image"
                  />
                  <div className="related-product-overlay">
                    <span className="related-product-category">{relatedProduct.category}</span>
                    <span className="related-product-view">Görüntüle →</span>
                  </div>
                </div>
                <div className="related-product-info">
                  <h3>{relatedProduct.name}</h3>
                  <p className="related-product-description">{(relatedProduct.description || '').substring(0, 60)}{(relatedProduct.description || '').length > 60 ? '...' : ''}</p>
                  <div className="related-product-footer">
                    <span className="related-product-price">{(typeof relatedProduct.price === 'number' ? relatedProduct.price : parseFloat(relatedProduct.price) || 0).toFixed(2)} ₺</span>
                  </div>
                </div>
              </Link>
            ))}
          {allProducts
            .filter(p => p.id !== product.id && p.category !== (product.category || 'Genel'))
            .slice(0, 3 - allProducts.filter(p => p.id !== product.id && p.category === (product.category || 'Genel')).length)
            .map(relatedProduct => (
              <Link 
                key={relatedProduct.id} 
                to={`/product/${relatedProduct.id}`}
                className="related-product-card"
              >
                <div className="related-product-image-wrapper">
                  <LazyImage 
                    src={relatedProduct.image}
                    alt={`${relatedProduct.name} - ${relatedProduct.category} perde satış`}
                    className="related-product-image"
                  />
                  <div className="related-product-overlay">
                    <span className="related-product-category">{relatedProduct.category}</span>
                    <span className="related-product-view">Görüntüle →</span>
                  </div>
                </div>
                <div className="related-product-info">
                  <h3>{relatedProduct.name}</h3>
                  <p className="related-product-description">{(relatedProduct.description || '').substring(0, 60)}{(relatedProduct.description || '').length > 60 ? '...' : ''}</p>
                  <div className="related-product-footer">
                    <span className="related-product-price">{(typeof relatedProduct.price === 'number' ? relatedProduct.price : parseFloat(relatedProduct.price) || 0).toFixed(2)} ₺</span>
                  </div>
                </div>
              </Link>
            ))}
        </div>

        {/* Kategori Linkleri */}
        <div className="category-links-section">
          <h3>Diğer Kategoriler</h3>
          <div className="category-links">
            <Link to="/" className="category-link">
              <span>Tüm Ürünler</span>
              <span className="category-count">({allProducts.length} ürün)</span>
            </Link>
            {(() => {
              // Backend'den gelen kategorileri dinamik olarak al
              const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))]
              return categories.map(category => {
                const categoryProducts = allProducts.filter(p => p.category === category)
                return (
                  <Link 
                    key={category}
                    to={`/category/${encodeURIComponent(category.toLowerCase().replace(/\s+/g, '-'))}`}
                    className="category-link"
                  >
                    <span>{category} Perde</span>
                    <span className="category-count">({categoryProducts.length} ürün)</span>
                  </Link>
                )
              })
            })()}
          </div>
        </div>
      </section>
      )}
    </div>
  )
}

export default ProductDetail


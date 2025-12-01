import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import LazyImage from './LazyImage'
import Loading from './Loading'
import SEO from './SEO'
import CategoriesShowcase from './CategoriesShowcase'
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
  const navigate = useNavigate()
  const { addToCart, refreshCart } = useCart()
  const { accessToken } = useAuth()
  const toast = useToast()
  
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

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
        {/* Background Image - Sadece hero section içinde görünür */}
        <div 
          className="fixed-background-image"
          aria-hidden="true"
        />
        <div className="hero-content-modern">
          <h1 className="hero-title-modern">Perde Satış - Tül Perde ve Modern Perde Modelleri</h1>
          <h2 className="hero-subtitle-modern">Uygun Perde Fiyatları ile Toptan Fiyatına Perakende Satış</h2>
          
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

      <CategoriesShowcase 
        categories={categories}
        onProductClick={(productId) => handleProductClick(productId)}
      />
    </div>
  )
}

export default ProductList

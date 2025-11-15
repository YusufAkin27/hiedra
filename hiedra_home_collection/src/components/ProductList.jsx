import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import LazyImage from './LazyImage'
import SEO from './SEO'
import './ProductList.css'

// Ürün Özellikleri Accordion Component
const ProductSpecificationsAccordion = ({ selectedProduct }) => {
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
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const ProductList = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState({}) // Her kategori için seçili ürün
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedDetailImage, setSelectedDetailImage] = useState(null)
  
  // URL'den arama terimini al
  const searchParams = new URLSearchParams(location.search)
  const searchTerm = searchParams.get('search') || ''

  // Backend'den ürünleri çek
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        // Backend Page<Product> döndürüyor, bu yüzden size parametresi ekliyoruz
        const response = await fetch(`${API_BASE_URL}/products?page=0&size=1000`)
        if (response.ok) {
          const data = await response.json()
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
            // Backend formatını frontend formatına çevir
            const formattedProducts = productsData.map(product => ({
              id: product.id,
              name: product.name,
              price: product.price ? parseFloat(product.price) : 0,
              image: product.coverImageUrl || '/images/perde1kapak.jpg',
              detailImages: product.detailImageUrl ? [product.detailImageUrl] : [],
              description: product.description || product.shortDescription || '',
              shortDescription: product.shortDescription || '',
              category: product.category?.name || 'Genel',
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
            }))
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
        categoryMap[categoryName] = []
      }
      categoryMap[categoryName].push(product)
    })
    
    // Kategorileri alfabetik sırala ve her kategorinin ürünlerini sırala
    return Object.keys(categoryMap)
      .sort()
      .map(categoryName => ({
        name: categoryName,
        products: categoryMap[categoryName].sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter(cat => cat.products.length > 0) // Sadece ürünü olan kategorileri göster
  }, [products])

  // Arama sonuçlarını filtrele
  const filteredProducts = searchTerm
    ? products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products

  // Ürün detay sayfasına git
  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`)
  }

  // Kategori için ürün seç
  const handleColorSelect = (product, categoryName) => {
    setSelectedProducts(prev => ({
      ...prev,
      [categoryName]: product
    }))
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

  // Arama modunda tüm ürünleri göster
  if (searchTerm) {
    return (
      <div className="product-list-container">
        <SEO
          title={`"${searchTerm}" Arama Sonuçları`}
          description={`"${searchTerm}" için ${filteredProducts.length} ürün bulundu`}
          url={`/?search=${encodeURIComponent(searchTerm)}`}
        />
        <header className="product-list-header">
          <h1>Koleksiyonlar</h1>
          <p>Modern ve şık perde seçenekleri</p>
          <div className="search-results-info">
            <span>"{searchTerm}" için {filteredProducts.length} sonuç bulundu</span>
          </div>
        </header>

        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>Üzgünüz, aradığınız kriterlere uygun ürün bulunamadı.</p>
          </div>
        ) : (
          <div className="product-grid-search">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card-search" onClick={() => handleProductClick(product.id)}>
                <LazyImage src={product.image} alt={product.name} />
                <div className="product-card-info">
                  <h3>{product.name}</h3>
                  <p className="product-price">Başlangıç: {product.price.toFixed(2)} ₺</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="product-list-container">
        <div className="loading-state">
          <p>Ürünler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="product-list-container">
      <SEO
        title="Perde Satış - Online Perde Satın Al | Bingöl Perde Satışı | Hiedra Perde"
        description="Bingöl ve Türkiye'nin en kaliteli perde satış sitesi. Zebra perde, Klasik perde, Stor perde ve Jaluzi perde modelleri. Bingöl perde satışı, Erzurum perde satışı. Hızlı teslimat, uygun fiyat garantisi."
        keywords="bingöl perde, bingöl perde satışı, erzurum perde, erzurum perde satışı, perde satış, online perde satış, perde satın al, perdeler, zebra perde satış, klasik perde, stor perde, jaluzi perde, perde fiyatları, uygun perde, kaliteli perde satış"
        url="/"
      />
      
      <header className="product-list-header">
        <h1>Perde Koleksiyonlarımız</h1>
        <p>Modern ve şık perde seçenekleri</p>
      </header>

      <div className="categories-showcase-home">
        {categories.map(category => {
          const selectedProduct = selectedProducts[category.name] || category.products[0]
          
          return (
            <div key={category.name} className="category-section-home">
              <div className="category-header-home">
                <h2 className="category-title-home">{category.name}</h2>
                <p className="category-subtitle-home">{category.products.length} ürün</p>
              </div>
              
              <div className="category-product-showcase-home">
                {/* Sol taraf - Büyük fotoğraf */}
                <div className="product-image-section-home">
                  <div className="main-product-image-wrapper-home">
                    <LazyImage
                      src={selectedProduct.image || ''}
                      alt={selectedProduct.name}
                      className="main-product-image-home"
                    />
                    {selectedProduct.inStock && (
                      <div className="product-stock-badge-large-home">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Stokta</span>
                      </div>
                    )}
                    {/* Detay fotoğraf önizleme */}
                    {selectedProduct.detailImages && selectedProduct.detailImages.length > 0 && selectedProduct.detailImages[0] && (
                      <div 
                        className="detail-image-preview-home"
                        onClick={() => {
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
                <div className="product-details-section-home">
                  <div className="product-header-info-home">
                    <h2 className="product-title-home">{selectedProduct.name}</h2>
                    {selectedProduct.productCode && (
                      <p className="product-code-home">Kod: {selectedProduct.productCode}</p>
                    )}
                    {/* Yıldız Puanı */}
                    {(selectedProduct.averageRating > 0 || selectedProduct.reviewCount > 0) && (
                      <div className="product-rating-section-home">
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
                      <span className="price-label-home">Başlangıç:</span>
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
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              {product.color && (
                                <span className="color-name-home">{product.color}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ürün Özellikleri */}
                  {(selectedProduct.mountingType || selectedProduct.material || selectedProduct.lightTransmittance) && (
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
                          </svg>
                          <span>Işık Geçirgenliği: {selectedProduct.lightTransmittance}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detay Butonu */}
                  <button
                    className="view-product-detail-btn-home"
                    onClick={() => handleProductClick(selectedProduct.id)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Ürün Detayını Görüntüle
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

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

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import LazyImage from './LazyImage'
import SEO from './SEO'
import './CategoryDetail.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const CategoryDetail = () => {
  const { categoryId, categorySlug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        // Kategori ID'sine göre ürünleri çek
        const response = await fetch(`${API_BASE_URL}/products/category/${categoryId}?page=0&size=1000`)
        if (response.ok) {
          const data = await response.json()
          if (data.isSuccess || data.success) {
            let productsData = []
            if (data.data) {
              if (data.data.content && Array.isArray(data.data.content)) {
                productsData = data.data.content
              } else if (Array.isArray(data.data)) {
                productsData = data.data
              }
            }
            
            // Kategori bilgisini backend'den çek
            const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`)
            if (categoryResponse.ok) {
              const categoryData = await categoryResponse.json()
              if (categoryData.isSuccess || categoryData.success) {
                setCategory({
                  id: categoryData.data.id,
                  name: categoryData.data.name,
                  description: categoryData.data.description || ''
                })
              } else if (productsData.length > 0 && productsData[0].category) {
                // Fallback: İlk üründen kategori bilgisini al
                setCategory({
                  id: productsData[0].category.id,
                  name: productsData[0].category.name,
                  description: productsData[0].category.description || ''
                })
              }
            } else if (productsData.length > 0 && productsData[0].category) {
              // Fallback: İlk üründen kategori bilgisini al
              setCategory({
                id: productsData[0].category.id,
                name: productsData[0].category.name,
                description: productsData[0].category.description || ''
              })
            }
            
            // Ürünleri formatla
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
              mountingType: product.mountingType || '',
              material: product.material || '',
              lightTransmittance: product.lightTransmittance || '',
              pieceCount: product.pieceCount || null,
              usageArea: product.usageArea || '',
              reviewCount: product.reviewCount || 0,
              averageRating: product.averageRating || 0,
              viewCount: product.viewCount || 0,
            }))
            
            setProducts(formattedProducts)
            // İlk ürünü varsayılan olarak seç
            if (formattedProducts.length > 0) {
              setSelectedProduct(formattedProducts[0])
            }
          } else {
            setError(data.message || 'Ürünler yüklenemedi')
          }
        } else {
          setError('Ürünler yüklenirken bir hata oluştu')
        }
      } catch (err) {
        console.error('Kategori ürünleri yükleme hatası:', err)
        setError('Ürünler yüklenirken bir hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }

    if (categoryId) {
      fetchCategoryProducts()
    }
  }, [categoryId])

  const handleColorSelect = (product) => {
    setSelectedProduct(product)
  }

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`)
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


  if (isLoading) {
    return (
      <div className="category-detail-page">
        <div className="category-detail-container">
          <div className="loading-state">
            <p>Ürünler yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="category-detail-page">
        <div className="category-detail-container">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => navigate('/kategoriler')} className="back-btn">
              Kategorilere Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!category || products.length === 0) {
    return (
      <div className="category-detail-page">
        <div className="category-detail-container">
          <div className="no-products">
            <p>Bu kategoride henüz ürün bulunmamaktadır.</p>
            <button onClick={() => navigate('/kategoriler')} className="back-btn">
              Kategorilere Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title={`${category.name} - Hiedra Home Collection`}
        description={`${category.name} kategorisindeki tüm ürünleri keşfedin. ${products.length} ürün bulunmaktadır.`}
      />
      <div className="category-detail-page">
        <div className="category-detail-container">
          <div className="category-header">
            <button onClick={() => navigate('/kategoriler')} className="back-to-categories">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Kategorilere Dön
            </button>
            <h1>{category.name}</h1>
            {category.description && (
              <p className="category-description">{category.description}</p>
            )}
            <p className="product-count">{products.length} ürün bulundu</p>
          </div>

          {selectedProduct && (
            <div className="category-product-showcase">
              {/* Sol taraf - Büyük fotoğraf */}
              <div className="product-image-section">
                <div className="main-product-image-wrapper">
                  <LazyImage
                    src={selectedProduct.image || ''}
                    alt={selectedProduct.name}
                    className="main-product-image"
                  />
                  {selectedProduct.inStock && (
                    <div className="product-stock-badge-large">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Stokta</span>
                    </div>
                  )}
                  {/* Detay fotoğraf önizleme */}
                  {selectedProduct.detailImages && selectedProduct.detailImages.length > 0 && selectedProduct.detailImages[0] && (
                    <div 
                      className="detail-image-preview"
                      onClick={() => setIsDetailModalOpen(true)}
                      title="Detay fotoğrafını görüntüle"
                    >
                      <div className="detail-image-preview-overlay">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                      </div>
                      <LazyImage
                        src={selectedProduct.detailImages[0]}
                        alt={`${selectedProduct.name} detay`}
                        className="detail-image-preview-img"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sağ taraf - Ürün detayları ve renk seçenekleri */}
              <div className="product-details-section">
                <div className="product-header-info">
                  <h2 className="product-title">{selectedProduct.name}</h2>
                  {selectedProduct.productCode && (
                    <p className="product-code">Kod: {selectedProduct.productCode}</p>
                  )}
                  {/* Yıldız Puanı */}
                  {(selectedProduct.averageRating > 0 || selectedProduct.reviewCount > 0) && (
                    <div className="product-rating-section">
                      <div className="product-rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = star <= Math.floor(selectedProduct.averageRating);
                          const halfFilled = !filled && star - 0.5 <= selectedProduct.averageRating;
                          const gradientId = `half-gradient-${selectedProduct.id}-${star}`;
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
                        <span className="product-rating-value">{selectedProduct.averageRating.toFixed(1)}</span>
                      )}
                      {selectedProduct.reviewCount > 0 && (
                        <span className="product-review-count">({selectedProduct.reviewCount} değerlendirme)</span>
                      )}
                    </div>
                  )}
                  <div className="product-price-large">
                    <span className="price-label">Başlangıç:</span>
                    <span className="price-value">{selectedProduct.price.toFixed(2)} ₺</span>
                  </div>
                </div>

                {/* Renk Seçimi */}
                {products.length > 0 && (
                  <div className="color-selection-section">
                    <h3 className="color-selection-title">RENK SEÇİMİ</h3>
                    <div className="color-options">
                      {products.map(product => {
                        const colorHex = getColorHex(product.color)
                        return (
                          <button
                            key={product.id}
                            className={`color-option ${selectedProduct.id === product.id ? 'active' : ''}`}
                            onClick={() => handleColorSelect(product)}
                            title={product.color || product.name}
                          >
                            <div 
                              className="color-swatch"
                              style={{ 
                                backgroundColor: colorHex || '#ccc'
                              }}
                            >
                              {selectedProduct.id === product.id && (
                                <div className="color-checkmark">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            {product.color && (
                              <span className="color-name">{product.color}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Ürün Özellikleri - Gerçek özellikler */}
                {(selectedProduct.mountingType || selectedProduct.material || selectedProduct.lightTransmittance || 
                  selectedProduct.usageArea || selectedProduct.pieceCount || selectedProduct.color) && (
                  <div className="product-features">
                    {selectedProduct.mountingType && (
                      <div className="feature-tag">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span>Takma Şekli: {selectedProduct.mountingType}</span>
                      </div>
                    )}
                    {selectedProduct.material && (
                      <div className="feature-tag">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                        <span>Materyal: {selectedProduct.material}</span>
                      </div>
                    )}
                    {selectedProduct.lightTransmittance && (
                      <div className="feature-tag">
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
                      <div className="feature-tag">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Kullanım Alanı: {selectedProduct.usageArea}</span>
                      </div>
                    )}
                    {selectedProduct.pieceCount && selectedProduct.pieceCount > 0 && (
                      <div className="feature-tag">
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

                {/* Ürün Açıklaması */}
                {selectedProduct.description && (
                  <div className="product-description">
                    <p>{selectedProduct.description}</p>
                  </div>
                )}

                {/* Detay Butonu */}
                <button
                  className="view-product-detail-btn"
                  onClick={() => handleProductClick(selectedProduct.id)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Ürün Detayını Görüntüle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detay Fotoğraf Modal */}
      {isDetailModalOpen && selectedProduct && selectedProduct.detailImages && selectedProduct.detailImages.length > 0 && (
        <div 
          className="detail-modal-overlay"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div 
            className="detail-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="detail-modal-close"
              onClick={() => setIsDetailModalOpen(false)}
              aria-label="Kapat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <LazyImage
              src={selectedProduct.detailImages[0]}
              alt={`${selectedProduct.name} detay`}
              className="detail-modal-image"
            />
          </div>
        </div>
      )}
    </>
  )
}

export default CategoryDetail


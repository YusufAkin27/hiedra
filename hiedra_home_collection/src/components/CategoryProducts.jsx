import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import LazyImage from './LazyImage'
import SEO from './SEO'
import './CategoryProducts.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const CategoryProducts = () => {
  const { categoryName } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)

  // Backend'den ürünleri çek
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${API_BASE_URL}/products`)
        if (response.ok) {
          const data = await response.json()
          if (data.isSuccess || data.success) {
            const productsData = data.data || []
            // Backend formatını frontend formatına çevir
            const formattedProducts = productsData.map(product => ({
              id: product.id,
              name: product.name,
              price: product.price ? parseFloat(product.price) : 0,
              image: product.coverImageUrl || '/images/perde1kapak.jpg',
              detailImages: product.detailImageUrl ? [product.detailImageUrl] : [],
              description: product.description || '',
              category: product.category?.name || 'Genel',
              color: product.color || '',
              inStock: (product.quantity || 0) > 0,
              productCode: product.productCode || product.code || '',
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
            
            // Kategori adını decode et ve normalize et
            const decodedCategoryName = decodeURIComponent(categoryName || '')
            const normalizedCategoryName = decodedCategoryName
              .replace(/-/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
            
            // Kategoriye göre filtrele
            const categoryProducts = formattedProducts.filter(product => {
              const productCategory = product.category || ''
              return productCategory.toLowerCase() === normalizedCategoryName.toLowerCase() ||
                     productCategory.toLowerCase().includes(normalizedCategoryName.toLowerCase()) ||
                     normalizedCategoryName.toLowerCase().includes(productCategory.toLowerCase())
            })
            
            setProducts(categoryProducts)
            
            // İlk ürünü seçili yap
            if (categoryProducts.length > 0) {
              setSelectedProductId(categoryProducts[0].id)
            }
          }
        }
      } catch (error) {
        console.error('Ürünler yüklenirken hata:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (categoryName) {
      fetchProducts()
    }
  }, [categoryName])

  // Renklere göre grupla
  const productsByColor = useMemo(() => {
    const colorMap = {}
    
    products.forEach(product => {
      if (product.color) {
        const color = product.color.trim()
        if (!colorMap[color]) {
          colorMap[color] = []
        }
        colorMap[color].push(product)
      }
    })
    
    return colorMap
  }, [products])

  // Renk listesi (alfabetik sıralı)
  const colors = useMemo(() => {
    return Object.keys(productsByColor).sort()
  }, [productsByColor])

  // Seçili ürün
  const selectedProduct = useMemo(() => {
    if (selectedColor && productsByColor[selectedColor] && productsByColor[selectedColor].length > 0) {
      return productsByColor[selectedColor][0]
    }
    if (selectedProductId) {
      return products.find(p => p.id === selectedProductId) || products[0]
    }
    return products[0] || null
  }, [selectedProductId, selectedColor, products, productsByColor])

  // Renk seçildiğinde
  const handleColorSelect = (color) => {
    setSelectedColor(color)
    if (productsByColor[color] && productsByColor[color].length > 0) {
      setSelectedProductId(productsByColor[color][0].id)
    }
  }

  // Ürün seçildiğinde
  const handleProductSelect = (productId) => {
    setSelectedProductId(productId)
    const product = products.find(p => p.id === productId)
    if (product && product.color) {
      setSelectedColor(product.color.trim())
    }
  }

  // Ürün detay sayfasına git
  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`)
  }

  if (isLoading) {
    return (
      <div className="category-products-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Ürünler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    const decodedCategoryName = decodeURIComponent(categoryName || '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
    
    return (
      <div className="category-products-container">
        <div className="category-not-found">
          <h2>{decodedCategoryName} kategorisinde ürün bulunamadı</h2>
          <p>Bu kategoride henüz ürün bulunmamaktadır.</p>
          <Link to="/" className="back-to-home-btn">Ana Sayfaya Dön</Link>
        </div>
      </div>
    )
  }

  const decodedCategoryName = decodeURIComponent(categoryName || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  const allImages = selectedProduct?.detailImages 
    ? [selectedProduct.image, ...selectedProduct.detailImages]
    : [selectedProduct?.image]

  return (
    <div className="category-products-container">
      <SEO
        title={`${decodedCategoryName} - Perde Satış | Hiedra`}
        description={`${decodedCategoryName} kategorisindeki tüm perde modelleri. Kaliteli kumaş, uygun fiyat, hızlı teslimat.`}
        url={`/category/${categoryName}`}
      />
      
      <header className="category-header">
        <h1>{decodedCategoryName}</h1>
        <p>{products.length} ürün bulundu</p>
      </header>

      <div className="category-products-content">
        {/* Sol taraf - Ana ürün gösterimi */}
        <div className="main-product-section">
          {selectedProduct && (
            <>
              <div className="main-product-image-wrapper" onClick={() => handleProductClick(selectedProduct.id)}>
                {/* Etiketler */}
                <div className="product-badges-top">
                  <span className="badge badge-return">14 Gün Koşulsuz İade</span>
                  <span className="badge badge-shipping">Ücretsiz Kargo</span>
                  {selectedProduct.inStock && (
                    <span className="badge badge-stock">Stokta Var</span>
                  )}
                </div>
                
                <LazyImage 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="main-product-image"
                />
                
                {/* Detay fotoğrafı göster */}
                {selectedProduct.detailImages && selectedProduct.detailImages.length > 0 && (
                  <div className="detail-image-preview">
                    <LazyImage 
                      src={selectedProduct.detailImages[0]} 
                      alt={`${selectedProduct.name} detay fotoğrafı`}
                      className="detail-preview-image"
                    />
                    <div className="detail-preview-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                      <span>Detay Fotoğrafı</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="main-product-info">
                <div className="product-header">
                  <div className="product-category-badge">{selectedProduct.category}</div>
                  <h2 className="product-name">{selectedProduct.name}</h2>
                  {selectedProduct.productCode && (
                    <div className="product-code-display">
                      <span className="code-label">Ürün Kodu:</span>
                      <span className="code-value">{selectedProduct.productCode}</span>
                    </div>
                  )}
                  <div className="product-price-section">
                    <span className="price-label">Başlangıç:</span>
                    <span className="price-value">{selectedProduct.price.toFixed(2)} ₺</span>
                  </div>
                  {selectedProduct.inStock && (
                    <div className="stock-status">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Stokta Var</span>
                    </div>
                  )}
                </div>

                {/* Yıldız Puanı ve Yorum Sayısı */}
                {((selectedProduct.averageRating && selectedProduct.averageRating > 0) || (selectedProduct.reviewCount && selectedProduct.reviewCount > 0)) && (
                  <div className="product-rating-section">
                    <div className="rating-stars">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const rating = selectedProduct.averageRating || 0;
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
                      {selectedProduct.averageRating > 0 && (
                        <span className="rating-value">{selectedProduct.averageRating.toFixed(1)}</span>
                      )}
                    </div>
                    {selectedProduct.reviewCount > 0 && (
                      <span className="review-count">({selectedProduct.reviewCount} {selectedProduct.reviewCount === 1 ? 'yorum' : 'yorum'})</span>
                    )}
                  </div>
                )}

                {selectedProduct.description && (
                  <p className="product-description">{selectedProduct.description}</p>
                )}

                {/* Ürün Özellikleri */}
                <div className="product-specifications">
                  <h4 className="specifications-title">Ürün Özellikleri</h4>
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
                    {selectedProduct.pieceCount && (
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
                  </div>
                </div>

                <button 
                  className="customize-btn"
                  onClick={() => handleProductClick(selectedProduct.id)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Özelleştir & Sipariş Ver
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sağ taraf - Renk skalası */}
        {colors.length > 0 && (
          <div className="color-palette-section">
            <h3 className="color-palette-title">Renk Seçenekleri</h3>
            <div className="color-palette">
              {colors.map((color) => {
                const colorProducts = productsByColor[color]
                const isSelected = selectedColor === color
                const productCount = colorProducts.length
                
                return (
                  <button
                    key={color}
                    className={`color-button ${isSelected ? 'active' : ''}`}
                    onClick={() => handleColorSelect(color)}
                    title={`${color} (${productCount} ürün)`}
                  >
                    <div className="color-button-content">
                      <div className="color-name">{color}</div>
                      <div className="color-count">{productCount} ürün</div>
                    </div>
                    {isSelected && (
                      <div className="color-check">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Diğer ürünler grid */}
      {products.length > 1 && (
        <section className="other-products-section">
          <h3 className="other-products-title">Aynı Kategorideki Diğer Ürünler</h3>
          <div className="other-products-grid">
            {products
              .filter(p => p.id !== selectedProduct?.id)
              .map(product => (
                <div
                  key={product.id}
                  className="other-product-card"
                  onClick={() => handleProductSelect(product.id)}
                >
                  <div className="other-product-image-wrapper">
                    <LazyImage 
                      src={product.image}
                      alt={product.name}
                      className="other-product-image"
                    />
                    {product.color && (
                      <div className="other-product-color-badge">{product.color}</div>
                    )}
                  </div>
                  <div className="other-product-info">
                    <h4>{product.name}</h4>
                    <p className="other-product-price">{product.price.toFixed(2)} ₺</p>
                    {product.inStock && (
                      <span className="other-product-stock">Stokta</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default CategoryProducts


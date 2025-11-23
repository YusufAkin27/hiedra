import React, { useState, memo, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import LazyImage from './LazyImage'
import './ProductCard.css'

const ProductCard = ({ product }) => {
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [selectedImage, setSelectedImage] = useState(0)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Tüm görselleri birleştir - useMemo ile optimize et
  const allImages = useMemo(() => 
    product.detailImages 
      ? [product.image, ...product.detailImages]
      : [product.image],
    [product.image, product.detailImages]
  )

  const handleAddToCart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Detay sayfasına yönlendir - orada fiyatlandırma formu var
    navigate(`/product/${product.id}`)
  }, [navigate, product.id])

  const handleDetailClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDetailModal(true)
  }, [])

  const handleImageClick = useCallback((e, index) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedImage(index)
  }, [])

  return (
    <>
      <div className="product-card">
        {/* Üst Badge - Kategori */}
        <div className="product-badge-container">
          <span className="product-badge category-badge-top">
            {product.category}
          </span>
        </div>

        <div className="product-card-link">
          <div className="product-card-content">
            {/* Ana görsel - İçinde sol üstte detay thumbnailleri */}
            <Link to={`/product/${product.id}`} className="product-main-image-wrapper">
              <div className="product-main-image-container">
                <LazyImage
                  src={allImages[selectedImage]}
                  alt={`${product.name} - ${product.category} perde modeli`}
                  className="product-main-image"
                  width={400}
                  height={400}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                />
                <div className="image-gradient-overlay"></div>
                <div className="image-count-indicator">
                  {selectedImage + 1} / {allImages.length}
                </div>
                
                {/* Sol üstte - Detay thumbnailleri */}
                <div className="product-side-thumbnails-inside">
                  {allImages.slice(0, 3).map((img, index) => (
                    <button
                      key={index}
                      className={`side-thumbnail-inside ${selectedImage === index ? 'active' : ''}`}
                      onClick={(e) => handleImageClick(e, index)}
                      onMouseEnter={() => setSelectedImage(index)}
                      aria-label={`${product.name} görsel ${index + 1}'i göster`}
                    >
                      <LazyImage 
                        src={img} 
                        alt=""
                        className="thumbnail-image"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
                
                {/* Sağ altta detay fotoğrafı butonu */}
                {allImages.length > 3 && (
                  <button 
                    className="detail-photo-btn-inside"
                    onClick={handleDetailClick}
                    title="Detay fotoğrafı görüntüle"
                  >
                    <LazyImage 
                      src={allImages[3]} 
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
            </Link>

            {/* Sağ taraf - Bilgiler */}
            <div className="product-info-panel">
              <div className="product-header-info">
                <span className="product-category">{product.category}</span>
                <h3 className="product-name">{product.name}</h3>
                {product.productCode && (
                  <span className="product-code">Ürün Kodu: <strong>{product.productCode}</strong></span>
                )}
              </div>
              
              <p className="product-description">{product.description}</p>
              
              {/* Ürün Özellikleri */}
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
              </div>
              
              <div className="product-footer">
                <div className="price-section">
                  <div className="price-wrapper">
                    <span className="price-label">Fiyat</span>
                    <span className="product-price">{product.price} ₺</span>
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button 
                    className="add-cart-btn-large" 
                    onClick={handleAddToCart}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
                      <circle cx="7" cy="20" r="2" />
                      <circle cx="17" cy="20" r="2" />
                    </svg>
                    Sepete Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detay Fotoğraf Modal */}
      {showDetailModal && allImages.length > 0 && (
        <div className="detail-modal" onClick={() => setShowDetailModal(false)}>
          <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDetailModal(false)}>
              ×
            </button>
            <LazyImage 
              src={allImages[allImages.length > 3 ? 3 : allImages.length - 1]} 
              alt={`${product.name} - ${product.category} perde modeli detay fotoğrafı`}
              className="modal-image"
            />
          </div>
        </div>
      )}
    </>
  )
}

// React.memo ile gereksiz re-render'ları önle
export default memo(ProductCard)

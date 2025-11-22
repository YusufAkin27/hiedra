import { useEffect, useState } from 'react'
import { FaEdit, FaArrowLeft } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'

type ProductDetailPageProps = {
  session: AuthResponse
  productId: number
  onBack: () => void
  onEdit: (id: number) => void
}

type Review = {
  id: number
  rating: number
  comment?: string
  imageUrls: string[]
  createdAt: string
  user: {
    id: number
    email: string
  }
}

type Product = {
  id: number
  name: string
  price: number
  quantity: number
  description?: string
  width?: number
  height?: number
  pleatType?: string
  coverImageUrl?: string
  detailImageUrl?: string
  category?: {
    id: number
    name: string
  }
  mountingType?: string
  material?: string
  lightTransmittance?: string
  pieceCount?: number
  color?: string
  usageArea?: string
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function ProductDetailPage({ session, productId, onBack, onEdit }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/admin/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Ürün yüklenemedi.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Product
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Ürün yüklenemedi.')
        }

        setProduct(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

        fetchProduct()
        fetchReviews()
      }, [productId, session.accessToken])

  const fetchReviews = async () => {
    try {
      setIsLoadingReviews(true)
      const response = await fetch(`${apiBaseUrl}/admin/reviews/product/${productId}?activeOnly=true`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Review[]
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setReviews(payload.data)
        }
      }
    } catch (err) {
      console.error('Yorumlar yüklenemedi:', err)
    } finally {
      setIsLoadingReviews(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              fontSize: '1rem',
              color: star <= rating ? '#fbbf24' : '#e5e7eb',
            }}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <p>Yükleniyor...</p>
        </section>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <p className="dashboard-card__feedback dashboard-card__feedback--error">
            {error ?? 'Ürün bulunamadı.'}
          </p>
          <button
            type="button"
            className="dashboard-card__button"
            onClick={onBack}
            style={{ marginTop: '1rem' }}
          >
            Ürünlere Dön
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <button
            type="button"
            className="dashboard-card__button"
            onClick={onBack}
            style={{ marginBottom: '1rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            ← Ürünlere Dön
          </button>
          <h1>{product.name}</h1>
          <p>Ürün Detayları</p>
        </div>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <h2>Ürün Bilgileri</h2>
          <dl className="product-detail-simple-list">
            <div>
              <dt>Ürün ID</dt>
              <dd>{product.id}</dd>
            </div>
            <div>
              <dt>Ürün Adı</dt>
              <dd>{product.name}</dd>
            </div>
            <div>
              <dt>Kategori</dt>
              <dd>{product.category?.name || 'Kategori yok'}</dd>
            </div>
            <div>
              <dt>Fiyat</dt>
              <dd>{product.price.toFixed(2)} ₺</dd>
            </div>
            <div>
              <dt>Stok</dt>
              <dd>
                <span
                  className={`dashboard-card__chip ${
                    product.quantity > 0
                      ? 'dashboard-card__chip--success'
                      : 'dashboard-card__chip--error'
                  }`}
                >
                  {product.quantity}
                </span>
              </dd>
            </div>
            {product.description && (
              <div>
                <dt>Açıklama</dt>
                <dd>{product.description}</dd>
              </div>
            )}
            {product.width && (
              <div>
                <dt>Genişlik</dt>
                <dd>{product.width} cm</dd>
              </div>
            )}
            {product.height && (
              <div>
                <dt>Yükseklik</dt>
                <dd>{product.height} cm</dd>
              </div>
            )}
                {product.pleatType && (
                  <div>
                    <dt>Pile Tipi</dt>
                    <dd>{product.pleatType}</dd>
                  </div>
                )}
              </dl>
            </article>

            {product.description && (
              <article className="dashboard-card dashboard-card--wide">
                <h2>Açıklama</h2>
                <div style={{ 
                  padding: '1.5rem', 
                  backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                  borderRadius: '8px',
                  lineHeight: '1.8',
                  fontSize: '1rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {product.description}
                </div>
              </article>
            )}

            {(product.mountingType || product.material || product.lightTransmittance || 
              product.pieceCount || product.color || product.usageArea || product.pleatType || 
              (product.width && product.height)) && (
              <article className="dashboard-card dashboard-card--wide">
                <h2>Ürün Özellikleri</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1.5rem',
                  marginTop: '1rem'
                }}>
                  {product.mountingType && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Takma Şekli
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.mountingType}
                      </div>
                    </div>
                  )}
                  {product.material && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Materyal
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.material}
                      </div>
                    </div>
                  )}
                  {product.pleatType && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Pile
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.pleatType}
                      </div>
                    </div>
                  )}
                  {product.lightTransmittance && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Işık Geçirgenliği
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.lightTransmittance}
                      </div>
                    </div>
                  )}
                  {product.pieceCount && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Parça Sayısı
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.pieceCount}
                      </div>
                    </div>
                  )}
                  {product.color && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Renk
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.color}
                      </div>
                    </div>
                  )}
                  {product.width && product.height && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Beden
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.width} x {product.height} cm
                      </div>
                    </div>
                  )}
                  {product.usageArea && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(15, 23, 42, 0.02)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>
                        Kullanım Alanı
                      </div>
                      <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>
                        {product.usageArea}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )}

        {product.coverImageUrl && (
          <article className="dashboard-card">
            <h2>Ana Fotoğraf</h2>
            <img
              src={product.coverImageUrl}
              alt={product.name}
              className="product-detail-page-image"
              loading="lazy"
              decoding="async"
            />
          </article>
        )}

        {product.detailImageUrl && (
          <article className="dashboard-card">
            <h2>Detay Fotoğrafı</h2>
            <img
              src={product.detailImageUrl}
              alt={`${product.name} detay`}
              className="product-detail-page-image"
              loading="lazy"
              decoding="async"
            />
          </article>
        )}

        <article className="dashboard-card">
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={() => onEdit(product.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(15, 23, 42, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0f172a'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(15, 23, 42, 0.1)'
              }}
            >
              <FaEdit style={{ fontSize: '0.9rem' }} />
              Düzenle
            </button>
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ffffff',
                color: '#64748b',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)'
                e.currentTarget.style.color = '#475569'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              <FaArrowLeft style={{ fontSize: '0.9rem' }} />
              Geri Dön
            </button>
          </div>
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h2>Ürün Yorumları ({reviews.length})</h2>
          {isLoadingReviews ? (
            <p>Yorumlar yükleniyor...</p>
          ) : reviews.length === 0 ? (
            <p className="dashboard-card__empty">Bu ürün için henüz yorum bulunmuyor.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                          {review.user.email}
                        </span>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(review.createdAt).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  {review.comment && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '6px' }}>
                      <p style={{ margin: 0, lineHeight: '1.6', color: '#0f172a' }}>{review.comment}</p>
                    </div>
                  )}
                  {review.imageUrls && review.imageUrls.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {review.imageUrls.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Yorum fotoğrafı ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            cursor: 'pointer',
                          }}
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default ProductDetailPage


import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './MyReviews.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const MyReviews = () => {
  const { isAuthenticated, accessToken } = useAuth()
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Guest kullanıcıları yönlendir
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/giris', { state: { from: '/yorumlarim' } })
    }
  }, [isAuthenticated, navigate])

  // Yorumları yükle
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchReviews()
    }
  }, [isAuthenticated, accessToken])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${API_BASE_URL}/reviews/my-reviews`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (response.ok && (data.isSuccess || data.success)) {
        setReviews(data.data || [])
      } else {
        setError(data.message || 'Yorumlar yüklenemedi')
      }
    } catch (err) {
      console.error('Yorumlar yüklenirken hata:', err)
      setError('Yorumlar yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        setSuccess('Yorum silindi')
        fetchReviews()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Yorum silinemedi')
      }
    } catch (err) {
      console.error('Yorum silinirken hata:', err)
      setError('Yorum silinirken bir hata oluştu')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'star filled' : 'star'}>
        ★
      </span>
    ))
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="my-reviews-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Yorumlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-reviews-container">
      <div className="my-reviews-header">
        <h1>Yorumlarım</h1>
        {reviews.length > 0 && (
          <span className="review-count">
            {reviews.length} {reviews.length === 1 ? 'yorum' : 'yorum'}
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="no-reviews">
          <p>Henüz yorum yapmamışsınız.</p>
          <Link to="/" className="btn-browse-products">
            Ürünlere Göz At
          </Link>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map(review => (
            <div 
              key={review.id} 
              className={`review-card ${!review.active ? 'inactive' : ''}`}
            >
              {!review.active && (
                <div className="inactive-badge">Silinmiş</div>
              )}
              
              <div className="review-header">
                <div className="review-product">
                  {review.product && (
                    <Link 
                      to={`/product/${review.product.id}`}
                      className="product-link"
                    >
                      <img 
                        src={review.product.coverImageUrl || review.product.image || '/images/perde1kapak.jpg'} 
                        alt={review.product.name}
                        className="product-image"
                      />
                      <div className="product-info">
                        <h3>{review.product.name}</h3>
                        <p className="product-category">
                          {review.product.category?.name || 'Genel'}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
                
                <div className="review-rating">
                  <div className="stars">
                    {renderStars(review.rating || 0)}
                  </div>
                  <span className="rating-value">{review.rating}/5</span>
                </div>
              </div>

              {review.comment && (
                <div className="review-comment">
                  <p>{review.comment}</p>
                </div>
              )}

              {review.imageUrls && review.imageUrls.length > 0 && (
                <div className="review-images">
                  {review.imageUrls.map((imageUrl, index) => (
                    <img 
                      key={index}
                      src={imageUrl} 
                      alt={`Yorum fotoğrafı ${index + 1}`}
                      className="review-image"
                      onClick={() => window.open(imageUrl, '_blank')}
                    />
                  ))}
                </div>
              )}

              <div className="review-footer">
                <span className="review-date">
                  {formatDate(review.createdAt)}
                  {review.updatedAt && review.updatedAt !== review.createdAt && (
                    <span className="updated-badge"> (Güncellendi)</span>
                  )}
                </span>
                
                {review.active && (
                  <div className="review-actions">
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(review.id)}
                    >
                      Sil
                    </button>
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

export default MyReviews


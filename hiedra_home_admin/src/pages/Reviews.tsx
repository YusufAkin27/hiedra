import { useEffect, useState } from 'react'
import { FaCheckCircle, FaCalendar, FaClipboard, FaChartBar, FaEye, FaTrash, FaPause, FaPlay, FaBox, FaTable, FaUser, FaFileAlt, FaStar, FaCalendarAlt, FaUndo, FaExclamationTriangle } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type ReviewsPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
}

type Review = {
  id: number
  rating: number
  comment?: string
  imageUrls: string[]
  active: boolean
  createdAt: string
  product: {
    id: number
    name: string
  }
  user: {
    id: number
    email: string
  }
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function ReviewsPage({ session, toast }: ReviewsPageProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeOnly, setActiveOnly] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [session.accessToken, activeOnly, selectedProductId])

  const fetchReviews = async () => {
    try {
      setIsLoading(true)

      let url = `${apiBaseUrl}/admin/reviews?activeOnly=${activeOnly}`
      if (selectedProductId) {
        url = `${apiBaseUrl}/admin/reviews/product/${selectedProductId}?activeOnly=${activeOnly}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Yorumlar yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Review[]
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Yorumlar yüklenemedi.')
      }

      setReviews(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; reviewId: number | null; hardDelete: boolean }>({
    isOpen: false,
    reviewId: null,
    hardDelete: false,
  })

  const handleDeleteClick = (id: number, hardDelete: boolean = false) => {
    setDeleteModal({ isOpen: true, reviewId: id, hardDelete })
  }

  const handleDeleteReview = async () => {
    if (!deleteModal.reviewId) {
      return
    }

    try {
      const url = `${apiBaseUrl}/admin/reviews/${deleteModal.reviewId}${deleteModal.hardDelete ? '?hardDelete=true' : ''}`
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        await fetchReviews()
        toast.success(deleteModal.hardDelete ? 'Yorum kalıcı olarak silindi.' : 'Yorum başarıyla silindi.')
        setDeleteModal({ isOpen: false, reviewId: null, hardDelete: false })
      } else {
        const payload = (await response.json()) as { message?: string }
        throw new Error(payload.message ?? 'Yorum silinemedi.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yorum silinemedi.'
      toast.error(message)
    }
  }

  const handleToggleActive = async (id: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/reviews/${id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        await fetchReviews()
        toast.success('Yorum durumu güncellendi.')
      } else {
        const payload = (await response.json()) as { message?: string }
        throw new Error(payload.message ?? 'Yorum durumu güncellenemedi.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yorum durumu güncellenemedi.'
      toast.error(message)
    }
  }

  const handleRestore = async (id: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/reviews/${id}/restore`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        await fetchReviews()
        toast.success('Yorum başarıyla geri yüklendi.')
      } else {
        const payload = (await response.json()) as { message?: string }
        throw new Error(payload.message ?? 'Yorum geri yüklenemedi.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yorum geri yüklenemedi.'
      toast.error(message)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Kopyalandı!')
    })
  }

  // Time ago utility
  const getTimeAgo = (date: string): string => {
    const now = new Date()
    const reviewDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - reviewDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Az önce'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`
    return reviewDate.toLocaleDateString('tr-TR')
  }

  // Filtreleme ve sayfalama
  const filteredReviews = reviews.filter((review) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        review.product.name.toLowerCase().includes(search) ||
        review.product.id.toString().includes(search) ||
        review.user.email.toLowerCase().includes(search) ||
        (review.comment && review.comment.toLowerCase().includes(search)) ||
        review.id.toString().includes(search)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedReviews = filteredReviews.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: reviews.length,
    active: reviews.filter((r) => r.active).length,
    inactive: reviews.filter((r) => !r.active).length,
    averageRating: reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0,
    withImages: reviews.filter((r) => r.imageUrls && r.imageUrls.length > 0).length,
    withComments: reviews.filter((r) => r.comment && r.comment.trim().length > 0).length,
    today: reviews.filter((r) => {
      const today = new Date()
      const reviewDate = new Date(r.createdAt)
      return today.toDateString() === reviewDate.toDateString()
    }).length,
    thisWeek: reviews.filter((r) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(r.createdAt) >= weekAgo
    }).length,
  }

  const renderStars = (rating: number) => {
    return (
      <div className="reviews-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`reviews-star ${star <= rating ? 'reviews-star--filled' : 'reviews-star--empty'}`}
          >
            ★
          </span>
        ))}
        <span className="reviews-rating-text">({rating}/5)</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <p>Yükleniyor...</p>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Yorum Yönetimi</p>
          <h1>Ürün Yorumları</h1>
          <p>Tüm ürün yorumlarını görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid reviews-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="reviews-stats__title">Genel İstatistikler</h3>
          <div className="reviews-stats__grid">
            <div className="reviews-stat-card reviews-stat-card--primary">
              <div className="reviews-stat-card__icon">💬</div>
              <div className="reviews-stat-card__value">{stats.total}</div>
              <div className="reviews-stat-card__label">Toplam Yorum</div>
              <div className="reviews-stat-card__subtitle">Tüm yorumlar</div>
            </div>
            <div className="reviews-stat-card reviews-stat-card--success">
              <div className="reviews-stat-card__icon"><FaCheckCircle /></div>
              <div className="reviews-stat-card__value">{stats.active}</div>
              <div className="reviews-stat-card__label">Aktif</div>
              <div className="reviews-stat-card__subtitle">Yayında</div>
            </div>
            <div className="reviews-stat-card reviews-stat-card--warning">
              <div className="reviews-stat-card__icon"><FaPause /></div>
              <div className="reviews-stat-card__value">{stats.inactive}</div>
              <div className="reviews-stat-card__label">Pasif</div>
              <div className="reviews-stat-card__subtitle">Yayında değil</div>
            </div>
            <div className="reviews-stat-card reviews-stat-card--info">
              <div className="reviews-stat-card__icon"><FaStar /></div>
              <div className="reviews-stat-card__value">{stats.averageRating.toFixed(1)}</div>
              <div className="reviews-stat-card__label">Ortalama Puan</div>
              <div className="reviews-stat-card__subtitle">5 üzerinden</div>
            </div>
            <div className="reviews-stat-card reviews-stat-card--info">
              <div className="reviews-stat-card__icon">📷</div>
              <div className="reviews-stat-card__value">{stats.withImages}</div>
              <div className="reviews-stat-card__label">Fotoğraflı</div>
              <div className="reviews-stat-card__subtitle">Resim içeren</div>
            </div>
            <div className="reviews-stat-card reviews-stat-card--success">
              <div className="reviews-stat-card__icon"><FaFileAlt /></div>
              <div className="reviews-stat-card__value">{stats.withComments}</div>
              <div className="reviews-stat-card__label">Yorumlu</div>
              <div className="reviews-stat-card__subtitle">Yazı içeren</div>
            </div>
            <div className="reviews-stat-card reviews-stat-card--info">
              <div className="reviews-stat-card__icon"><FaCalendar /></div>
              <div className="reviews-stat-card__value">{stats.today}</div>
              <div className="reviews-stat-card__label">Bugün</div>
              <div className="reviews-stat-card__subtitle">Bugün eklenen</div>
            </div>
            <div className="reviews-stat-card reviews-stat-card--info">
              <div className="reviews-stat-card__icon"><FaCalendarAlt /></div>
              <div className="reviews-stat-card__value">{stats.thisWeek}</div>
              <div className="reviews-stat-card__label">Bu Hafta</div>
              <div className="reviews-stat-card__subtitle">Son 7 gün</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="reviews-filters">
            <div className="reviews-filters__row">
              <div className="reviews-filters__search">
                <input
                  type="text"
                  className="reviews-filters__input"
                  placeholder="Yorum ara (ürün adı, ID, kullanıcı, yorum...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="reviews-filters__actions">
                <input
                  type="number"
                  className="reviews-filters__product-id"
                  placeholder="Ürün ID"
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value)
                    setCurrentPage(1)
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary reviews-view-toggle reviews-view-toggle--desktop"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                >
                  {viewMode === 'table' ? <><FaTable style={{ marginRight: '0.5rem' }} /> Kart</> : <><FaChartBar style={{ marginRight: '0.5rem' }} /> Tablo</>}
                </button>
                {(searchTerm || selectedProductId) && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedProductId('')
                      setCurrentPage(1)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
            <div className="reviews-filters__row">
              <label className="reviews-filters__checkbox-label">
                <input
                  type="checkbox"
                  className="reviews-filters__checkbox"
                  checked={activeOnly}
                  onChange={(e) => {
                    setActiveOnly(e.target.checked)
                    setCurrentPage(1)
                  }}
                />
                <span className="reviews-filters__checkbox-text"><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Sadece Aktif Yorumlar</span>
              </label>
            </div>
          </div>

          {/* Header */}
          <div className="reviews-header">
            <div className="reviews-header__info">
              <span className="reviews-header__count">
                Toplam: <strong>{filteredReviews.length}</strong> yorum
              </span>
              {filteredReviews.length !== reviews.length && (
                <span className="reviews-header__filtered">
                  (Filtrelenmiş: {filteredReviews.length} / {reviews.length})
                </span>
              )}
            </div>
            <div className="reviews-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="dashboard-card__empty">Henüz yorum bulunmuyor.</p>
          ) : filteredReviews.length === 0 ? (
            <p className="dashboard-card__empty">Arama kriterlerinize uygun yorum bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table reviews-table-desktop ${viewMode === 'table' ? '' : 'reviews-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ürün</th>
                      <th>Kullanıcı</th>
                      <th>Puan</th>
                      <th>Yorum</th>
                      <th>Fotoğraflar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReviews.map((review) => (
                      <tr key={review.id}>
                        <td>
                          <div className="reviews-table__id">#{review.id}</div>
                        </td>
                        <td>
                          <div className="reviews-table__product">
                            <div className="reviews-table__product-name">{review.product.name}</div>
                            <div className="reviews-table__product-id">ID: {review.product.id}</div>
                          </div>
                        </td>
                        <td>
                          <div className="reviews-table__user">
                            <span className="reviews-table__user-email">{review.user.email}</span>
                          </div>
                        </td>
                        <td>
                          {renderStars(review.rating)}
                        </td>
                        <td>
                          <div className="reviews-table__comment" title={review.comment || ''}>
                            {review.comment ? (review.comment.length > 50 ? review.comment.substring(0, 50) + '...' : review.comment) : '-'}
                          </div>
                        </td>
                        <td>
                          <div className="reviews-table__images">
                            {review.imageUrls && review.imageUrls.length > 0 ? (
                              <span className="reviews-table__images-count">📷 {review.imageUrls.length}</span>
                            ) : (
                              <span className="reviews-table__images-empty">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`dashboard-card__chip ${review.active ? 'dashboard-card__chip--success' : 'dashboard-card__chip--error'}`}
                          >
                            {review.active ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaPause style={{ marginRight: '0.25rem' }} /> Pasif</>}
                          </span>
                        </td>
                        <td>
                          <div className="reviews-table__date">
                            {new Date(review.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="reviews-table__actions">
                            <button
                              type="button"
                              className="reviews-table__btn reviews-table__btn--info"
                              onClick={() => setSelectedReview(review)}
                              title="Detayları Gör"
                            >
                              <FaEye />
                            </button>
                            <button
                              type="button"
                              className={`reviews-table__btn ${review.active ? 'reviews-table__btn--warning' : 'reviews-table__btn--success'}`}
                              onClick={() => handleToggleActive(review.id)}
                              title={review.active ? 'Pasif Et' : 'Aktif Et'}
                            >
                              {review.active ? <FaPause /> : <FaPlay />}
                            </button>
                            <button
                              type="button"
                              className="reviews-table__btn reviews-table__btn--danger"
                              onClick={() => handleDeleteClick(review.id, false)}
                              title="Sil"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`reviews-cards ${viewMode === 'cards' ? '' : 'reviews-cards--hidden'}`}>
                {paginatedReviews.map((review) => (
                  <div key={review.id} className={`review-card ${!review.active ? 'review-card--inactive' : ''}`}>
                    <div className="review-card__header">
                      <div className="review-card__header-left">
                        <div className="review-card__product">
                          <div className="review-card__product-name"><FaBox style={{ marginRight: '0.25rem' }} /> {review.product.name}</div>
                          <div className="review-card__product-id">ID: {review.product.id}</div>
                        </div>
                        <div className="review-card__user">
                          <div className="review-card__user-icon"><FaUser /></div>
                          <div className="review-card__user-email">{review.user.email}</div>
                        </div>
                      </div>
                      <div className="review-card__header-right">
                        <span
                          className={`review-card__badge ${review.active ? 'review-card__badge--success' : 'review-card__badge--error'}`}
                        >
                          {review.active ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaPause style={{ marginRight: '0.25rem' }} /> Pasif</>}
                        </span>
                        <div className="review-card__id">#{review.id}</div>
                      </div>
                    </div>
                    <div className="review-card__body">
                      <div className="review-card__rating">
                        {renderStars(review.rating)}
                      </div>
                      {review.comment && (
                        <div className="review-card__comment">
                          <div className="review-card__comment-label">💬 Yorum</div>
                          <div className="review-card__comment-text">{review.comment}</div>
                        </div>
                      )}
                      {review.imageUrls && review.imageUrls.length > 0 && (
                        <div className="review-card__images">
                          <div className="review-card__images-label">📷 Fotoğraflar ({review.imageUrls.length})</div>
                          <div className="review-card__images-grid">
                            {review.imageUrls.map((imageUrl, index) => (
                              <div
                                key={index}
                                className="review-card__image-wrapper"
                                onClick={() => window.open(imageUrl, '_blank')}
                              >
                                <img
                                  src={imageUrl}
                                  alt={`Yorum fotoğrafı ${index + 1}`}
                                  className="review-card__image"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="review-card__date">
                        <div className="review-card__date-icon"><FaCalendar /></div>
                        <div className="review-card__date-content">
                          <div className="review-card__date-main">
                            {new Date(review.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="review-card__date-ago">{getTimeAgo(review.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="review-card__actions">
                      <button
                        type="button"
                        className="review-card__btn review-card__btn--info"
                        onClick={() => setSelectedReview(review)}
                      >
                        <FaEye style={{ marginRight: '0.25rem' }} /> Detay
                      </button>
                      {!review.active && (
                        <button
                          type="button"
                          className="review-card__btn review-card__btn--success"
                          onClick={() => handleRestore(review.id)}
                        >
                          <FaUndo style={{ marginRight: '0.25rem' }} /> Geri Yükle
                        </button>
                      )}
                      <button
                        type="button"
                        className={`review-card__btn ${review.active ? 'review-card__btn--warning' : 'review-card__btn--success'}`}
                        onClick={() => handleToggleActive(review.id)}
                      >
                        {review.active ? <><FaPause style={{ marginRight: '0.25rem' }} /> Pasif Et</> : <><FaPlay style={{ marginRight: '0.25rem' }} /> Aktif Et</>}
                      </button>
                      <button
                        type="button"
                        className="review-card__btn review-card__btn--danger"
                        onClick={() => handleDeleteClick(review.id, false)}
                      >
                        <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                      </button>
                      <button
                        type="button"
                        className="review-card__btn review-card__btn--danger-dark"
                        onClick={() => handleDeleteClick(review.id, true)}
                      >
                        <FaExclamationTriangle style={{ marginRight: '0.25rem' }} /> Kalıcı Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="reviews-pagination">
                  <button
                    type="button"
                    className="reviews-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="reviews-pagination__btn"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={`reviews-pagination__btn reviews-pagination__btn--number ${
                          currentPage === pageNum ? 'reviews-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="reviews-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="reviews-pagination__btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Son
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </section>

      {/* Yorum Detay Modal */}
      {selectedReview && (
        <div
          className="review-modal-overlay"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="review-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="review-modal__header">
              <h2 className="review-modal__title">Yorum Detayı</h2>
              <button
                type="button"
                className="review-modal__close"
                onClick={() => setSelectedReview(null)}
              >
                ✕
              </button>
            </div>
            <div className="review-modal__content">
              <div className="review-modal__info-grid">
                <div className="review-modal__info-item">
                  <div className="review-modal__info-label">Yorum ID</div>
                  <div className="review-modal__info-value">#{selectedReview.id}</div>
                </div>
                <div className="review-modal__info-item">
                  <div className="review-modal__info-label">Ürün</div>
                  <div className="review-modal__info-value">{selectedReview.product.name}</div>
                  <div className="review-modal__info-subvalue">ID: {selectedReview.product.id}</div>
                </div>
                <div className="review-modal__info-item">
                  <div className="review-modal__info-label">Kullanıcı</div>
                  <div className="review-modal__info-value-group">
                    <span className="review-modal__info-value review-modal__info-value--email">{selectedReview.user.email}</span>
                    <button
                      type="button"
                      className="review-modal__copy-btn"
                      onClick={() => copyToClipboard(selectedReview.user.email)}
                      title="Kopyala"
                    >
                      <FaClipboard />
                    </button>
                  </div>
                </div>
                <div className="review-modal__info-item">
                  <div className="review-modal__info-label">Durum</div>
                  <div className="review-modal__info-value">
                    <span
                      className={`review-modal__badge ${selectedReview.active ? 'review-modal__badge--success' : 'review-modal__badge--error'}`}
                    >
                      {selectedReview.active ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> Aktif</> : <><FaPause style={{ marginRight: '0.25rem' }} /> Pasif</>}
                    </span>
                  </div>
                </div>
                <div className="review-modal__info-item">
                  <div className="review-modal__info-label">Tarih</div>
                  <div className="review-modal__info-value review-modal__info-value--date">
                    {new Date(selectedReview.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="review-modal__info-subvalue">{getTimeAgo(selectedReview.createdAt)}</div>
                </div>
              </div>

              <div className="review-modal__section">
                <div className="review-modal__section-label">PUAN</div>
                <div className="review-modal__rating">
                  {renderStars(selectedReview.rating)}
                </div>
              </div>

              {selectedReview.comment && (
                <div className="review-modal__section">
                  <div className="review-modal__section-label">YORUM</div>
                  <div className="review-modal__comment">
                    {selectedReview.comment}
                  </div>
                </div>
              )}

              {selectedReview.imageUrls && selectedReview.imageUrls.length > 0 && (
                <div className="review-modal__section">
                  <div className="review-modal__section-label">FOTOĞRAFLAR ({selectedReview.imageUrls.length})</div>
                  <div className="review-modal__images">
                    {selectedReview.imageUrls.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="review-modal__image-wrapper"
                        onClick={() => window.open(imageUrl, '_blank')}
                      >
                        <img
                          src={imageUrl}
                          alt={`Yorum fotoğrafı ${index + 1}`}
                          className="review-modal__image"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="review-modal__actions">
                {!selectedReview.active && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => {
                      handleRestore(selectedReview.id)
                      setSelectedReview(null)
                    }}
                  >
                    <FaUndo style={{ marginRight: '0.25rem' }} /> Geri Yükle
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${selectedReview.active ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => {
                    handleToggleActive(selectedReview.id)
                    setSelectedReview(null)
                  }}
                >
                  {selectedReview.active ? <><FaPause style={{ marginRight: '0.25rem' }} /> Pasif Et</> : <><FaPlay style={{ marginRight: '0.25rem' }} /> Aktif Et</>}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    handleDeleteClick(selectedReview.id, false)
                    setSelectedReview(null)
                  }}
                >
                  <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                </button>
                <button
                  type="button"
                  className="btn btn-danger-dark"
                  onClick={() => {
                    handleDeleteClick(selectedReview.id, true)
                    setSelectedReview(null)
                  }}
                >
                  <FaExclamationTriangle style={{ marginRight: '0.25rem' }} /> Kalıcı Sil
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedReview(null)}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        message={deleteModal.hardDelete
          ? 'Bu yorumu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
          : 'Bu yorumu silmek istediğinize emin misiniz?'}
        type="confirm"
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleDeleteReview}
        onCancel={() => setDeleteModal({ isOpen: false, reviewId: null, hardDelete: false })}
      />
    </main>
  )
}

export default ReviewsPage


import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LazyImage from './LazyImage'
import Loading from './Loading'
import SEO from './SEO'
import './CouponDetail.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const CouponDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [coupon, setCoupon] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const { accessToken } = useAuth()

  useEffect(() => {
    fetchCoupon()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken])

  const fetchCoupon = async () => {
    try {
      setIsLoading(true)
      setError('')
      const headers = {
        'Content-Type': 'application/json'
      }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      
      const response = await fetch(`${API_BASE_URL}/coupons`, {
        headers
      })
      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        const foundCoupon = (data.data || []).find(c => c.id === parseInt(id))
        if (foundCoupon) {
          setCoupon(foundCoupon)
        } else {
          setError('Kupon bulunamadı')
        }
      } else {
        setError(data.message || 'Kupon yüklenemedi')
      }
    } catch (err) {
      console.error('Kupon yüklenirken hata:', err)
      setError('Kupon yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
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

  const formatDiscount = (coupon) => {
    if (coupon.type === 'YUZDE') {
      return `%${coupon.discountValue}`
    } else if (coupon.type === 'SABIT_TUTAR') {
      return `${coupon.discountValue} ₺`
    } else {
      return `${coupon.discountValue}`
    }
  }

  const getRemainingDays = (validUntil) => {
    if (!validUntil) return null
    const endDate = new Date(validUntil)
    const today = new Date()
    const diffTime = endDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  if (isLoading) {
    return (
      <div className="coupon-detail-container">
        <SEO
          title="Kupon Detayı | Hiedra Perde"
          description="Kupon detaylarını görüntüleyin."
          url={`/kupon/${id}`}
        />
        <Loading size="large" text="Kupon yükleniyor..." variant="page" />
      </div>
    )
  }

  if (error || !coupon) {
    return (
      <div className="coupon-detail-container">
        <SEO
          title="Kupon Bulunamadı | Hiedra Perde"
          description="Kupon bulunamadı."
          url={`/kupon/${id}`}
        />
        <div className="error-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>{error || 'Kupon bulunamadı'}</h2>
          <button 
            className="back-btn"
            onClick={() => navigate('/kuponlar')}
          >
            Kuponlara Dön
          </button>
        </div>
      </div>
    )
  }

  const remainingDays = getRemainingDays(coupon.validUntil)
  const isExpiringSoon = remainingDays !== null && remainingDays <= 7 && remainingDays > 0
  const isPersonal = coupon.isPersonal === true
  const remainingUsage = coupon.maxUsageCount > 0 
    ? coupon.maxUsageCount - coupon.currentUsageCount 
    : null
  const isLimitedUsage = coupon.maxUsageCount > 0
  const isLowStock = remainingUsage !== null && remainingUsage > 0 && remainingUsage <= 10
  const usagePercentage = coupon.maxUsageCount > 0 
    ? Math.round((coupon.currentUsageCount / coupon.maxUsageCount) * 100) 
    : 0

  return (
    <div className="coupon-detail-container">
      <SEO
        title={`${coupon.name} - Kupon Detayı | Hiedra Perde`}
        description={coupon.description || `Özel indirim kuponu: ${coupon.name}`}
        url={`/kupon/${id}`}
      />

      <button className="back-to-coupons-btn" onClick={() => navigate('/kuponlar')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Kuponlara Dön
      </button>

      <div className="coupon-detail-card">
        {coupon.coverImageUrl && (
          <div className="coupon-detail-cover">
            <LazyImage src={coupon.coverImageUrl} alt={coupon.name} />
            {isPersonal && (
              <div className="personal-badge-detail">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Size Özel</span>
              </div>
            )}
          </div>
        )}

        <div className="coupon-detail-header">
          <div className="coupon-detail-discount">
            <span className="discount-value-large">{formatDiscount(coupon)}</span>
            <span className="discount-label-large">İndirim</span>
          </div>
          <div className="coupon-detail-badges">
            {isExpiringSoon && (
              <div className="expiring-badge-detail">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Yakında bitiyor ({remainingDays} gün kaldı)</span>
              </div>
            )}
            {isLimitedUsage && (
              <div className="limited-usage-badge-detail">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Sınırlı Kullanım</span>
              </div>
            )}
          </div>
        </div>

        <div className="coupon-detail-body">
          <h1 className="coupon-detail-name">{coupon.name}</h1>
          
          {coupon.description && (
            <p className="coupon-detail-description">{coupon.description}</p>
          )}

          <div className="coupon-detail-code-section">
            <label className="coupon-code-label-detail">Kupon Kodu</label>
            <div className="coupon-code-detail">
              <span className="code-text-detail">{coupon.code}</span>
              <button
                className="copy-btn-detail"
                onClick={() => copyToClipboard(coupon.code)}
                title="Kopyala"
              >
                {copiedCode ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
            {copiedCode && (
              <div className="copy-success-detail">Kupon kodu kopyalandı!</div>
            )}
          </div>

          <div className="coupon-detail-info">
            <div className="detail-section">
              <h3 className="detail-section-title">Geçerlilik Tarihleri</h3>
              <div className="detail-item-detail">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div className="detail-content-detail">
                  <span className="detail-label-detail">Başlangıç:</span>
                  <span className="detail-value-detail">{formatDate(coupon.validFrom)}</span>
                </div>
              </div>
              <div className="detail-item-detail">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div className="detail-content-detail">
                  <span className="detail-label-detail">Bitiş:</span>
                  <span className="detail-value-detail">{formatDate(coupon.validUntil)}</span>
                  {remainingDays !== null && remainingDays > 0 && (
                    <span className="remaining-days-detail">({remainingDays} gün kaldı)</span>
                  )}
                </div>
              </div>
            </div>

            {coupon.minimumPurchaseAmount && (
              <div className="detail-section">
                <h3 className="detail-section-title">Kullanım Koşulları</h3>
                <div className="detail-item-detail">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <div className="detail-content-detail">
                    <span className="detail-label-detail">Minimum Alışveriş Tutarı:</span>
                    <span className="detail-value-detail">{parseFloat(coupon.minimumPurchaseAmount).toFixed(2)} ₺</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="coupon-detail-actions">
            <button
              className="use-coupon-btn-detail"
              onClick={() => navigate('/cart')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 2L7 6m6-4l2 4M3 8h18l-1 8H4L3 8z" />
                <circle cx="7" cy="20" r="2" />
                <circle cx="17" cy="20" r="2" />
              </svg>
              Sepete Git ve Kullan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CouponDetail


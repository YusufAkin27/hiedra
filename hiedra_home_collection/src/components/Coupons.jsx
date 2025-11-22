import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LazyImage from './LazyImage'
import Loading from './Loading'
import SEO from './SEO'
import './Coupons.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Coupons = () => {
  const navigate = useNavigate()
  const [coupons, setCoupons] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const { accessToken } = useAuth()

  useEffect(() => {
    fetchCoupons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const fetchCoupons = async () => {
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
        setCoupons(data.data || [])
      } else {
        setError(data.message || 'Kuponlar yüklenemedi')
      }
    } catch (err) {
      console.error('Kuponlar yüklenirken hata:', err)
      setError('Kuponlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
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
      // Fallback for any other type
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

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Kuponlar - Geçerli İndirim Kuponları | Hiedra Perde',
    description: 'Geçerli indirim kuponlarını görüntüleyin ve alışverişinizde kullanın. Özel indirimler ve kampanyalar.',
    url: typeof window !== 'undefined' ? window.location.href : 'https://hiedra.com/kuponlar'
  }

  if (isLoading) {
    return (
      <div className="coupons-container">
        <SEO
          title="Kuponlar - Geçerli İndirim Kuponları | Hiedra Perde"
          description="Geçerli indirim kuponlarını görüntüleyin ve alışverişinizde kullanın."
          url="/kuponlar"
        />
        <Loading size="large" text="Kuponlar yükleniyor..." variant="page" />
      </div>
    )
  }

  return (
    <div className="coupons-container">
      <SEO
        title="Kuponlar - Geçerli İndirim Kuponları | Hiedra Perde"
        description="Geçerli indirim kuponlarını görüntüleyin ve alışverişinizde kullanın. Özel indirimler ve kampanyalar."
        keywords="kupon, indirim kuponu, kupon kodu, perde indirimi, kampanya, özel fırsat"
        url="/kuponlar"
        structuredData={structuredData}
      />


      {error && (
        <div className="error-message">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {!error && coupons.length === 0 && (
        <div className="no-coupons">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h2>Şu anda geçerli kupon bulunmuyor</h2>
          <p>Yeni kampanyalar ve özel fırsatlar için bizi takip edin!</p>
          <button 
            className="back-to-shop-btn"
            onClick={() => navigate('/')}
          >
            Alışverişe Dön
          </button>
        </div>
      )}

      {!error && coupons.length > 0 && (
        <div className="coupons-grid">
          {coupons.map((coupon) => {
            const remainingDays = getRemainingDays(coupon.validUntil)
            const isExpiringSoon = remainingDays !== null && remainingDays <= 7 && remainingDays > 0
            const isPersonal = coupon.isPersonal === true

            return (
              <div 
                key={coupon.id} 
                className={`coupon-card-simple ${isPersonal ? 'personal-coupon' : ''}`}
                onClick={() => navigate(`/kupon/${coupon.id}`)}
              >
                {coupon.coverImageUrl ? (
                  <div className="coupon-cover-image-simple">
                    <LazyImage src={coupon.coverImageUrl} alt={coupon.name} />
                    {isPersonal && (
                      <div className="personal-badge-simple">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Size Özel</span>
                      </div>
                    )}
                    {isExpiringSoon && (
                      <div className="expiring-badge-simple">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Yakında bitiyor</span>
                      </div>
                    )}
                    <div className="coupon-overlay">
                      <div className="coupon-discount-overlay">
                        <span className="discount-value-overlay">{formatDiscount(coupon)}</span>
                        <span className="discount-label-overlay">İndirim</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="coupon-header-simple">
                    <div className="coupon-discount-badge-simple">
                      <span className="discount-value-simple">{formatDiscount(coupon)}</span>
                      <span className="discount-label-simple">İndirim</span>
                    </div>
                    {isPersonal && (
                      <div className="personal-badge-header-simple">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Size Özel</span>
                      </div>
                    )}
                    {isExpiringSoon && (
                      <div className="expiring-badge-header-simple">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Yakında bitiyor</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="coupon-body-simple">
                  <h3 className="coupon-name-simple">{coupon.name}</h3>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Coupons




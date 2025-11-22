import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import SEO from './SEO'
import './TrackShipment.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const TrackShipment = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('trackingNumber') || '')
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '')
  const [email, setEmail] = useState('')
  const [trackingData, setTrackingData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (trackingNumber && orderNumber && email) {
      handleTrackByOrder()
    } else if (trackingNumber) {
      handleTrack()
    }
  }, [])

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      setError('Lütfen takip numarası giriniz')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      
      const url = new URL(`${API_BASE_URL}/shipping/track`)
      url.searchParams.append('trackingNumber', trackingNumber)
      if (orderNumber) {
        url.searchParams.append('orderNumber', orderNumber)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.isSuccess || data.success) {
        setTrackingData(data.data)
      } else {
        setError(data.message || 'Kargo takip bilgisi alınamadı')
        setTrackingData(null)
      }
    } catch (err) {
      console.error('Kargo takip hatası:', err)
      setError('Kargo takip bilgisi alınırken bir hata oluştu')
      setTrackingData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTrackByOrder = async () => {
    if (!orderNumber.trim() || !email.trim()) {
      setError('Lütfen sipariş numarası ve e-posta adresinizi giriniz')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      
      const url = new URL(`${API_BASE_URL}/shipping/track-by-order`)
      url.searchParams.append('orderNumber', orderNumber)
      url.searchParams.append('email', email)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.isSuccess || data.success) {
        setTrackingData(data.data)
        if (data.data.trackingNumber) {
          setTrackingNumber(data.data.trackingNumber)
        }
      } else {
        setError(data.message || 'Kargo takip bilgisi alınamadı')
        setTrackingData(null)
      }
    } catch (err) {
      console.error('Kargo takip hatası:', err)
      setError('Kargo takip bilgisi alınırken bir hata oluştu')
      setTrackingData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusText = (status) => {
    if (!status) return 'Bilinmiyor'
    const statusMap = {
      'IN_TRANSIT': 'Kargoda',
      'DELIVERED': 'Teslim Edildi',
      'EXCEPTION': 'Sorun Var',
      'PENDING': 'Beklemede',
      'PICKED_UP': 'Kargo Alındı',
      'OUT_FOR_DELIVERY': 'Teslimat İçin Yola Çıktı'
    }
    return statusMap[status] || status
  }

  const getStatusClass = (status) => {
    if (!status) return 'tracking-status-unknown'
    const statusUpper = status.toUpperCase()
    if (statusUpper === 'DELIVERED') return 'tracking-status-delivered'
    if (statusUpper === 'IN_TRANSIT' || statusUpper === 'OUT_FOR_DELIVERY') return 'tracking-status-transit'
    if (statusUpper === 'EXCEPTION') return 'tracking-status-exception'
    return 'tracking-status-pending'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="track-shipment-page">
      <SEO
        title="Kargo Takip - HIEDRA HOME COLLECTION"
        description="Siparişinizin kargo durumunu takip edin"
        url="/kargo-takip"
      />

      <div className="track-shipment-container">
        <h1>Kargo Takip</h1>

        <div className="track-shipment-form">
          <div className="form-section">
            <h2>Takip Numarası ile Sorgula</h2>
            <div className="form-group">
              <label>Kargo Takip Numarası</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Örn: 1234567890"
              />
            </div>
            <div className="form-group">
              <label>Sipariş Numarası (Opsiyonel)</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Örn: ORD-20251109-1234"
              />
            </div>
            <button onClick={handleTrack} disabled={isLoading} className="btn-track">
              {isLoading ? 'Sorgulanıyor...' : 'Sorgula'}
            </button>
          </div>

          <div className="form-divider">veya</div>

          <div className="form-section">
            <h2>Sipariş Numarası ile Sorgula</h2>
            <div className="form-group">
              <label>Sipariş Numarası</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Örn: ORD-20251109-1234"
              />
            </div>
            <div className="form-group">
              <label>E-posta Adresiniz</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sipariş@example.com"
              />
            </div>
            <button onClick={handleTrackByOrder} disabled={isLoading} className="btn-track">
              {isLoading ? 'Sorgulanıyor...' : 'Sorgula'}
            </button>
          </div>
        </div>

        {error && (
          <div className="tracking-error">
            <p>{error}</p>
          </div>
        )}

        {trackingData && (
          <div className="tracking-results">
            <div className="tracking-header">
              <h2>Kargo Takip Bilgileri</h2>
              <div className="tracking-info">
                <div className="info-item">
                  <strong>Takip Numarası:</strong> {trackingData.trackingNumber}
                </div>
                <div className="info-item">
                  <strong>Kargo Firması:</strong> {trackingData.carrier || 'DHL'}
                </div>
                {trackingData.orderNumber && (
                  <div className="info-item">
                    <strong>Sipariş Numarası:</strong> {trackingData.orderNumber}
                  </div>
                )}
              </div>
            </div>

            <div className="tracking-status">
              <div className={`status-badge ${getStatusClass(trackingData.status)}`}>
                {getStatusText(trackingData.status)}
              </div>
              {trackingData.statusDescription && (
                <p className="status-description">{trackingData.statusDescription}</p>
              )}
            </div>

            {trackingData.events && trackingData.events.length > 0 && (
              <div className="tracking-events">
                <h3>Kargo Hareketleri</h3>
                <div className="events-timeline">
                  {trackingData.events.map((event, index) => (
                    <div key={index} className="event-item">
                      <div className="event-time">
                        {formatDate(event.timestamp)}
                      </div>
                      <div className="event-content">
                        <div className="event-location">
                          {event.location && <span className="location-icon">📍</span>}
                          {event.location || 'Konum bilgisi yok'}
                        </div>
                        <div className="event-description">
                          {event.description || 'Açıklama yok'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackShipment


import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import SEO from './SEO'
import './AddAddress.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const AddAddress = () => {
  const { isAuthenticated, accessToken } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    addressDetail: '',
    city: '',
    district: '',
    isDefault: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Guest kullanıcıları yönlendir
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/giris', { state: { from: '/adres-ekle' } })
    }
  }, [isAuthenticated, navigate])

  // Profil bilgilerini yükle ve form alanlarına doldur
  useEffect(() => {
    if (isAuthenticated && accessToken && !profileLoaded) {
      loadUserProfile()
    }
  }, [isAuthenticated, accessToken, profileLoaded])

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const profile = data.data
          if (profile.fullName || profile.phone) {
            setFormData(prev => ({
              ...prev,
              fullName: profile.fullName || prev.fullName,
              phone: profile.phone || prev.phone
            }))
          }
          setProfileLoaded(true)
        }
      }
    } catch (err) {
      console.error('Profil bilgileri yüklenirken hata:', err)
      setProfileLoaded(true)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/user/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData
        })
      })

      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        toast.success('Adres başarıyla eklendi.')
        navigate('/adreslerim')
      } else {
        setError(data.message || 'Adres eklenemedi')
      }
    } catch (err) {
      console.error('Adres eklenirken hata:', err)
      setError('Adres eklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="add-address-page">
      <SEO
        title="Yeni Adres Ekle - Hiedra Home Collection"
        description="Yeni teslimat adresi ekleyin"
        url="/adres-ekle"
      />
      <div className="add-address-container">
        <div className="add-address-header">
          <Link to="/adreslerim" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Adreslerime Dön
          </Link>
          <h1>Yeni Adres Ekle</h1>
          <p className="page-subtitle">Teslimat için yeni bir adres ekleyin</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="add-address-form-wrapper">
          <form onSubmit={handleSubmit} className="add-address-form">
            <div className="form-section">
              <h2 className="form-section-title">Kişi Bilgileri</h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Ad Soyad *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    placeholder="Adınız ve soyadınız"
                  />
                  <p className="form-hint">Kişisel bilgilerinizi kontrol edin</p>
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Telefon *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Adres Bilgileri</h2>
              <div className="form-group">
                <label htmlFor="addressLine">Sokak / Cadde / Bina No *</label>
                <input
                  type="text"
                  id="addressLine"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleInputChange}
                  required
                  placeholder="Sokak, cadde ve bina numarası"
                />
              </div>

              <div className="form-group">
                <label htmlFor="addressDetail">Adres Detayı</label>
                <input
                  type="text"
                  id="addressDetail"
                  name="addressDetail"
                  value={formData.addressDetail}
                  onChange={handleInputChange}
                  placeholder="Daire, kat, blok vb. (opsiyonel)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">İl *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    placeholder="İl adı"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="district">İlçe *</label>
                  <input
                    type="text"
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    required
                    placeholder="İlçe adı"
                  />
                </div>
              </div>

            </div>

            <div className="form-section">
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  <span>Varsayılan adres olarak ayarla</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <Link to="/adreslerim" className="btn-cancel">
                İptal
              </Link>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Kaydediliyor...' : 'Adresi Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddAddress

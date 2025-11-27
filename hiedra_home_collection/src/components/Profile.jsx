import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import './Profile.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Profile = () => {
  const { user, accessToken, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: ''
  })

  // Giriş kontrolü
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
      return
    }
  }, [isAuthenticated, navigate])

  // Profil bilgilerini yükle
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadProfile()
    }
  }, [isAuthenticated, accessToken])

  // Telefon numarasını temizle (backend'e gönderirken 0'ı kaldır, 10 haneli olmalı)
  const cleanPhoneNumber = (phone) => {
    if (!phone) return ''
    // Sadece rakamları al
    let cleaned = phone.replace(/\D/g, '')
    // +90 veya 90 ile başlıyorsa kaldır
    if (cleaned.startsWith('90') && cleaned.length > 10) {
      cleaned = cleaned.substring(2)
    }
    // 0 ile başlıyorsa kaldır (backend'e 10 haneli gönderilecek)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    // Maksimum 10 karakter
    return cleaned.substring(0, 10)
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Profil bilgileri yüklenemedi')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setProfile(data.data)
        // Telefon numarasını 05 ile başlayacak şekilde formatla
        let phone = data.data.phone || ''
        if (phone) {
          // Sadece rakamları al
          phone = phone.replace(/\D/g, '')
          // +90 veya 90 ile başlıyorsa kaldır
          if (phone.startsWith('90') && phone.length > 10) {
            phone = phone.substring(2)
          }
          // 0 ile başlamıyorsa 0 ekle
          if (!phone.startsWith('0') && phone.length === 10) {
            phone = '0' + phone
          }
          // 05 ile başlamalı, eğer 0 ile başlıyorsa ama 5 değilse 05 yap
          if (phone.startsWith('0') && phone.length > 1 && phone[1] !== '5') {
            phone = '05' + phone.substring(1)
          }
          // Maksimum 11 karakter
          phone = phone.substring(0, 11)
        }
        setProfileForm({
          fullName: data.data.fullName || '',
          phone: phone
        })
      }
    } catch (err) {
      console.error('Profil yükleme hatası:', err)
      setError('Profil bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (e) => {
    let value = e.target.value
    
    // +90 veya + karakteri girilirse engelle ve uyar
    if (value.includes('+')) {
      value = value.replace(/\+/g, '')
    }
    if (value.includes('90') && value.length > 2) {
      // 90 ile başlıyorsa kaldır
      if (value.startsWith('90')) {
        value = value.substring(2)
      } else {
        value = value.replace(/90/g, '')
      }
    }
    
    // Sadece rakamları al
    let cleaned = value.replace(/\D/g, '')
    
    // 05 ile başlamalı mantığı
    if (cleaned.length > 0) {
      // Eğer 5 ile başlıyorsa 0 ekle
      if (cleaned.startsWith('5')) {
        cleaned = '0' + cleaned
      }
      // Eğer 0 ile başlıyorsa ama ikinci karakter 5 değilse
      else if (cleaned.startsWith('0') && cleaned.length > 1 && cleaned[1] !== '5') {
        // İkinci karakteri 5 yap
        cleaned = '05' + cleaned.substring(2)
      }
      // Eğer sadece 0 varsa, 05 yapmaya izin ver (kullanıcı 5 yazacak)
      else if (cleaned === '0') {
        // 0 var, kullanıcı 5 yazacak, olduğu gibi bırak
      }
    }
    
    // 0 ile başlıyorsa (05 ile başlamalı) maksimum 11 karakter
    // 0 ile başlamıyorsa maksimum 10 karakter
    if (cleaned.startsWith('0')) {
      // Maksimum 11 karakter (05XXXXXXXXX)
      cleaned = cleaned.substring(0, 11)
    } else {
      // 0 ile başlamıyorsa maksimum 10 karakter
      cleaned = cleaned.substring(0, 10)
    }
    
    setProfileForm({ ...profileForm, phone: cleaned })
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    // Telefon numarası validasyonu
    const phone = profileForm.phone.replace(/\D/g, '')
    
    // 05 ile başlamalı kontrolü
    if (!phone.startsWith('05')) {
      setError('Telefon numarası 05 ile başlamalıdır (örn: 05336360079)')
      setSaving(false)
      return
    }
    
    // 0 ile başlıyorsa 11 karakter, değilse 10 karakter olmalı
    if (phone.startsWith('0')) {
      if (phone.length !== 11) {
        setError('Telefon numarası 11 haneli olmalıdır (örn: 05336360079)')
        setSaving(false)
        return
      }
    } else {
      if (phone.length !== 10) {
        setError('Telefon numarası 10 haneli olmalıdır (örn: 5336360079)')
        setSaving(false)
        return
      }
    }
    
    // Backend'e gönderirken 0'ı kaldır (10 haneli)
    const cleanedPhone = cleanPhoneNumber(profileForm.phone)

    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...profileForm,
          phone: cleanedPhone
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setProfile(data.data)
        setSuccess('Profil bilgileriniz başarıyla güncellendi')
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(data.message || 'Profil güncellenemedi')
      }
    } catch (err) {
      console.error('Profil güncelleme hatası:', err)
      setError('Profil güncellenirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return profile?.email?.[0]?.toUpperCase() || 'U'
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="profile-page">
        <SEO 
          title="Profil - HIEDRA HOME COLLECTION"
          description="Kullanıcı profil sayfası"
        />
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <SEO 
        title="Profil - HIEDRA HOME COLLECTION"
        description="Kullanıcı profil sayfası"
      />
      
      <div className="profile-wrapper">
        {/* Header Section */}
        <div className="profile-header">
          <h1>Profilim</h1>
          <p>Hesap bilgilerinizi görüntüleyin ve güncelleyin</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="profile-alert profile-alert-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="profile-alert profile-alert-success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="profile-card">
          {/* Avatar Section */}
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              <span className="avatar-initials">{getInitials()}</span>
            </div>
            <div className="profile-user-info">
              <h2>{profile?.fullName || 'Kullanıcı'}</h2>
              <p className="profile-user-email">{profile?.email || ''}</p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleProfileSubmit} className="profile-form">
            {/* Email Field */}
            <div className="profile-form-group">
              <label htmlFor="email" className="profile-form-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                E-posta Adresi
              </label>
              <input
                type="email"
                id="email"
                value={profile?.email || ''}
                disabled
                className="profile-form-input profile-form-input-disabled"
              />
              <span className="profile-form-hint">E-posta adresi değiştirilemez</span>
            </div>

            {/* Full Name Field */}
            <div className="profile-form-group">
              <label htmlFor="fullName" className="profile-form-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ad Soyad <span className="required">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                placeholder="Adınız ve soyadınız"
                className="profile-form-input"
                required
              />
            </div>

            {/* Phone Field */}
            <div className="profile-form-group">
              <label htmlFor="phone" className="profile-form-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Telefon Numarası <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={profileForm.phone}
                onChange={handlePhoneChange}
                placeholder="05336360079"
                className="profile-form-input"
                required
                minLength={11}
                maxLength={11}
                pattern="05[0-9]{9}"
              />
              <span className="profile-form-hint">05 ile başlayan 11 haneli telefon numarası giriniz (örn: 05336360079). +90 girişi yapılamaz.</span>
            </div>

            {/* Form Actions */}
            <div className="profile-form-actions">
              <button 
                type="submit" 
                className="profile-btn profile-btn-primary" 
                disabled={saving}
              >
                {saving ? (
                  <>
                    <svg className="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>Bilgileri Güncelle</span>
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="profile-btn profile-btn-secondary"
                onClick={() => navigate('/')}
                disabled={saving}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Ana Sayfaya Dön</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile

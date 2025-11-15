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
        setProfileForm({
          fullName: data.data.fullName || '',
          phone: data.data.phone || ''
        })
      }
    } catch (err) {
      console.error('Profil yükleme hatası:', err)
      setError('Profil bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setProfile(data.data)
        setSuccess('Profil bilgileri güncellendi')
        setTimeout(() => setSuccess(''), 3000)
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

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="profile-container">
        <SEO 
          title="Profil - Hiedra"
          description="Kullanıcı profil sayfası"
        />
        <div className="loading">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <SEO 
        title="Profil - Hiedra"
        description="Kullanıcı profil sayfası"
      />
      
      <div className="profile-header">
        <h1>Profilim</h1>
        <p>Hesap bilgilerinizi güncelleyin</p>
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

      <div className="profile-content">
        <div className="profile-info-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {profile?.fullName ? (
                <span className="avatar-initials">
                  {profile.fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)}
                </span>
              ) : (
                <span className="avatar-initials">
                  {profile?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="profile-avatar-info">
              <h2>{profile?.fullName || 'Kullanıcı'}</h2>
              <p className="profile-email">{profile?.email || ''}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="email">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                E-posta
              </label>
              <input
                type="email"
                id="email"
                value={profile?.email || ''}
                disabled
                className="disabled-input"
              />
              <small>E-posta adresi değiştirilemez</small>
            </div>

            <div className="form-group">
              <label htmlFor="fullName">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ad Soyad *
              </label>
              <input
                type="text"
                id="fullName"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                placeholder="Adınız ve soyadınız"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Telefon Numarası *
              </label>
              <input
                type="tel"
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Bilgileri Güncelle'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => navigate('/')}
              >
                Ana Sayfaya Dön
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile

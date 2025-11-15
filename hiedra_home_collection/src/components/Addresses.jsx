import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Addresses.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Addresses = () => {
  const { isAuthenticated, accessToken } = useAuth()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingAddress, setEditingAddress] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    addressDetail: '',
    city: '',
    district: '',
    isDefault: false
  })

  // Guest kullanıcıları yönlendir
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/giris', { state: { from: '/adreslerim' } })
    }
  }, [isAuthenticated, navigate])

  // Adresleri yükle
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchAddresses()
    }
  }, [isAuthenticated, accessToken])

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${API_BASE_URL}/user/addresses`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (response.ok && (data.isSuccess || data.success)) {
        setAddresses(data.data || [])
      } else {
        setError(data.message || 'Adresler yüklenemedi')
      }
    } catch (err) {
      console.error('Adresler yüklenirken hata:', err)
      setError('Adresler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
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
    setSuccess('')

    try {
      const url = editingAddress 
        ? `${API_BASE_URL}/user/addresses/${editingAddress.id}`
        : `${API_BASE_URL}/user/addresses`
      
      const method = editingAddress ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
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
        setSuccess(editingAddress ? 'Adres güncellendi' : 'Adres eklendi')
        setEditingAddress(null)
        resetForm()
        fetchAddresses()
        
        // Başarı mesajını 3 saniye sonra temizle
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'İşlem başarısız')
      }
    } catch (err) {
      console.error('Adres kaydedilirken hata:', err)
      setError('Adres kaydedilirken bir hata oluştu')
    }
  }

  const handleEdit = (address) => {
    setEditingAddress(address)
    setFormData({
      fullName: address.fullName || '',
      phone: address.phone || '',
      addressLine: address.addressLine || '',
      addressDetail: address.addressDetail || '',
      city: address.city || '',
      district: address.district || '',
      isDefault: address.isDefault || false
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bu adresi silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      setError('')
      const response = await fetch(`${API_BASE_URL}/user/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        setSuccess('Adres silindi')
        fetchAddresses()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Adres silinemedi')
      }
    } catch (err) {
      console.error('Adres silinirken hata:', err)
      setError('Adres silinirken bir hata oluştu')
    }
  }

  const handleSetDefault = async (id) => {
    try {
      setError('')
      const address = addresses.find(a => a.id === id)
      if (!address) return

      const response = await fetch(`${API_BASE_URL}/user/addresses/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...address,
          isDefault: true
        })
      })

      const data = await response.json()

      if (response.ok && (data.isSuccess || data.success)) {
        setSuccess('Varsayılan adres güncellendi')
        fetchAddresses()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Varsayılan adres güncellenemedi')
      }
    } catch (err) {
      console.error('Varsayılan adres güncellenirken hata:', err)
      setError('Varsayılan adres güncellenirken bir hata oluştu')
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      addressLine: '',
      addressDetail: '',
      city: '',
      district: '',
      isDefault: false
    })
  }

  const handleCancel = () => {
    setEditingAddress(null)
    resetForm()
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="addresses-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Adresler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="addresses-container">
      <div className="addresses-header">
        <h1>Adreslerim</h1>
        <div className="header-actions">
          {addresses.length > 0 && (
            <span className="address-count">
              {addresses.length} / 10 adres
            </span>
          )}
          <Link 
            to="/adres-ekle"
            className={`btn-add-address ${addresses.length >= 10 ? 'disabled' : ''}`}
            onClick={(e) => {
              if (addresses.length >= 10) {
                e.preventDefault()
                setError('Maksimum 10 adet adres ekleyebilirsiniz. Lütfen mevcut adreslerinizden birini silin.')
                return
              }
            }}
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            + Yeni Adres Ekle
          </Link>
        </div>
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

      {addresses.length === 0 ? (
        <div className="no-addresses">
          <p>Henüz adres eklenmemiş.</p>
          <Link 
            to="/adres-ekle"
            className="btn-add-address"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            İlk Adresinizi Ekleyin
          </Link>
        </div>
      ) : addresses.length >= 10 ? (
        <div className="max-addresses-warning">
          <p>Maksimum adres sayısına ulaştınız (10 adet). Yeni adres eklemek için mevcut adreslerinizden birini silin.</p>
        </div>
      ) : (
        <div className="addresses-list">
          {addresses.map(address => {
            const isEditing = editingAddress && editingAddress.id === address.id
            
            return (
              <div 
                key={address.id} 
                className={`address-card ${address.isDefault ? 'default' : ''} ${isEditing ? 'address-card-editing' : ''}`}
              >
                <form onSubmit={isEditing ? handleSubmit : (e) => e.preventDefault()} className={isEditing ? 'address-form-inline' : ''}>
                  <div className="address-card-header">
                    {address.isDefault && (
                      <div className="default-badge">Varsayılan Adres</div>
                    )}
                    <div className="address-card-title">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className="address-input-inline"
                            placeholder="Ad Soyad"
                            required
                          />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="address-input-inline address-input-phone"
                            placeholder="Telefon"
                            required
                          />
                        </>
                      ) : (
                        <>
                          <h3>{address.fullName}</h3>
                          <p className="address-phone">{address.phone}</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="address-info">
                    <div className="address-detail-row">
                      <span className="address-label">Adres:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          name="addressLine"
                          value={formData.addressLine}
                          onChange={handleInputChange}
                          className="address-input-inline"
                          required
                        />
                      ) : (
                        <span className="address-value">{address.addressLine}</span>
                      )}
                    </div>
                    <div className="address-detail-row">
                      <span className="address-label">Adres Detayı:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          name="addressDetail"
                          value={formData.addressDetail}
                          onChange={handleInputChange}
                          className="address-input-inline"
                          placeholder="Daire, Kat vb."
                        />
                      ) : (
                        <span className="address-value">{address.addressDetail || '-'}</span>
                      )}
                    </div>
                    <div className="address-detail-row">
                      <span className="address-label">Şehir:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="address-input-inline"
                          required
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      ) : (
                        <span className="address-value">{address.city}</span>
                      )}
                    </div>
                    <div className="address-detail-row">
                      <span className="address-label">İlçe:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          name="district"
                          value={formData.district}
                          onChange={handleInputChange}
                          className="address-input-inline"
                          required
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      ) : (
                        <span className="address-value">{address.district}</span>
                      )}
                    </div>
                    {isEditing && (
                      <div className="address-detail-row">
                        <span className="address-label"></span>
                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            name="isDefault"
                            checked={formData.isDefault}
                            onChange={handleInputChange}
                          />
                          <span>Varsayılan adres olarak ayarla</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="address-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={handleCancel}
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          className="btn-submit"
                        >
                          Güncelle
                        </button>
                      </>
                    ) : (
                      <>
                        {!address.isDefault && (
                          <button
                            type="button"
                            className="btn-set-default"
                            onClick={() => handleSetDefault(address.id)}
                          >
                            Varsayılan Yap
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEdit(address)
                          }}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDelete(address.id)}
                        >
                          Sil
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Addresses


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
    neighbourhood: '',
    isDefault: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingLocation, setLoadingLocation] = useState(false)

  // Guest kullanıcıları yönlendir
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/giris', { state: { from: '/adres-ekle' } })
    }
  }, [isAuthenticated, navigate])

  // Konumdan adres bilgilerini al
  const getAddressFromLocation = async () => {
    if (!navigator.geolocation) {
      toast.show({
        title: 'Hata',
        message: 'Tarayıcınız konum özelliğini desteklemiyor.',
        type: 'error',
      })
      return
    }

    setLoadingLocation(true)
    setError('')

    try {
      // Kullanıcıdan konum izni iste
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords
          
          // Koordinat hassasiyetini logla
          console.log(`Konum alındı - Enlem: ${latitude}, Boylam: ${longitude}, Hassasiyet: ±${accuracy ? Math.round(accuracy) : 'bilinmiyor'} metre`)
          
          // Hassasiyet kontrolü (eğer çok düşükse uyar)
          if (accuracy && accuracy > 100) {
            toast.show({
              title: 'Dikkat',
              message: `Konum hassasiyeti düşük (±${Math.round(accuracy)}m). Daha doğru sonuç için açık alanda tekrar deneyin.`,
              type: 'warning',
            })
          }
          
          try {
            // Backend'den adres bilgilerini al (koordinatları yüksek hassasiyetle gönder)
            const response = await fetch(
              `${API_BASE_URL}/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`
            )
            
            const data = await response.json()
            
            if (response.ok && data.success && data.data) {
              const addressData = data.data
              
              // Form alanlarını doldur
              setFormData(prev => {
                // Display name'den bilgileri parse et
                // Örnek: "Kültür Mahallesi, Bingöl Merkez, Bingöl, Doğu Anadolu Bölgesi, 12000, Türkiye"
                let parsedCity = addressData.city || prev.city
                let parsedDistrict = addressData.district || prev.district
                let parsedNeighbourhood = addressData.neighbourhood || prev.neighbourhood
                
                // Eğer displayName varsa, displayName'den parse et (en güvenilir kaynak)
                if (addressData.displayName) {
                  const displayParts = addressData.displayName.split(',').map(p => p.trim())
                  
                  // Display name formatı genellikle: Mahalle, İlçe, İl, Bölge, Posta Kodu, Ülke
                  // Örnek: "Kültür Mahallesi, Bingöl Merkez, Bingöl, Doğu Anadolu Bölgesi, 12000, Türkiye"
                  
                  if (displayParts.length >= 3) {
                    // İl bilgisini her zaman display name'den al (üçüncü kısım) - bu en güvenilir kaynak
                    // Çünkü API'den gelen city değeri "Bingöl Merkez" gibi yanlış olabilir
                    if (displayParts[2]) {
                      parsedCity = displayParts[2]
                    }
                    
                    // İlk kısım genellikle mahalle (eğer "Mahallesi" veya "Mahalle" içeriyorsa)
                    if (!parsedNeighbourhood && displayParts[0]) {
                      const firstPart = displayParts[0]
                      if (firstPart.toLowerCase().includes('mahallesi') || 
                          firstPart.toLowerCase().includes('mahalle')) {
                        parsedNeighbourhood = firstPart
                      }
                    }
                    
                    // İkinci kısım genellikle ilçe (örn: "Bingöl Merkez")
                    if (!parsedDistrict && displayParts[1]) {
                      let districtPart = displayParts[1]
                      // Eğer ilçe "İl Merkez" formatındaysa (örn: "Bingöl Merkez"), il adını çıkar
                      if (parsedCity && districtPart.includes(parsedCity)) {
                        districtPart = districtPart.replace(parsedCity, '').trim()
                        // Eğer sadece boşluk kaldıysa veya "Merkez" gibi bir şey varsa, onu al
                        if (districtPart === '' || districtPart.toLowerCase() === 'merkez') {
                          districtPart = 'Merkez'
                        }
                      }
                      parsedDistrict = districtPart
                    }
                    
                    // Eğer mahalle hala boşsa ve ilk kısım mahalle değilse, ilk kısmı mahalle olarak al
                    if (!parsedNeighbourhood && displayParts[0] && 
                        !displayParts[0].toLowerCase().includes('merkez') &&
                        !displayParts[0].toLowerCase().includes('bölge')) {
                      parsedNeighbourhood = displayParts[0]
                    }
                  }
                }
                
                // İl alanını temizle: Eğer il içinde "Merkez" varsa, sadece il adını al
                if (parsedCity) {
                  // Eğer il "İl Merkez" formatındaysa (örn: "Bingöl Merkez"), sadece il adını al
                  if (parsedCity.toLowerCase().includes('merkez')) {
                    // "Merkez" kelimesini ve öncesindeki boşluğu çıkar
                    parsedCity = parsedCity.replace(/\s*merkez\s*/i, '').trim()
                  }
                  // Eğer il içinde ilçe adı varsa (örneğin API'den yanlış gelmişse), temizle
                  if (parsedDistrict && parsedCity.includes(parsedDistrict)) {
                    parsedCity = parsedCity.replace(parsedDistrict, '').trim()
                  }
                }
                
                // İlçe alanını temizle: Eğer ilçe "İl Merkez" formatındaysa, sadece "Merkez" yap
                if (parsedDistrict && parsedCity) {
                  // İlçe içinde il adı varsa, il adını çıkar
                  if (parsedDistrict.includes(parsedCity)) {
                    const cleanedDistrict = parsedDistrict.replace(parsedCity, '').trim()
                    if (cleanedDistrict === '' || cleanedDistrict.toLowerCase() === 'merkez') {
                      parsedDistrict = 'Merkez'
                    } else {
                      parsedDistrict = cleanedDistrict
                    }
                  }
                }
                
                // Adres satırını oluştur (sokak, cadde, bina no)
                const addressParts = []
                if (addressData.road) {
                  addressParts.push(addressData.road)
                }
                if (addressData.houseNumber) {
                  addressParts.push(`No: ${addressData.houseNumber}`)
                }
                
                let addressLine = prev.addressLine
                if (addressParts.length > 0) {
                  addressLine = addressParts.join(', ')
                } else if (addressData.displayName) {
                  // Eğer detaylı adres yoksa, display name'den ilk kısmı al (mahalle hariç)
                  const displayParts = addressData.displayName.split(',')
                  if (displayParts.length > 1) {
                    // İlk kısım mahalle, ikinci kısım ilçe - bunları atla, sokak varsa onu al
                    addressLine = displayParts[0].trim()
                  }
                }
                
                return {
                  ...prev,
                  city: parsedCity,
                  district: parsedDistrict,
                  neighbourhood: parsedNeighbourhood,
                  addressLine: addressLine
                }
              })
              
              toast.show({
                title: 'Başarılı!',
                message: 'Konumunuzdan adres bilgileri alındı. Lütfen kontrol edin ve gerekirse düzenleyin.',
                type: 'success',
              })
            } else {
              throw new Error(data.message || 'Adres bilgisi alınamadı')
            }
          } catch (err) {
            console.error('Adres bilgisi alınırken hata:', err)
            toast.show({
              title: 'Hata',
              message: 'Adres bilgisi alınırken bir hata oluştu. Lütfen manuel olarak girin.',
              type: 'error',
            })
          } finally {
            setLoadingLocation(false)
          }
        },
        (error) => {
          console.error('Konum alınırken hata:', error)
          let errorMessage = 'Konum alınamadı.'
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini açın.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Konum bilgisi alınamadı.'
              break
            case error.TIMEOUT:
              errorMessage = 'Konum alınırken zaman aşımı oluştu.'
              break
          }
          
          toast.show({
            title: 'Hata',
            message: errorMessage,
            type: 'error',
          })
          setLoadingLocation(false)
        },
        {
          enableHighAccuracy: true, // GPS kullan, daha yüksek hassasiyet
          timeout: 15000, // 15 saniye timeout
          maximumAge: 0 // Cache kullanma, her zaman yeni konum al
        }
      )
    } catch (err) {
      console.error('Konum servisi hatası:', err)
      toast.show({
        title: 'Hata',
        message: 'Konum servisi kullanılamıyor.',
        type: 'error',
      })
      setLoadingLocation(false)
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
        toast.show({
          title: 'Başarılı!',
          message: 'Adres başarıyla eklendi.',
          type: 'success',
        })
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
          
          {/* Konum Butonu - Üst Kısımda */}
          <div className="location-button-container">
            <button
              type="button"
              onClick={getAddressFromLocation}
              disabled={loadingLocation}
              className="location-button-primary"
            >
              {loadingLocation ? (
                <>
                  <span className="loading-spinner"></span>
                  Konumunuz alınıyor...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Konumumdan Adres Bilgilerini Al
                </>
              )}
            </button>
            <p className="location-hint">Konum izni vererek adres bilgilerinizi otomatik doldurabilirsiniz</p>
          </div>
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="neighbourhood">Mahalle</label>
                  <input
                    type="text"
                    id="neighbourhood"
                    name="neighbourhood"
                    value={formData.neighbourhood}
                    onChange={handleInputChange}
                    placeholder="Mahalle adı (opsiyonel)"
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


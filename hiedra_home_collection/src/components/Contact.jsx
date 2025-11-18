import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import SEO from './SEO'
import './Contact.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const CONTACT_API_URL = `${API_BASE_URL}/contact`

const Contact = () => {
  const { isAuthenticated, accessToken } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

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
          // Profil bilgilerini form alanlarına doldur
          if (profile.fullName || profile.email || profile.phone) {
            setFormData(prev => ({
              ...prev,
              name: profile.fullName || prev.name,
              email: profile.email || prev.email,
              phone: profile.phone || prev.phone
            }))
          }
          setProfileLoaded(true)
        }
      }
    } catch (err) {
      console.error('Profil bilgileri yüklenirken hata:', err)
      // Hata olsa bile devam et, kullanıcı manuel girebilir
      setProfileLoaded(true)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Hata mesajını temizle
    if (error) setError('')
  }

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Sadece rakamları al
    if (value.length <= 6) {
      setVerificationCode(value)
      if (error) setError('')
    }
  }

  // Form gönder - Email doğrulama kodunu gönder
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${CONTACT_API_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          subject: formData.subject
        })
      })

      // Response içeriğini kontrol et
      const contentType = response.headers.get('content-type')
      let data

      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await response.text()
          // Boş response kontrolü
          if (!text || text.trim() === '') {
            console.error('Boş response alındı')
            setError('Sunucudan yanıt alınamadı. Lütfen tekrar deneyiniz.')
            setIsLoading(false)
            return
          }
          data = JSON.parse(text)
          console.log('API Response (gönder):', data) // Debug için
        } catch (parseError) {
          console.error('JSON parse hatası:', parseError)
          console.error('Parse edilemeyen text:', text.substring(0, 200))
          setError(`Sunucu yanıtı işlenemedi: ${parseError.message}`)
          setIsLoading(false)
          return
        }
      } else {
        const text = await response.text()
        console.error('JSON olmayan response:', text)
        setError(`Beklenmeyen yanıt formatı: ${contentType || 'bilinmiyor'}`)
        setIsLoading(false)
        return
      }

      // Response durumunu kontrol et
      if (response.ok) {
        // Backend ResponseMessage formatı: { message: string, isSuccess: boolean }
        const isSuccess = data.isSuccess === true || data.success === true
        
        if (isSuccess) {
          // Email doğrulama ekranını göster
          setShowVerification(true)
        } else {
          setError(data.message || 'Mesaj gönderilemedi. Lütfen tekrar deneyiniz.')
        }
      } else {
        // HTTP hata durumu
        setError(data.message || `Hata: ${response.status} ${response.statusText}`)
      }
    } catch (err) {
      console.error('API hatası:', err)
      if (err.message) {
        setError(`Hata: ${err.message}`)
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyiniz.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Email doğrulama kodunu doğrula ve mesajı gönder
  const handleVerifyEmail = async (e) => {
    e.preventDefault()
    
    if (verificationCode.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu giriniz.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${CONTACT_API_URL}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode
        })
      })

      // Response içeriğini kontrol et
      const contentType = response.headers.get('content-type')
      let data

      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await response.text()
          // Boş response kontrolü
          if (!text || text.trim() === '') {
            console.error('Boş response alındı')
            setError('Sunucudan yanıt alınamadı. Lütfen tekrar deneyiniz.')
            setIsLoading(false)
            return
          }
          data = JSON.parse(text)
          console.log('API Response (verify-email):', data) // Debug için
        } catch (parseError) {
          console.error('JSON parse hatası:', parseError)
          console.error('Parse edilemeyen text:', text.substring(0, 200))
          setError(`Sunucu yanıtı işlenemedi: ${parseError.message}`)
          setIsLoading(false)
          return
        }
      } else {
        const text = await response.text()
        console.error('JSON olmayan response:', text)
        setError(`Beklenmeyen yanıt formatı: ${contentType || 'bilinmiyor'}`)
        setIsLoading(false)
        return
      }

      // Response durumunu kontrol et
      if (response.ok) {
        // Backend ResponseMessage formatı: { message: string, isSuccess: boolean }
        const isSuccess = data.isSuccess === true || data.success === true
        
        if (isSuccess) {
          // Başarılı - mesaj gönderildi
          setIsSubmitted(true)
          setShowVerification(false)
          setVerificationCode('')
          
          // Formu temizle
          setTimeout(() => {
            setIsSubmitted(false)
            setFormData({
              name: '',
              email: '',
              phone: '',
              subject: '',
              message: ''
            })
          }, 3000)
        } else {
          setError(data.message || 'Doğrulama kodu hatalı. Lütfen tekrar deneyiniz.')
        }
      } else {
        // HTTP hata durumu
        setError(data.message || `Hata: ${response.status} ${response.statusText}`)
      }
    } catch (err) {
      console.error('API hatası:', err)
      if (err.message) {
        setError(`Hata: ${err.message}`)
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyiniz.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Doğrulama ekranından geri dön
  const handleBackToForm = () => {
    setShowVerification(false)
    setVerificationCode('')
    setError('')
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'İletişim - Hiedra Home Collection',
    description: 'Hiedra Home Collection ile iletişime geçerek perde ve dekorasyon çözümlerimiz hakkında bilgi alabilirsiniz.',
    url: typeof window !== 'undefined' ? window.location.href : 'https://hiedra.com.tr/iletisim',
    mainEntity: {
      '@type': 'LocalBusiness',
      '@id': 'https://hiedra.com.tr',
      name: 'Hiedra Home Collection',
      alternateName: 'Hiedra',
      image: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://hiedra.com.tr/logo.png',
      telephone: '+902165404086',
      email: 'info@hiedra.com.tr',
      priceRange: '₺₺',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Şerifali Mahallesi, Şehit Sokak No:51',
        addressLocality: 'Ümraniye',
        postalCode: '34775',
        addressRegion: 'İstanbul',
        addressCountry: 'TR'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: '41.0239',
        longitude: '29.1654'
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '19:00'
        }
      ],
      areaServed: {
        '@type': 'Country',
        name: 'Türkiye'
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Perde Satış',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Product',
              name: 'Zebra Perde Satış'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Product',
              name: 'Klasik Perde Satış'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Product',
              name: 'Stor Perde Satış'
            }
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Product',
              name: 'Jaluzi Perde Satış'
            }
          }
        ]
      },
      sameAs: [
        'https://www.facebook.com/HiedraHome/',
        'https://www.instagram.com/hiedrahomecollection/',
        'https://tr.pinterest.com/hiedrahomecollection/'
      ]
    }
  }

  return (
    <div className="contact-container">
      <SEO
        title="İletişim - Hiedra Home Collection"
        description="Hiedra Home Collection ile iletişime geçin. Şerifali Mahallesi, Şehit Sokak No:51, Ümraniye/İstanbul adresimizde hafta içi 09:00-19:00 arasında hizmet veriyoruz."
        keywords="Hiedra iletişim, perde iletişim, hiedra home collection, ümraniye perde, hiedra telefon"
        url="/iletisim"
        structuredData={structuredData}
      />
      <div className="contact-content">
        <header className="contact-header">
          <h1>İletişim - Hiedra Home Collection</h1>
          <p className="contact-subtitle">
            Sorularınız, projeleriniz ve talepleriniz için bize haftanın pazar hariç her günü ulaşabilirsiniz.
          </p>
        </header>

        <div className="contact-wrapper">
          <div className="contact-info">
            <div className="info-card">
              <div className="info-header">
                <span className="info-number">01</span>
                <h3>Adres</h3>
              </div>
              <p>
                Şerifali Mahallesi, Şehit Sokak No:51<br />
                Dudullu OSB, Ümraniye / İstanbul<br />
                34775 Türkiye
              </p>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="info-number">02</span>
                <h3>Telefon</h3>
              </div>
              <p>
                <a href="tel:+902165404086">+90 216 540 40 86</a>
              </p>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="info-number">03</span>
                <h3>E-posta</h3>
              </div>
              <p>
                <a href="mailto:info@hiedra.com.tr">info@hiedra.com.tr</a>
              </p>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="info-number">04</span>
                <h3>Çalışma Saatleri</h3>
              </div>
              <p>
                Pazartesi - Cuma: 09:00 - 19:00<br />
                Cumartesi - Pazar: Kapalı
              </p>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="info-number">05</span>
                <h3>Sosyal Medya</h3>
              </div>
              <div className="contact-social-icons">
                <a
                  href="https://www.facebook.com/HiedraHome/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-social-icon contact-social-facebook"
                  aria-label="Facebook"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                  <span>Facebook</span>
                </a>
                <a
                  href="https://www.instagram.com/hiedrahomecollection/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-social-icon contact-social-instagram"
                  aria-label="Instagram"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  <span>Instagram</span>
                </a>
                <a
                  href="https://tr.pinterest.com/hiedrahomecollection/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-social-icon contact-social-pinterest"
                  aria-label="Pinterest"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.72 8.18 6.57 9.72-.09-.79-.17-2.01.03-2.87.18-.78 1.18-5.03 1.18-5.03s-.3-.6-.3-1.48c0-1.38.8-2.41 1.8-2.41.85 0 1.26.64 1.26 1.4 0 .85-.54 2.12-.82 3.3-.23.99.5 1.8 1.48 1.8 1.78 0 3.15-1.88 3.15-4.59 0-2.4-1.72-4.08-4.18-4.08-2.85 0-4.52 2.14-4.52 4.35 0 .85.33 1.76.74 2.26.08.1.09.19.07.29-.07.3-.24.95-.27 1.08-.04.18-.13.22-.3.13-1.12-.52-1.82-2.15-1.82-3.46 0-2.82 2.05-5.41 5.93-5.41 3.12 0 5.54 2.22 5.54 5.18 0 3.1-1.95 5.59-4.66 5.59-.91 0-1.77-.47-2.06-1.08l-.56 2.14c-.2.78-.74 1.76-1.1 2.36.83.26 1.71.4 2.62.4 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                  </svg>
                  <span>Pinterest</span>
                </a>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            {!showVerification ? (
              <form className="contact-form" onSubmit={handleSubmit}>
                {isSubmitted && (
                  <div className="success-message">
                    Mesajınız başarıyla alındı. En kısa sürede size e-posta yoluyla dönüş yapacağız.
                  </div>
                )}

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="name">Adınız Soyadınız *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">E-posta *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      placeholder="ornek@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Telefon</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={isLoading}
                      placeholder="0555 123 45 67"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Konu *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    placeholder="Mesajınızın konusu"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Mesajınız *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    rows="6"
                    placeholder="Mesajınızı buraya yazın..."
                  ></textarea>
                </div>

                <button type="submit" className="submit-btn" disabled={isLoading}>
                  {isLoading ? 'Gönderiliyor...' : 'Mesaj Gönder'}
                </button>
              </form>
            ) : (
              <form className="contact-form verification-form" onSubmit={handleVerifyEmail}>
                <div className="verification-header">
                  <h3>E-posta Doğrulama</h3>
                  <p className="verification-info">
                    <strong>{formData.email}</strong> adresine doğrulama kodu gönderildi.
                    <br />
                    Lütfen e-posta kutunuzu kontrol ediniz. Doğrulama kodunu girerek mesajınızı tamamlayabilirsiniz.
                  </p>
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="verificationCode">Doğrulama Kodu (6 haneli) *</label>
                  <input
                    type="text"
                    id="verificationCode"
                    name="verificationCode"
                    value={verificationCode}
                    onChange={handleCodeChange}
                    required
                    disabled={isLoading}
                    placeholder="123456"
                    maxLength="6"
                    autoFocus
                  />
                  <small className="form-hint">E-postanıza gelen 6 haneli kodu giriniz</small>
                </div>

                <div className="verification-actions">
                  <button type="button" onClick={handleBackToForm} className="btn-back" disabled={isLoading}>
                    ← Geri Dön
                  </button>
                  <button type="submit" className="submit-btn" disabled={isLoading || verificationCode.length !== 6}>
                    {isLoading ? 'Doğrulanıyor...' : 'Doğrula ve Gönder'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact


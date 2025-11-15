import React, { useState } from 'react'
import SEO from './SEO'
import './Contact.css'

// URL encoding ile Türkçe karakterleri düzgün gönder
const API_BASE_URL = 'http://localhost:8080/bize_ulaşın'

const Contact = () => {
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
      // URL'i encode et - Türkçe karakterler için
      const encodedUrl = encodeURI(`${API_BASE_URL}/gönder`)
      const response = await fetch(encodedUrl, {
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
      // URL'i encode et - Türkçe karakterler için
      const encodedUrl = encodeURI(`${API_BASE_URL}/verify-email`)
      const response = await fetch(encodedUrl, {
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
    name: 'İletişim - Perde Satış Desteği | Hiedra Perde',
    description: 'Perde satış desteği için Hiedra Perde ile iletişime geçin. Sorularınız, önerileriniz ve talepleriniz için bize ulaşın.',
    url: typeof window !== 'undefined' ? window.location.href : 'https://hiedra.com/iletisim',
    mainEntity: {
      '@type': 'LocalBusiness',
      '@id': 'https://hiedra.com',
      name: 'Hiedra Perde',
      alternateName: 'Hiedra Perde Satış',
      image: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://hiedra.com/logo.png',
      telephone: '+905336360079',
      email: 'ysufakin23@gmail.com',
      priceRange: '₺₺',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Kültür Mahallesi, Örnek Sokak No:123',
        addressLocality: 'Bingöl',
        postalCode: '12000',
        addressRegion: 'Bingöl',
        addressCountry: 'TR'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: '38.8847',
        longitude: '40.4986'
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '18:00'
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
      sameAs: []
    }
  }

  return (
    <div className="contact-container">
      <SEO
        title="İletişim - Perde Satış Desteği | Hiedra Perde"
        description="Perde satış desteği için Hiedra Perde ile iletişime geçin. Sorularınız, önerileriniz ve siparişleriniz için bize ulaşın. Perde satış konusunda uzman ekibimiz yanınızda."
        keywords="iletişim, hiedra iletişim, perde firması iletişim, perde satış desteği, perde sipariş, perde danışmanlık, perde satış müşteri hizmetleri"
        url="/iletisim"
        structuredData={structuredData}
      />
      <div className="contact-content">
        <header className="contact-header">
          <h1>İletişim - Bingöl Perde Satış Desteği</h1>
          <p className="contact-subtitle">
            <strong>Bingöl perde satış</strong> ve <strong>Erzurum perde satışı</strong> konusunda sorularınız için bize ulaşın, size yardımcı olalım
          </p>
        </header>

        <div className="contact-wrapper">
          <div className="contact-info">
            <div className="info-card">
              <div className="info-header">
                <span className="info-number">01</span>
                <h3>Adres</h3>
              </div>
              <p>Kültür Mahallesi, Örnek Sokak No:123<br />Bingöl, Türkiye</p>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="info-number">02</span>
                <h3>Telefon</h3>
              </div>
              <p>
                <a href="tel:+905336360079">0533 636 0079</a>
              </p>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="info-number">03</span>
                <h3>E-posta</h3>
              </div>
              <p>
                <a href="mailto:ysufakin23@gmail.com">ysufakin23@gmail.com</a><br />
                <a href="mailto:destek@hiedra.com">destek@hiedra.com</a>
              </p>
            </div>

            <div className="info-card">
              <div className="info-header">
                <span className="info-number">04</span>
                <h3>Çalışma Saatleri</h3>
              </div>
              <p>
                Pazartesi - Cuma: 09:00 - 18:00<br />
                Cumartesi: 10:00 - 16:00<br />
                Pazar: Kapalı
              </p>
            </div>
          </div>

          <div className="contact-form-wrapper">
            {!showVerification ? (
              <form className="contact-form" onSubmit={handleSubmit}>
                {isSubmitted && (
                  <div className="success-message">
                    Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.
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
                    Lütfen e-posta kutunuzu kontrol ediniz.
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


import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { manageCookiesByPreferences, getCookiePreferencesFromCookies, clearNonEssentialCookies } from '../utils/cookieUtils'
import './CookieConsent.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Session ID oluştur veya al
const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem('cookieSessionId')
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
    localStorage.setItem('cookieSessionId', sessionId)
  }
  return sessionId
}

const CookieConsent = () => {
  const { isAuthenticated, accessToken } = useAuth()
  const [showConsent, setShowConsent] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [cookieSettings, setCookieSettings] = useState({
    necessary: true, // Zorunlu çerezler her zaman aktif
    analytics: false,
    marketing: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [cookieContract, setCookieContract] = useState(null)
  const [isContractLoading, setIsContractLoading] = useState(false)
  const [showContractContent, setShowContractContent] = useState(false)
  const [contractError, setContractError] = useState('')
  const [isContractAccepted, setIsContractAccepted] = useState(false)
  const [hasConfirmedContract, setHasConfirmedContract] = useState(false)
  const [isContractAccepting, setIsContractAccepting] = useState(false)
  const [acceptanceWarning, setAcceptanceWarning] = useState('')

  useEffect(() => {
    // Backend'den çerez tercihlerini yükle
    loadCookiePreferences()
  }, [isAuthenticated, accessToken])

  useEffect(() => {
    // Çerez politikası sözleşmesini API'den getir
    fetchCookieContract()
  }, [isAuthenticated, accessToken])

  const loadCookiePreferences = async () => {
    try {
      setIsLoading(true)
      const sessionId = getOrCreateSessionId()
      
      const url = `${API_BASE_URL}/cookies/preferences?sessionId=${encodeURIComponent(sessionId)}`
      const headers = {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          const preferences = data.data
          if (preferences && preferences.consentGiven) {
            // Backend'den tercihler geldi
            const settings = {
              necessary: preferences.necessary !== undefined ? preferences.necessary : true,
              analytics: preferences.analytics !== undefined ? preferences.analytics : false,
              marketing: preferences.marketing !== undefined ? preferences.marketing : false
            }
            setCookieSettings(settings)
            
            // Çerezleri uygula
            manageCookiesByPreferences(settings)
            
            // LocalStorage'a da kaydet (fallback için)
            localStorage.setItem('cookieConsent', 'accepted')
            localStorage.setItem('cookieSettings', JSON.stringify(settings))
          } else {
            // Backend'de tercih yok, localStorage'dan kontrol et
            checkLocalStorage()
          }
        } else {
          checkLocalStorage()
        }
      } else {
        // Backend hatası, localStorage'dan kontrol et
        checkLocalStorage()
      }
    } catch (error) {
      console.error('Çerez tercihleri yüklenirken hata:', error)
      // Hata durumunda localStorage'dan kontrol et
      checkLocalStorage()
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCookieContract = async () => {
    try {
      setIsContractLoading(true)
      setContractError('')
      const sessionId = getOrCreateSessionId()

      const response = await fetch(`${API_BASE_URL}/contracts/type/CEREZ`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Çerez politikası yüklenemedi')
      }

      const data = await response.json()
      if (data.isSuccess || data.success) {
        const contractData = data.data
        setCookieContract(contractData)
        await checkContractAcceptanceStatus(contractData?.id, sessionId)
      } else {
        throw new Error(data.message || 'Çerez politikası bulunamadı')
      }
    } catch (error) {
      console.error('Çerez politikası yüklenirken hata:', error)
      setContractError(error.message || 'Çerez politikası yüklenemedi')
    } finally {
      setIsContractLoading(false)
    }
  }

  const checkContractAcceptanceStatus = async (contractId, providedSessionId) => {
    if (!contractId) return
    try {
      const sessionId = providedSessionId || getOrCreateSessionId()
      const query = !isAuthenticated ? `?guestUserId=${encodeURIComponent(sessionId)}` : ''
      const headers = {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      }

      const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/status${query}`, {
        headers
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          const accepted = Boolean(data.data?.accepted)
          setIsContractAccepted(accepted)
          if (accepted) {
            setHasConfirmedContract(true)
            setAcceptanceWarning('')
          } else {
            setHasConfirmedContract(false)
          }
        }
      }
    } catch (error) {
      console.error('Çerez politikası onay durumu alınamadı:', error)
    }
  }

  const acceptCookieContract = async () => {
    if (isContractAccepted || !cookieContract) {
      return true
    }

    if (!hasConfirmedContract) {
      setAcceptanceWarning('Çerez politikasını okuduğunuzu onaylamalısınız.')
      return false
    }

    try {
      setIsContractAccepting(true)
      setContractError('')
      setAcceptanceWarning('')
      const sessionId = getOrCreateSessionId()
      const query = !isAuthenticated ? `?guestUserId=${encodeURIComponent(sessionId)}` : ''
      const headers = {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      }

      const response = await fetch(`${API_BASE_URL}/contracts/type/CEREZ/accept${query}`, {
        method: 'POST',
        headers
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !(data.isSuccess || data.success)) {
        throw new Error(data.message || 'Çerez politikası onaylanamadı')
      }

      setIsContractAccepted(true)
      return true
    } catch (error) {
      console.error('Çerez politikası onaylanırken hata:', error)
      setContractError(error.message || 'Çerez politikasını onaylama başarısız oldu')
      return false
    } finally {
      setIsContractAccepting(false)
    }
  }

  const checkLocalStorage = () => {
    // Önce çerezlerden tercihleri kontrol et
    const cookiePrefs = getCookiePreferencesFromCookies()
    if (cookiePrefs.consentGiven) {
      setCookieSettings({
        necessary: cookiePrefs.necessary,
        analytics: cookiePrefs.analytics,
        marketing: cookiePrefs.marketing
      })
      return
    }
    
    // LocalStorage'dan çerez onay durumunu kontrol et
    const cookieConsent = localStorage.getItem('cookieConsent')
    
    if (!cookieConsent) {
      // Eğer onay verilmemişse, 500ms sonra popup'ı göster
      setTimeout(() => {
        setShowConsent(true)
      }, 500)
    } else {
      // Eğer onay verilmişse, kaydedilen ayarları yükle
      const savedSettings = localStorage.getItem('cookieSettings')
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          setCookieSettings(settings)
          // Çerezleri uygula
          manageCookiesByPreferences(settings)
        } catch (e) {
          console.error('Çerez ayarları yüklenemedi:', e)
        }
      }
    }
  }

  const canConfirmContract = () => {
    if (!cookieContract) {
      return Boolean(contractError)
    }
    return isContractAccepted || hasConfirmedContract
  }

  const handleAcceptAll = async () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true
    }

    if (!canConfirmContract()) {
      setAcceptanceWarning('Çerez politikasını okuduğunuzu onaylamalısınız.')
      return
    }

    setCookieSettings(allAccepted)
    await saveCookieSettings(allAccepted)
    const accepted = await acceptCookieContract()
    if (!accepted) {
      return
    }
    setShowConsent(false)
    setShowSettings(false)
  }

  const handleRejectAll = async () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false
    }
    setCookieSettings(onlyNecessary)
    await saveCookieSettings(onlyNecessary)
    setShowConsent(false)
    setShowSettings(false)
  }

  const handleSaveSettings = async () => {
    if (!canConfirmContract()) {
      setAcceptanceWarning('Çerez politikasını okuduğunuzu onaylamalısınız.')
      return
    }

    await saveCookieSettings(cookieSettings)
    const accepted = await acceptCookieContract()
    if (!accepted) {
      return
    }
    setShowConsent(false)
    setShowSettings(false)
  }

  const saveCookieSettings = async (settings) => {
    // Önce localStorage'a kaydet (hızlı geri bildirim için)
    localStorage.setItem('cookieConsent', 'accepted')
    localStorage.setItem('cookieSettings', JSON.stringify(settings))
    localStorage.setItem('cookieConsentDate', new Date().toISOString())
    
    // Çerezleri uygula (tercihlere göre)
    manageCookiesByPreferences(settings)
    
    // Eğer analytics veya marketing reddedildiyse, ilgili çerezleri temizle
    if (!settings.analytics || !settings.marketing) {
      // Gerekirse temizleme işlemi yapılabilir
      if (!settings.analytics && !settings.marketing) {
        clearNonEssentialCookies()
      }
    }
    
    // Backend'e kaydet
    try {
      const sessionId = getOrCreateSessionId()
      const url = `${API_BASE_URL}/cookies/preferences`
      const headers = {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          necessary: settings.necessary,
          analytics: settings.analytics,
          marketing: settings.marketing,
          sessionId: sessionId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          console.log('Çerez tercihleri backend\'e kaydedildi')
        }
      } else {
        console.warn('Çerez tercihleri backend\'e kaydedilemedi, sadece localStorage\'a kaydedildi')
      }
    } catch (error) {
      console.error('Çerez tercihleri kaydedilirken hata:', error)
      // Hata olsa bile localStorage'a kaydedildi, kullanıcı deneyimi bozulmaz
    }
    
    // Çerez ayarlarına göre script'leri yükle/kaldır
    manageCookieScripts(settings)
  }

  const manageCookieScripts = (settings) => {
    // Analytics çerezleri için (örnek: Google Analytics)
    if (settings.analytics) {
      // Analytics script'ini yükle
      console.log('Analytics çerezleri aktifleştirildi')
      
      // Burada Google Analytics veya başka bir analytics servisi yüklenebilir
      // Örnek:
      // if (!window.gtag) {
      //   // Google Analytics script yükle
      // }
    } else {
      // Analytics script'ini kaldır
      console.log('Analytics çerezleri deaktifleştirildi')
      
      // Analytics script'lerini devre dışı bırak
      // Örnek:
      // if (window.gtag) {
      //   window.gtag = function() {}
      // }
    }

    // Marketing çerezleri için
    if (settings.marketing) {
      // Marketing script'ini yükle
      console.log('Marketing çerezleri aktifleştirildi')
      
      // Burada Facebook Pixel, Google Ads veya başka bir marketing servisi yüklenebilir
    } else {
      // Marketing script'ini kaldır
      console.log('Marketing çerezleri deaktifleştirildi')
      
      // Marketing script'lerini devre dışı bırak
    }
  }

  const handleSettingsToggle = (type) => {
    if (type === 'necessary') return // Zorunlu çerezler değiştirilemez
    
    setCookieSettings(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  // Yükleniyor durumunda hiçbir şey gösterme
  if (isLoading) {
    return null
  }

  if (!showConsent && !showSettings) {
    // Ayarlar butonu - sağ alt köşede
    return (
      <button 
        className="cookie-settings-btn" 
        onClick={() => setShowSettings(true)}
        title="Çerez Ayarları"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.364-4.636l-4.243 4.243m0-8.485l4.243 4.243M8.636 15.364l-4.243 4.243m0-8.485l4.243 4.243"/>
        </svg>
      </button>
    )
  }

  return (
    <>
      {(showConsent || showSettings) && (
        <div className="cookie-consent-overlay" onClick={() => !showSettings && setShowConsent(false)}>
          <div className="cookie-consent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cookie-consent-header">
              <h2>🍪 Çerez Politikası</h2>
              {showSettings && (
                <button 
                  className="cookie-close-btn"
                  onClick={() => {
                    setShowSettings(false)
                    setShowConsent(false)
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="cookie-consent-content">
              {showSettings ? (
                // Ayarlar görünümü
                <div className="cookie-settings">
                  <p className="cookie-info">
                    Web sitemiz, kullanıcı deneyimini iyileştirmek ve siteyi analiz etmek için çerezler kullanmaktadır.
                    Aşağıdan hangi çerezleri kabul etmek istediğinizi seçebilirsiniz.
                  </p>

                  <div className="cookie-categories">
                    <div className="cookie-category">
                      <div className="cookie-category-header">
                        <div>
                          <h3>Zorunlu Çerezler</h3>
                          <p>Bu çerezler sitenin çalışması için gereklidir ve kapatılamaz.</p>
                        </div>
                        <label className="cookie-toggle">
                          <input 
                            type="checkbox" 
                            checked={true} 
                            disabled 
                          />
                          <span className="cookie-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="cookie-category">
                      <div className="cookie-category-header">
                        <div>
                          <h3>Analitik Çerezler</h3>
                          <p>Web sitesinin nasıl kullanıldığını anlamamıza yardımcı olur.</p>
                        </div>
                        <label className="cookie-toggle">
                          <input 
                            type="checkbox" 
                            checked={cookieSettings.analytics}
                            onChange={() => handleSettingsToggle('analytics')}
                          />
                          <span className="cookie-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="cookie-category">
                      <div className="cookie-category-header">
                        <div>
                          <h3>Pazarlama Çerezleri</h3>
                          <p>Kişiselleştirilmiş reklamlar göstermek için kullanılır.</p>
                        </div>
                        <label className="cookie-toggle">
                          <input 
                            type="checkbox" 
                            checked={cookieSettings.marketing}
                            onChange={() => handleSettingsToggle('marketing')}
                          />
                          <span className="cookie-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // İlk onay görünümü
                <div className="cookie-intro">
                  <p>
                    Web sitemiz, size en iyi deneyimi sunmak için çerezler kullanmaktadır. 
                    Sitemizi kullanmaya devam ederek çerezlerin kullanılmasını kabul etmiş olursunuz.
                  </p>
                  <p className="cookie-detail">
                    <a href="/cerez-politikasi" target="_blank" rel="noopener noreferrer">
                      Çerez Politikası
                    </a> ve{' '}
                    <a href="/gizlilik-politikasi" target="_blank" rel="noopener noreferrer">
                      Gizlilik Politikası
                    </a>
                    'mızı inceleyebilirsiniz.
                  </p>
                </div>
              )}

              {(cookieContract || isContractLoading || contractError) && (
                <div className="cookie-contract-card">
                  <div className="cookie-contract-header">
                    <div>
                      <p className="cookie-contract-title">{cookieContract?.title || 'Çerez Politikası'}</p>
                      {cookieContract && (
                        <span className="cookie-contract-meta">
                          Versiyon {cookieContract.version}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cookie-contract-toggle"
                      onClick={() => {
                        if (!cookieContract) {
                          fetchCookieContract()
                        } else {
                          setShowContractContent((prev) => !prev)
                        }
                      }}
                      disabled={isContractLoading}
                    >
                      {isContractLoading ? 'Yükleniyor...' : showContractContent ? 'Metni Gizle' : 'Detayları Göster'}
                    </button>
                  </div>

                  {isContractLoading && (
                    <p className="cookie-contract-loading">Çerez politikası yükleniyor...</p>
                  )}

                  {contractError && (
                    <p className="cookie-contract-error">{contractError}</p>
                  )}

                  {showContractContent && cookieContract && (
                    <div
                      className="cookie-contract-content"
                      dangerouslySetInnerHTML={{ __html: cookieContract.content }}
                    />
                  )}

                  <label className="cookie-contract-confirm">
                    <input
                      type="checkbox"
                      checked={isContractAccepted || hasConfirmedContract}
                      disabled={isContractAccepted}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setHasConfirmedContract(checked)
                        setAcceptanceWarning(checked ? '' : 'Çerez politikasını onaylamadan devam edemezsiniz.')
                      }}
                    />
                    <span>Çerez Politikasını okudum ve onaylıyorum</span>
                  </label>

                  {acceptanceWarning && !isContractAccepted && (
                    <p className="cookie-contract-warning">{acceptanceWarning}</p>
                  )}

                  {isContractAccepted && (
                    <p className="cookie-contract-success">Bu sözleşmenin güncel sürümünü zaten onayladınız.</p>
                  )}
                </div>
              )}
            </div>

            <div className="cookie-consent-actions">
              {showSettings ? (
                <>
                  <button 
                    className="cookie-btn cookie-btn-secondary" 
                    onClick={handleRejectAll}
                    disabled={isContractAccepting}
                  >
                    Tümünü Reddet
                  </button>
                  <button 
                    className="cookie-btn cookie-btn-primary" 
                    onClick={handleSaveSettings}
                    disabled={isContractAccepting || !canConfirmContract()}
                  >
                    {isContractAccepting ? 'Onaylanıyor...' : 'Ayarları Kaydet'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="cookie-btn cookie-btn-settings" 
                    onClick={() => {
                      setShowConsent(false)
                      setShowSettings(true)
                    }}
                  >
                    Ayarlar
                  </button>
                  <button 
                    className="cookie-btn cookie-btn-secondary" 
                    onClick={handleRejectAll}
                    disabled={isContractAccepting}
                  >
                    Reddet
                  </button>
                  <button 
                    className="cookie-btn cookie-btn-primary" 
                    onClick={handleAcceptAll}
                    disabled={isContractAccepting || !canConfirmContract()}
                  >
                    {isContractAccepting ? 'Onaylanıyor...' : 'Tümünü Kabul Et'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ayarlar butonu - her zaman görünür */}
      <button 
        className="cookie-settings-btn" 
        onClick={() => setShowSettings(true)}
        title="Çerez Ayarları"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.364-4.636l-4.243 4.243m0-8.485l4.243 4.243M8.636 15.364l-4.243 4.243m0-8.485l4.243 4.243"/>
        </svg>
      </button>
    </>
  )
}

export default CookieConsent


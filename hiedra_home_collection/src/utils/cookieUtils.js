/**
 * Çerez yönetim yardımcı fonksiyonları
 */

// Çerez ayarları
const COOKIE_DEFAULTS = {
  path: '/',
  sameSite: 'Lax',
  secure: window.location.protocol === 'https:'
}

/**
 * Çerez set et
 * @param {string} name - Çerez adı
 * @param {string} value - Çerez değeri
 * @param {number} days - Çerez süresi (gün)
 * @param {object} options - Ek seçenekler (path, domain, secure, sameSite)
 */
export const setCookie = (name, value, days = 365, options = {}) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  
  const cookieOptions = {
    ...COOKIE_DEFAULTS,
    ...options,
    expires: expires.toUTCString()
  }
  
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
  
  if (cookieOptions.expires) {
    cookieString += `; expires=${cookieOptions.expires}`
  }
  if (cookieOptions.path) {
    cookieString += `; path=${cookieOptions.path}`
  }
  if (cookieOptions.domain) {
    cookieString += `; domain=${cookieOptions.domain}`
  }
  if (cookieOptions.secure) {
    cookieString += `; secure`
  }
  if (cookieOptions.sameSite) {
    cookieString += `; SameSite=${cookieOptions.sameSite}`
  }
  
  document.cookie = cookieString
}

/**
 * Çerez oku
 * @param {string} name - Çerez adı
 * @returns {string|null} - Çerez değeri veya null
 */
export const getCookie = (name) => {
  const nameEQ = encodeURIComponent(name) + '='
  const cookies = document.cookie.split(';')
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i]
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length)
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length))
    }
  }
  return null
}

/**
 * Çerez sil
 * @param {string} name - Çerez adı
 * @param {object} options - Ek seçenekler (path, domain)
 */
export const deleteCookie = (name, options = {}) => {
  const cookieOptions = {
    ...COOKIE_DEFAULTS,
    ...options,
    expires: 'Thu, 01 Jan 1970 00:00:00 UTC'
  }
  
  setCookie(name, '', -1, cookieOptions)
}

/**
 * Tüm çerezleri listele
 * @returns {object} - Çerez adı-değer çiftleri
 */
export const getAllCookies = () => {
  const cookies = {}
  if (document.cookie && document.cookie !== '') {
    const split = document.cookie.split(';')
    for (let i = 0; i < split.length; i++) {
      const nameValue = split[i].split('=')
      const name = decodeURIComponent(nameValue[0].trim())
      const value = decodeURIComponent(nameValue[1] || '')
      cookies[name] = value
    }
  }
  return cookies
}

/**
 * Çerez tercihlerine göre çerezleri yönet
 * @param {object} settings - Çerez tercihleri (necessary, analytics, marketing)
 */
export const manageCookiesByPreferences = (settings) => {
  const sessionId = localStorage.getItem('cookieSessionId') || 'unknown'
  const timestamp = new Date().toISOString()
  
  // Zorunlu çerezler - her zaman aktif
  if (settings.necessary !== false) {
    // Oturum çerezi
    setCookie('hiedra_session', sessionId, 30, {
      path: '/',
      sameSite: 'Lax'
    })
    
    // Çerez tercih çerezi
    setCookie('hiedra_cookie_consent', 'accepted', 365, {
      path: '/',
      sameSite: 'Lax'
    })
    
    // Çerez tercih tarihi
    setCookie('hiedra_cookie_consent_date', timestamp, 365, {
      path: '/',
      sameSite: 'Lax'
    })
  }
  
  // Analitik çerezler
  if (settings.analytics) {
    // Analytics çerezleri
    setCookie('hiedra_analytics_enabled', 'true', 365, {
      path: '/',
      sameSite: 'Lax'
    })
    
    // Kullanıcı ID (anonim)
    const analyticsId = getCookie('hiedra_analytics_id') || 'analytics_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
    setCookie('hiedra_analytics_id', analyticsId, 365, {
      path: '/',
      sameSite: 'Lax'
    })
    
    // Ziyaret sayacı
    const visitCount = parseInt(getCookie('hiedra_visit_count') || '0') + 1
    setCookie('hiedra_visit_count', visitCount.toString(), 365, {
      path: '/',
      sameSite: 'Lax'
    })
    
    // Son ziyaret tarihi
    setCookie('hiedra_last_visit', timestamp, 365, {
      path: '/',
      sameSite: 'Lax'
    })
  } else {
    // Analitik çerezleri sil
    deleteCookie('hiedra_analytics_enabled')
    deleteCookie('hiedra_analytics_id')
    deleteCookie('hiedra_visit_count')
    deleteCookie('hiedra_last_visit')
  }
  
  // Pazarlama çerezleri
  if (settings.marketing) {
    // Marketing çerezleri
    setCookie('hiedra_marketing_enabled', 'true', 365, {
      path: '/',
      sameSite: 'Lax'
    })
    
    // Marketing ID
    const marketingId = getCookie('hiedra_marketing_id') || 'marketing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
    setCookie('hiedra_marketing_id', marketingId, 365, {
      path: '/',
      sameSite: 'Lax'
    })
    
    // İlgi alanları (örnek)
    const interests = getCookie('hiedra_interests') || '[]'
    setCookie('hiedra_interests', interests, 365, {
      path: '/',
      sameSite: 'Lax'
    })
  } else {
    // Pazarlama çerezlerini sil
    deleteCookie('hiedra_marketing_enabled')
    deleteCookie('hiedra_marketing_id')
    deleteCookie('hiedra_interests')
  }
}

/**
 * Tüm çerezleri temizle (zorunlu çerezler hariç)
 */
export const clearNonEssentialCookies = () => {
  const allCookies = getAllCookies()
  const essentialCookies = [
    'hiedra_session',
    'hiedra_cookie_consent',
    'hiedra_cookie_consent_date'
  ]
  
  Object.keys(allCookies).forEach(cookieName => {
    if (!essentialCookies.includes(cookieName) && cookieName.startsWith('hiedra_')) {
      deleteCookie(cookieName)
    }
  })
}

/**
 * Çerez tercihlerini çerezlerden oku
 * @returns {object} - Çerez tercihleri
 */
export const getCookiePreferencesFromCookies = () => {
  const consent = getCookie('hiedra_cookie_consent')
  const analytics = getCookie('hiedra_analytics_enabled')
  const marketing = getCookie('hiedra_marketing_enabled')
  
  return {
    necessary: consent === 'accepted',
    analytics: analytics === 'true',
    marketing: marketing === 'true',
    consentGiven: consent === 'accepted'
  }
}


import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

const AUTH_STORAGE_KEY = 'hiedra_auth'

// LocalStorage'dan auth bilgisini yükle
const loadAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    
    const authData = JSON.parse(stored)
    
    // Token süresi kontrolü (30 gün)
    if (authData.expiry && new Date().getTime() > authData.expiry) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    
    return authData
  } catch (error) {
    console.error('Auth yüklenirken hata:', error)
    return null
  }
}

// LocalStorage'a auth bilgisini kaydet
const saveAuthToStorage = (authData) => {
  try {
    const expiryDate = new Date().getTime() + (30 * 24 * 60 * 60 * 1000) // 30 gün
    const data = {
      ...authData,
      expiry: expiryDate,
      savedAt: new Date().getTime()
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Auth kaydedilirken hata:', error)
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)

  // Sayfa yüklendiğinde localStorage'dan auth bilgisini yükle
  useEffect(() => {
    const authData = loadAuthFromStorage()
    if (authData) {
      setUser(authData.user)
      setAccessToken(authData.accessToken)
    }
    setIsLoading(false)
  }, [])

  // IP adresini almak için yardımcı fonksiyon
  const getClientIpAddress = async () => {
    try {
      // Timeout ile IP servisi çağrısı
      const fetchWithTimeout = (url, timeout = 3000) => {
        return Promise.race([
          fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ])
      }
      
      // Önce bir IP servisi ile gerçek IP'yi al (ipify.org)
      try {
        const ipResponse = await fetchWithTimeout('https://api.ipify.org?format=json', 3000)
        
        if (ipResponse.ok) {
          const ipData = await ipResponse.json()
          if (ipData.ip && ipData.ip.trim() !== '' && ipData.ip !== '127.0.0.1' && ipData.ip !== '::1') {
            console.log('IP adresi alındı (ipify):', ipData.ip)
            return ipData.ip.trim()
          }
        }
      } catch (error) {
        console.warn('ipify servisi ile IP alınamadı, alternatif deneniyor:', error)
      }
      
      // Alternatif IP servisi (text format)
      try {
        const altResponse = await fetchWithTimeout('https://api.ipify.org?format=text', 3000)
        
        if (altResponse.ok) {
          const ipText = await altResponse.text()
          if (ipText && ipText.trim() !== '' && ipText.trim() !== '127.0.0.1' && ipText.trim() !== '::1') {
            console.log('IP adresi alındı (ipify text):', ipText.trim())
            return ipText.trim()
          }
        }
      } catch (error) {
        console.warn('Alternatif IP servisi ile IP alınamadı:', error)
      }
    } catch (error) {
      console.warn('IP servisi ile IP alınamadı:', error)
    }
    
    // Fallback: Eğer IP servisi çalışmazsa, backend'in kendi IP tespitini kullanması için null döndür
    return null
  }

  const requestCode = async (email) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
      
      // IP adresini al
      const clientIp = await getClientIpAddress()
      
      const response = await fetch(`${API_URL}/auth/request-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientIp && { 'X-Client-IP': clientIp }),
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Kod gönderilemedi')
      }
      
      if (data.isSuccess || data.success) {
        return { success: true, message: data.message }
      } else {
        throw new Error(data.message || 'Kod gönderilemedi')
      }
    } catch (error) {
      console.error('Request code error:', error)
      return { success: false, error: error.message || 'Kod gönderilirken bir hata oluştu' }
    }
  }

  const verifyCode = async (email, code) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
      
      // IP adresini al
      const clientIp = await getClientIpAddress()
      
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientIp && { 'X-Client-IP': clientIp }),
        },
        body: JSON.stringify({ email, code }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Doğrulama başarısız')
      }

      const data = await response.json()
      
      if (data.isSuccess || data.success) {
        const authData = {
          user: data.data?.user || { email },
          accessToken: data.data?.accessToken || data.data?.token,
        }
        
        setUser(authData.user)
        setAccessToken(authData.accessToken)
        saveAuthToStorage(authData)
        
        return { success: true }
      } else {
        throw new Error(data.message || 'Doğrulama başarısız')
      }
    } catch (error) {
      console.error('Verify code error:', error)
      return { success: false, error: error.message || 'Doğrulama yapılırken bir hata oluştu' }
    }
  }

  // Eski login fonksiyonu - geriye dönük uyumluluk için
  const login = async (email, password) => {
    // Şifre ile giriş artık desteklenmiyor, kod ile giriş kullanılmalı
    return { success: false, error: 'Lütfen e-posta doğrulama kodu ile giriş yapın' }
  }

  const logout = () => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const value = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    requestCode,
    verifyCode,
    setUser,
    setAccessToken,
    saveAuthToStorage,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


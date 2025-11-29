import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import SEO from './SEO'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const { requestCode, verifyCode, isAuthenticated, setUser, setAccessToken, saveAuthToStorage, accessToken } = useAuth()
  const { theme } = useTheme()
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  
  // Eğer zaten giriş yapılmışsa ana sayfaya yönlendir
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      checkProfileAndRedirect()
    }
  }, [isAuthenticated, accessToken])

  // Profil bilgilerini kontrol et ve yönlendir
  const checkProfileAndRedirect = async (token = accessToken) => {
    if (!token) {
      navigate('/')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const profile = data.data
          // Profil bilgileri eksikse (ad soyad veya telefon yoksa) profil sayfasına yönlendir
          if (!profile.fullName || !profile.phone || profile.fullName.trim() === '' || profile.phone.trim() === '') {
            navigate('/profil')
          } else {
            // Profil bilgileri tamamsa ana sayfaya yönlendir
            navigate('/')
          }
        } else {
          navigate('/')
        }
      } else {
        navigate('/')
      }
    } catch (err) {
      console.error('Profil kontrolü hatası:', err)
      navigate('/')
    }
  }
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email') // 'email' veya 'code'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0) // Saniye cinsinden
  const [canResend, setCanResend] = useState(false)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (resendCooldown === 0 && step === 'code') {
      setCanResend(true)
    }
  }, [resendCooldown, step])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    if (!email) {
      setError('Lütfen e-posta adresinizi girin')
      setIsLoading(false)
      return
    }

    const result = await requestCode(email)
    setIsLoading(false)

    if (result.success) {
      setSuccess('Doğrulama kodu e-posta adresinize gönderildi')
      setStep('code')
      setResendCooldown(180) // 3 dakika = 180 saniye
      setCanResend(false)
    } else {
      setError(result.error || 'Kod gönderilemedi')
    }
  }

  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    if (!code || code.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu girin')
      setIsLoading(false)
      return
    }

    const result = await verifyCode(email, code)
    setIsLoading(false)

    if (result.success) {
      setSuccess('Giriş başarılı! Yönlendiriliyorsunuz...')
      // Profil bilgilerini kontrol et ve yönlendir
      setTimeout(async () => {
        await checkProfileAndRedirect()
      }, 1500)
    } else {
      setError(result.error || 'Doğrulama kodu geçersiz')
    }
  }

  const handleResendCode = async () => {
    if (!canResend || resendCooldown > 0) {
      return
    }

    setError('')
    setSuccess('')
    setIsLoading(true)

    const result = await requestCode(email)
    setIsLoading(false)

    if (result.success) {
      setSuccess('Yeni doğrulama kodu gönderildi')
      setResendCooldown(180) // 3 dakika = 180 saniye
      setCanResend(false)
    } else {
      setError(result.error || 'Kod gönderilemedi')
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setCode('')
    setError('')
    setSuccess('')
    setResendCooldown(0)
    setCanResend(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleGoogleLogin = async () => {
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
      
      // Google OAuth popup aç - OAuth2 authorization endpoint'ine direkt yönlendir
      const googleAuthUrl = `${API_URL}/auth/oauth2/authorization/google`
      const width = 500
      const height = 600
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      const popup = window.open(
        googleAuthUrl,
        'Google Login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        setError('Popup engellendi. Lütfen popup engelleyiciyi kapatın ve tekrar deneyin.')
        setIsLoading(false)
        return
      }

      // Popup mesajını dinle
      const messageListener = (event) => {
        // Origin kontrolü - güvenlik için
        const apiOrigin = new URL(API_URL).origin
        if (event.origin !== apiOrigin && event.origin !== window.location.origin) {
          return
        }

        if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          const authData = event.data.authData
          setUser(authData.user)
          setAccessToken(authData.accessToken)
          saveAuthToStorage({
            user: authData.user,
            accessToken: authData.accessToken
          })
          
          setSuccess('Google ile giriş başarılı! Yönlendiriliyorsunuz...')
          if (popup && !popup.closed) {
            popup.close()
          }
          
          // Profil bilgilerini kontrol et ve yönlendir
          setTimeout(async () => {
            await checkProfileAndRedirect(authData.accessToken)
          }, 1500)
        } else if (event.data && event.data.type === 'GOOGLE_AUTH_ERROR') {
          setError(event.data.error || 'Google ile giriş başarısız')
          if (popup && !popup.closed) {
            popup.close()
          }
          setIsLoading(false)
        }
      }

      let authCompleted = false
      
      // Enhanced listener with completion tracking
      const enhancedListener = (event) => {
        messageListener(event)
        if (event.data && (event.data.type === 'GOOGLE_AUTH_SUCCESS' || event.data.type === 'GOOGLE_AUTH_ERROR')) {
          authCompleted = true
        }
      }
      
      window.addEventListener('message', enhancedListener)

      // Popup kapatıldığında kontrol et
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', enhancedListener)
          if (!authCompleted) {
            setError('Google giriş işlemi iptal edildi')
            setIsLoading(false)
          }
        }
      }, 1000)

    } catch (error) {
      console.error('Google login error:', error)
      setError('Google ile giriş yapılırken bir hata oluştu')
      setIsLoading(false)
    }
  }

  return (
    <>
      <SEO 
        title="Giriş Yap - Hiedra Collection"
        description="Hiedra Collection'a giriş yapın. E-posta doğrulama kodu ile güvenli giriş."
      />
      <div className="login-page">
        <div className="login-page-container">
          <div className="login-page-content" data-theme={theme}>
            <div className="login-security-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>Güvenli Giriş</span>
            </div>
            
            <h2 className="login-title">
              {step === 'email' ? 'Hoş Geldiniz' : 'Doğrulama Kodu'}
            </h2>
            <p className="login-subtitle">
              {step === 'email'
                ? 'Hesabınıza güvenli bir şekilde giriş yapın. E-posta adresinize gönderilecek doğrulama kodu ile kimliğiniz doğrulanacaktır.'
                : `${email} adresine gönderilen 6 haneli güvenlik kodunu girin`}
            </p>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {success && (
              <div className="login-success">
                {success}
              </div>
            )}

            {step === 'email' ? (
              <>
                <form onSubmit={handleEmailSubmit} className="login-form">
                  <div className="login-form-group">
                    <label htmlFor="email" className="login-label">
                      E-posta Adresi
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="login-input"
                      placeholder="E-posta adresinizi girin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="login-submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Kod gönderiliyor...' : 'Doğrulama Kodu Gönder'}
                  </button>
                </form>

                <div className="login-divider">
                  <span>veya</span>
                </div>

                <button
                  type="button"
                  className="login-google-button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google ile Giriş Yap
                </button>

                {step === 'email' && (
                  <div className="login-security-features">
                    <div className="security-feature-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span>SSL Şifreli Bağlantı</span>
                    </div>
                    <div className="security-feature-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Doğrulanmış Satıcı</span>
                    </div>
                    <div className="security-feature-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Kişisel Verileriniz Korunur</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleCodeSubmit} className="login-form">
                <div className="login-form-group">
                  <label htmlFor="code" className="login-label">
                    Doğrulama Kodu
                  </label>
                  <input
                    id="code"
                    type="text"
                    className="login-input login-code-input"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setCode(value)
                    }}
                    required
                    maxLength={6}
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={isLoading}
                  />
                  <p className="login-code-hint">
                    6 haneli doğrulama kodunu girin
                  </p>
                </div>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? 'Doğrulanıyor...' : 'Giriş Yap'}
                </button>

                <div className="login-resend-section">
                  <button
                    type="button"
                    className="login-resend-button"
                    onClick={handleResendCode}
                    disabled={!canResend || isLoading || resendCooldown > 0}
                  >
                    {resendCooldown > 0
                      ? `Yeniden gönder (${formatTime(resendCooldown)})`
                      : 'Yeniden Kod Gönder'}
                  </button>
                  <button
                    type="button"
                    className="login-back-button"
                    onClick={handleBackToEmail}
                    disabled={isLoading}
                  >
                    E-posta değiştir
                  </button>
                </div>
              </form>
            )}

            <div className="login-footer">
              <p className="login-footer-text">
                Hesabınız yok mu? Otomatik olarak oluşturulacaktır.
              </p>
              
              {/* Sözleşme Onayı Bilgilendirmesi - Minimal */}
              <div className="login-agreement-notice">
                <p className="agreement-notice-text">
                  Kişisel verileriniz, <Link to="/kvkk" target="_blank"><strong>Aydınlatma Metni</strong></Link> kapsamında işlenmektedir. "Doğrulama Kodu Gönder" butonuna basarak <Link to="/kullanim-kosullari" target="_blank"><strong>Üyelik Sözleşmesi</strong></Link>'ni ve <Link to="/gizlilik-politikasi" target="_blank"><strong>Gizlilik Politikası</strong></Link>'nı okuduğunuzu ve kabul ettiğinizi onaylıyorsunuz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login

import { useState, useEffect, type FormEvent } from 'react'
import { FaUser, FaEnvelope, FaSave, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaPhone, FaIdCard, FaEdit, FaCalendarAlt, FaClock, FaShieldAlt, FaPalette, FaBell, FaEye, FaGlobe, FaChartBar, FaFileAlt, FaSun, FaMoon, FaSync, FaShoppingCart, FaBox, FaClipboard, FaChartLine, FaCalendar } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'
import VerificationCodeModal from '../components/VerificationCodeModal'
import { useTheme } from '../context/ThemeContext'

type ProfilePageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
  onLogout: () => void
}

type UserProfile = {
  id: number
  email: string
  fullName?: string
  phone?: string
  emailVerified: boolean
  active: boolean
  lastLoginAt?: string
  createdAt?: string
}

type AppSettings = {
  theme?: {
    theme: string
  }
  notifications?: {
    emailNotifications: boolean
    orderNotifications: boolean
    userNotifications: boolean
    systemNotifications: boolean
  }
  display?: {
    itemsPerPage: number
    compactMode: boolean
    showSidebar: boolean
  }
  locale?: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: string
  }
  dashboard?: {
    refreshInterval: number
    showCharts: boolean
    showStatistics: boolean
  }
  reports?: {
    dailyReportEnabled: boolean
    weeklyReportEnabled: boolean
    monthlyReportEnabled: boolean
    reportTime: string
    reportEmail: string
  }
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Kayıt bulunmuyor'
  }

  return new Date(value).toLocaleString('tr-TR', {
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

function ProfilePage({ session, toast, onLogout }: ProfilePageProps) {
  const { user } = session
  const { setTheme: setThemeContext } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEmailChanging, setIsEmailChanging] = useState(false)
  const [isEmailVerifying, setIsEmailVerifying] = useState(false)
  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState('')
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  
  // Settings states
  const [settings, setSettings] = useState<AppSettings>({})
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [isSettingsSaving, setIsSettingsSaving] = useState(false)
  const [settingsActiveTab, setSettingsActiveTab] = useState<string>('theme')
  
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
  })

  const [emailChangeForm, setEmailChangeForm] = useState({
    newEmail: '',
    verificationCode: '',
  })

  useEffect(() => {
    fetchProfile()
    fetchSettings()
  }, [session.accessToken])

  // Settings functions
  const fetchSettings = async () => {
    try {
      setIsSettingsLoading(true)
      const response = await fetch(`${apiBaseUrl}/admin/settings`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: AppSettings
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setSettings(payload.data)
          if (payload.data?.theme?.theme) {
            setThemeContext(payload.data.theme.theme as 'light' | 'dark' | 'auto')
          }
        }
      }
    } catch (err) {
      console.error('Ayarlar yüklenemedi:', err)
    } finally {
      setIsSettingsLoading(false)
    }
  }

  const handleSettingsSave = async () => {
    try {
      setIsSettingsSaving(true)
      const response = await fetch(`${apiBaseUrl}/admin/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Ayarlar kaydedilemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (!success) {
        throw new Error('Ayarlar kaydedilemedi.')
      }

      toast.success('Ayarlar başarıyla kaydedildi.')
      if (settings.theme?.theme) {
        setThemeContext(settings.theme.theme as 'light' | 'dark' | 'auto')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ayarlar kaydedilemedi.'
      toast.error(message)
    } finally {
      setIsSettingsSaving(false)
    }
  }

  const handleSettingsChange = (category: keyof AppSettings, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [field]: value,
      },
    }))
  }


  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBaseUrl}/user/profile`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: UserProfile
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setProfile(payload.data)
          setProfileForm({
            fullName: payload.data.fullName || '',
            phone: payload.data.phone || '',
          })
        } else {
          // Fallback to session user data
          setProfile({
            id: user.id,
            email: user.email,
            fullName: '',
            phone: '',
            emailVerified: user.emailVerified,
            active: user.active,
            lastLoginAt: user.lastLoginAt || undefined,
          })
        }
      } else {
        // Fallback to session user data
        setProfile({
          id: user.id,
          email: user.email,
          fullName: '',
          phone: '',
          emailVerified: user.emailVerified,
          active: user.active,
          lastLoginAt: user.lastLoginAt || undefined,
        })
      }
    } catch (err) {
      console.error('Profil yüklenemedi:', err)
      // Fallback to session user data
      setProfile({
        id: user.id,
        email: user.email,
        fullName: '',
        phone: '',
        emailVerified: user.emailVerified,
        active: user.active,
        lastLoginAt: user.lastLoginAt || undefined,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!session?.accessToken) {
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }
    
    setIsSaving(true)

    try {
      const response = await fetch(`${apiBaseUrl}/user/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
        data?: UserProfile
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!response.ok || !success) {
        throw new Error(payload.message ?? 'Profil güncellenemedi.')
      }

      if (payload.data) {
        setProfile(payload.data)
      }
      toast.success('Profil başarıyla güncellendi.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profil güncellenemedi.'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequestEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!emailChangeForm.newEmail || !emailChangeForm.newEmail.includes('@')) {
      toast.error('Geçerli bir email adresi giriniz.')
      return
    }

    if (emailChangeForm.newEmail.toLowerCase() === user.email.toLowerCase()) {
      toast.error('Yeni email adresi mevcut email ile aynı olamaz.')
      return
    }
    
    if (!session?.accessToken) {
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }
    
    setIsEmailChanging(true)

    try {
      console.log('Email değiştirme kodu gönderiliyor...', { email: emailChangeForm.newEmail })
      
      const response = await fetch(`${apiBaseUrl}/user/change-email/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: emailChangeForm.newEmail,
        }),
      })

      console.log('Response status:', response.status, response.statusText)

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
        data?: string
        error?: string
      }

      console.log('Response payload:', payload)

      const success = payload.isSuccess ?? payload.success ?? false

      if (!response.ok || !success) {
        const errorMessage = payload.message ?? payload.error ?? 'Email değiştirme kodu gönderilemedi.'
        console.error('Email değiştirme hatası:', { response: response.status, payload })
        throw new Error(errorMessage)
      }

      // Başarılı - modal aç
      console.log('Email değiştirme kodu başarıyla gönderildi, modal açılıyor...')
      const newEmailValue = emailChangeForm.newEmail.trim().toLowerCase()
      setPendingNewEmail(newEmailValue)
      setShowVerificationModal(true)
      toast.success(`Doğrulama kodu ${user.email} adresine gönderildi.`)
    } catch (err) {
      console.error('Email değiştirme kodu gönderme hatası:', err)
      const message = err instanceof Error ? err.message : 'Email değiştirme kodu gönderilemedi.'
      toast.error(message)
    } finally {
      setIsEmailChanging(false)
    }
  }

  const handleVerifyEmailChange = async (code: string) => {
    if (!code || code.length !== 6) {
      toast.error('Lütfen 6 haneli doğrulama kodunu giriniz.')
      return
    }
    
    if (!session?.accessToken) {
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }
    
    setIsEmailVerifying(true)

    try {
      const response = await fetch(`${apiBaseUrl}/user/change-email/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: pendingNewEmail,
          code: code,
        }),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
        data?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!response.ok || !success) {
        throw new Error(payload.message ?? 'Email değiştirilemedi.')
      }

      // Email başarıyla değiştirildi, kullanıcıyı çıkış yaptır
      if (payload.data === 'LOGOUT_REQUIRED') {
        toast.success('Email adresiniz başarıyla değiştirildi. Sistemden çıkış yapılıyor...')
        setShowVerificationModal(false)
        // 2 saniye bekle, sonra çıkış yap
        setTimeout(() => {
          onLogout()
        }, 2000)
      } else {
        toast.success('Email adresiniz başarıyla değiştirildi.')
        setShowVerificationModal(false)
        setShowEmailChangeForm(false)
        setEmailChangeForm({ newEmail: '', verificationCode: '' })
        setPendingNewEmail('')
        fetchProfile()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email değiştirilemedi.'
      toast.error(message)
      throw err // Modal'da hata gösterilsin
    } finally {
      setIsEmailVerifying(false)
    }
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <p>Yükleniyor...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Profil Bilgileri</p>
          <h1>Hesap Yönetimi</h1>
          <p>Yönetici hesabınızın bilgilerini görüntüleyin ve güncelleyin.</p>
        </div>
      </section>

      <section className="dashboard__grid">
        {/* Kişisel Bilgiler */}
        <article className="dashboard-card dashboard-card--wide">
          <h2>
            <FaUser style={{ marginRight: '0.5rem' }} />
            Kişisel Bilgiler
          </h2>
          <form onSubmit={handleProfileUpdate} className="dashboard-card__form">
            <div className="dashboard-card__form-group">
              <label htmlFor="email">
                <FaEnvelope style={{ marginRight: '0.5rem' }} />
                E-posta Adresi
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <input
                  id="email"
                  type="email"
                  className="dashboard-card__form-input"
                  value={profile?.email || user.email}
                  disabled
                  style={{ 
                    backgroundColor: '#f3f4f6', 
                    cursor: 'not-allowed',
                    flex: 1
                  }}
                />
                {!showEmailChangeForm && (
                  <button
                    type="button"
                    onClick={() => setShowEmailChangeForm(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                    }}
                  >
                    <FaEdit />
                    Değiştir
                  </button>
                )}
              </div>
              {!showEmailChangeForm && (
                <small style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  E-posta adresinizi değiştirmek için "Değiştir" butonuna tıklayın
                </small>
              )}
            </div>


            <div className="dashboard-card__form-group">
              <label htmlFor="fullName">
                <FaIdCard style={{ marginRight: '0.5rem' }} />
                Ad Soyad
              </label>
              <input
                id="fullName"
                type="text"
                className="dashboard-card__form-input"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                placeholder="Adınız ve soyadınız"
                maxLength={100}
              />
            </div>

            <div className="dashboard-card__form-group">
              <label htmlFor="phone">
                <FaPhone style={{ marginRight: '0.5rem' }} />
                Telefon Numarası
              </label>
              <input
                id="phone"
                type="tel"
                className="dashboard-card__form-input"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
                maxLength={20}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" className="dashboard-card__button" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <FaSpinner style={{ marginRight: '0.5rem' }} />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <FaSave style={{ marginRight: '0.5rem' }} />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Email Değiştirme Formu - Ana formun dışında */}
          {showEmailChangeForm && (
            <form onSubmit={handleRequestEmailChange} style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div className="dashboard-card__form-group">
                <label htmlFor="newEmail" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Yeni E-posta Adresi
                </label>
                <input
                  id="newEmail"
                  type="email"
                  className="dashboard-card__form-input"
                  value={emailChangeForm.newEmail}
                  onChange={(e) => setEmailChangeForm({ ...emailChangeForm, newEmail: e.target.value })}
                  placeholder="ornek@email.com"
                  required
                  autoFocus
                  style={{ fontSize: '1rem' }}
                />
                <small style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                  Mevcut email adresinize ({user.email}) 6 haneli doğrulama kodu gönderilecektir
                </small>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="dashboard-card__button" disabled={isEmailChanging} style={{ flex: 1 }}>
                  {isEmailChanging ? (
                    <>
                      <FaSpinner style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <FaEnvelope style={{ marginRight: '0.5rem' }} />
                      Doğrulama Kodu Gönder
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailChangeForm(false)
                    setEmailChangeForm({ newEmail: '', verificationCode: '' })
                    setPendingNewEmail('')
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  İptal
                </button>
              </div>
            </form>
          )}

          <VerificationCodeModal
            isOpen={showVerificationModal}
            email={user.email}
            onVerify={handleVerifyEmailChange}
            onCancel={() => {
              setShowVerificationModal(false)
              setPendingNewEmail('')
            }}
            onResendCode={async () => {
              if (!session?.accessToken || !pendingNewEmail) return
              setIsEmailChanging(true)
              try {
                const response = await fetch(`${apiBaseUrl}/user/change-email/request`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    newEmail: pendingNewEmail,
                  }),
                })
                const payload = (await response.json()) as {
                  isSuccess?: boolean
                  success?: boolean
                  message?: string
                  error?: string
                }
                const success = payload.isSuccess ?? payload.success ?? false
                if (!response.ok || !success) {
                  throw new Error(payload.message ?? payload.error ?? 'Kod gönderilemedi.')
                }
                toast.success(`Doğrulama kodu tekrar ${user.email} adresine gönderildi.`)
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Kod gönderilemedi.'
                toast.error(message)
              } finally {
                setIsEmailChanging(false)
              }
            }}
            isLoading={isEmailVerifying}
            isResending={isEmailChanging}
          />
        </article>

        {/* Hesap Bilgileri */}
        <article className="dashboard-card">
          <h2>
            <FaShieldAlt style={{ marginRight: '0.5rem' }} />
            Hesap Bilgileri
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Kullanıcı ID */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FaIdCard style={{ fontSize: '1.5rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Kullanıcı ID</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>#{profile?.id || user.id}</div>
                </div>
              </div>
            </div>

            {/* Rol */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FaUser style={{ fontSize: '1.5rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Yetki Seviyesi</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{user.role}</div>
                </div>
              </div>
            </div>

            {/* E-posta Doğrulaması */}
            <div style={{
              padding: '1.5rem',
              background: profile?.emailVerified || user.emailVerified
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              borderRadius: '12px',
              color: '#fff',
              boxShadow: profile?.emailVerified || user.emailVerified
                ? '0 4px 12px rgba(79, 172, 254, 0.3)'
                : '0 4px 12px rgba(250, 112, 154, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FaEnvelope style={{ fontSize: '1.5rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>E-posta Durumu</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {profile?.emailVerified || user.emailVerified ? (
                      <>
                        <FaCheckCircle />
                        Doğrulandı
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle />
                        Beklemede
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hesap Durumu */}
            <div style={{
              padding: '1.5rem',
              background: profile?.active !== false && user.active
                ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              borderRadius: '12px',
              color: '#fff',
              boxShadow: profile?.active !== false && user.active
                ? '0 4px 12px rgba(67, 233, 123, 0.3)'
                : '0 4px 12px rgba(250, 112, 154, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FaShieldAlt style={{ fontSize: '1.5rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Hesap Durumu</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {profile?.active !== false && user.active ? (
                      <>
                        <FaCheckCircle />
                        Aktif
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle />
                        Pasif
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Son Giriş */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
              borderRadius: '12px',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(48, 207, 208, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FaClock style={{ fontSize: '1.5rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Son Giriş</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: '600', lineHeight: '1.4' }}>
                    {formatDateTime(profile?.lastLoginAt || user.lastLoginAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Hesap Oluşturma Tarihi */}
            {profile?.createdAt && (
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                borderRadius: '12px',
                color: '#1f2937',
                boxShadow: '0 4px 12px rgba(168, 237, 234, 0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(31, 41, 55, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FaCalendarAlt style={{ fontSize: '1.5rem', color: '#1f2937' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.25rem', color: '#1f2937' }}>Hesap Oluşturma</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: '600', lineHeight: '1.4', color: '#1f2937' }}>
                      {formatDateTime(profile.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Ayarlar */}
        <article className="dashboard-card">
          <h2>
            <FaPalette style={{ marginRight: '0.5rem' }} />
            Ayarlar
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Panel görünümünü ve tercihlerinizi buradan yönetebilirsiniz.
          </p>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem' }}>
            {[
              { id: 'theme', label: 'Tema', icon: <FaPalette /> },
              { id: 'notifications', label: 'Bildirimler', icon: <FaBell /> },
              { id: 'display', label: 'Görünüm', icon: <FaEye /> },
              { id: 'locale', label: 'Dil & Yerel', icon: <FaGlobe /> },
              { id: 'dashboard', label: 'Dashboard', icon: <FaChartBar /> },
              { id: 'reports', label: 'Raporlar', icon: <FaFileAlt /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSettingsActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: settingsActiveTab === tab.id ? '#2563eb' : 'transparent',
                  color: settingsActiveTab === tab.id ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {/* Tema Ayarları */}
            {settingsActiveTab === 'theme' && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <FaPalette style={{ marginRight: '0.5rem' }} />
                  Tema Tercihi
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Panel görünümünüz için bir tema seçin
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {['light', 'dark', 'auto'].map((theme) => (
                    <label
                      key={theme}
                      style={{
                        padding: '1.5rem',
                        border: `2px solid ${settings.theme?.theme === theme || (settings.theme?.theme === undefined && theme === 'light') ? '#2563eb' : '#e5e7eb'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: settings.theme?.theme === theme || (settings.theme?.theme === undefined && theme === 'light') ? 'rgba(37, 99, 235, 0.05)' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={theme}
                        checked={settings.theme?.theme === theme || (settings.theme?.theme === undefined && theme === 'light')}
                        onChange={(e) => {
                          const newTheme = e.target.value as 'light' | 'dark' | 'auto'
                          handleSettingsChange('theme', 'theme', newTheme)
                          setThemeContext(newTheme)
                        }}
                        style={{ display: 'none' }}
                      />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: '#2563eb' }}>
                          {theme === 'light' ? <FaSun /> : theme === 'dark' ? <FaMoon /> : <FaSync />}
                        </div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          {theme === 'light' ? 'Açık' : theme === 'dark' ? 'Koyu' : 'Otomatik'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {theme === 'light' ? 'Açık renk teması' : theme === 'dark' ? 'Koyu renk teması' : 'Sistem temasını kullan'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Bildirim Ayarları */}
            {settingsActiveTab === 'notifications' && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <FaBell style={{ marginRight: '0.5rem' }} />
                  Bildirim Tercihleri
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Hangi bildirimleri almak istediğinizi seçin
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { key: 'emailNotifications', label: 'E-posta Bildirimleri', desc: 'Sistem bildirimlerini e-posta ile al', icon: <FaEnvelope /> },
                    { key: 'orderNotifications', label: 'Sipariş Bildirimleri', desc: 'Yeni siparişler hakkında bildirim al', icon: <FaShoppingCart /> },
                    { key: 'userNotifications', label: 'Kullanıcı Bildirimleri', desc: 'Yeni kullanıcı kayıtları hakkında bildirim al', icon: <FaUser /> },
                    { key: 'systemNotifications', label: 'Sistem Bildirimleri', desc: 'Sistem durumu ve hata bildirimleri', icon: <FaExclamationTriangle /> },
                  ].map((item) => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f9fafb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ fontSize: '1.5rem', color: '#2563eb' }}>{item.icon}</div>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.label}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{item.desc}</div>
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                        <input
                          type="checkbox"
                          checked={settings.notifications?.[item.key as keyof typeof settings.notifications] ?? false}
                          onChange={(e) => handleSettingsChange('notifications', item.key, e.target.checked)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: (settings.notifications?.[item.key as keyof typeof settings.notifications] ?? false) ? '#2563eb' : '#ccc',
                          transition: '0.3s',
                          borderRadius: '28px',
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '20px',
                            width: '20px',
                            left: '4px',
                            bottom: '4px',
                            backgroundColor: '#fff',
                            transition: '0.3s',
                            borderRadius: '50%',
                            transform: (settings.notifications?.[item.key as keyof typeof settings.notifications] ?? false) ? 'translateX(22px)' : 'translateX(0)',
                          }} />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Görünüm Ayarları */}
            {settingsActiveTab === 'display' && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <FaEye style={{ marginRight: '0.5rem' }} />
                  Görünüm Ayarları
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Panel görünümünü özelleştirin
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Sayfa Başına Öğe Sayısı
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      value={settings.display?.itemsPerPage ?? 20}
                      onChange={(e) => handleSettingsChange('display', 'itemsPerPage', parseInt(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Liste görünümlerinde sayfa başına gösterilecek öğe sayısı
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'compactMode', label: 'Kompakt Mod', desc: 'Daha az boşluklu, kompakt görünüm', icon: <FaBox /> },
                      { key: 'showSidebar', label: 'Sidebar Göster', desc: 'Sol taraftaki menüyü göster/gizle', icon: <FaClipboard /> },
                    ].map((item) => (
                      <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f9fafb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <div style={{ fontSize: '1.5rem', color: '#2563eb' }}>{item.icon}</div>
                          <div>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.label}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{item.desc}</div>
                          </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                          <input
                            type="checkbox"
                            checked={(settings.display?.[item.key as keyof typeof settings.display] as boolean) ?? (item.key === 'showSidebar' ? true : false)}
                            onChange={(e) => handleSettingsChange('display', item.key, e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: ((settings.display?.[item.key as keyof typeof settings.display] as boolean) ?? (item.key === 'showSidebar' ? true : false)) ? '#2563eb' : '#ccc',
                            transition: '0.3s',
                            borderRadius: '28px',
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '""',
                              height: '20px',
                              width: '20px',
                              left: '4px',
                              bottom: '4px',
                              backgroundColor: '#fff',
                              transition: '0.3s',
                              borderRadius: '50%',
                              transform: ((settings.display?.[item.key as keyof typeof settings.display] as boolean) ?? (item.key === 'showSidebar' ? true : false)) ? 'translateX(22px)' : 'translateX(0)',
                            }} />
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Dil & Yerel Ayarlar */}
            {settingsActiveTab === 'locale' && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <FaGlobe style={{ marginRight: '0.5rem' }} />
                  Dil ve Yerel Ayarlar
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Dil, zaman dilimi ve tarih/saat formatlarını ayarlayın
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>Dil</label>
                    <select
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      value={settings.locale?.language ?? 'tr'}
                      onChange={(e) => handleSettingsChange('locale', 'language', e.target.value)}
                    >
                      <option value="tr">🇹🇷 Türkçe</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>Zaman Dilimi</label>
                    <select
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      value={settings.locale?.timezone ?? 'Europe/Istanbul'}
                      onChange={(e) => handleSettingsChange('locale', 'timezone', e.target.value)}
                    >
                      <option value="Europe/Istanbul">🇹🇷 İstanbul (GMT+3)</option>
                      <option value="UTC">🌍 UTC (GMT+0)</option>
                      <option value="America/New_York">🇺🇸 New York (GMT-5)</option>
                      <option value="Europe/London">🇬🇧 Londra (GMT+0)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>Tarih Formatı</label>
                    <select
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      value={settings.locale?.dateFormat ?? 'dd/MM/yyyy'}
                      onChange={(e) => handleSettingsChange('locale', 'dateFormat', e.target.value)}
                    >
                      <option value="dd/MM/yyyy">GG/AA/YYYY (31/12/2024)</option>
                      <option value="MM/dd/yyyy">AA/GG/YYYY (12/31/2024)</option>
                      <option value="yyyy-MM-dd">YYYY-AA-GG (2024-12-31)</option>
                      <option value="dd.MM.yyyy">GG.AA.YYYY (31.12.2024)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>Saat Formatı</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {['12', '24'].map((format) => (
                        <label
                          key={format}
                          style={{
                            flex: 1,
                            padding: '1rem',
                            border: `2px solid ${settings.locale?.timeFormat === format ? '#2563eb' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: settings.locale?.timeFormat === format ? 'rgba(37, 99, 235, 0.05)' : '#fff',
                            transition: 'all 0.2s',
                          }}
                        >
                          <input
                            type="radio"
                            name="timeFormat"
                            value={format}
                            checked={settings.locale?.timeFormat === format}
                            onChange={(e) => handleSettingsChange('locale', 'timeFormat', e.target.value)}
                            style={{ display: 'none' }}
                          />
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{format === '12' ? '🕐' : '🕛'}</div>
                          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{format} Saat</div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Ayarları */}
            {settingsActiveTab === 'dashboard' && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <FaChartBar style={{ marginRight: '0.5rem' }} />
                  Dashboard Ayarları
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Dashboard görünümünü ve yenileme ayarlarını yapılandırın
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Yenileme Aralığı (saniye)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="10"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      value={settings.dashboard?.refreshInterval ?? 30}
                      onChange={(e) => handleSettingsChange('dashboard', 'refreshInterval', parseInt(e.target.value))}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Dashboard verilerinin otomatik yenilenme sıklığı
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'showCharts', label: 'Grafikleri Göster', desc: 'Dashboard\'daki grafikleri göster/gizle', icon: <FaChartLine /> },
                      { key: 'showStatistics', label: 'İstatistikleri Göster', desc: 'Dashboard\'daki istatistik kartlarını göster/gizle', icon: <FaChartBar /> },
                    ].map((item) => (
                      <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f9fafb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <div style={{ fontSize: '1.5rem', color: '#2563eb' }}>{item.icon}</div>
                          <div>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.label}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{item.desc}</div>
                          </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                          <input
                            type="checkbox"
                            checked={(settings.dashboard?.[item.key as keyof typeof settings.dashboard] as boolean) ?? true}
                            onChange={(e) => handleSettingsChange('dashboard', item.key, e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: ((settings.dashboard?.[item.key as keyof typeof settings.dashboard] as boolean) ?? true) ? '#2563eb' : '#ccc',
                            transition: '0.3s',
                            borderRadius: '28px',
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '""',
                              height: '20px',
                              width: '20px',
                              left: '4px',
                              bottom: '4px',
                              backgroundColor: '#fff',
                              transition: '0.3s',
                              borderRadius: '50%',
                              transform: ((settings.dashboard?.[item.key as keyof typeof settings.dashboard] as boolean) ?? true) ? 'translateX(22px)' : 'translateX(0)',
                            }} />
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rapor Ayarları */}
            {settingsActiveTab === 'reports' && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <FaFileAlt style={{ marginRight: '0.5rem' }} />
                  Rapor Ayarları
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Otomatik rapor gönderim ayarlarını yapılandırın
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'dailyReportEnabled', label: 'Günlük Rapor', desc: 'Her gün belirlenen saatte günlük rapor gönder', icon: <FaCalendar /> },
                      { key: 'weeklyReportEnabled', label: 'Haftalık Rapor', desc: 'Her Pazartesi sabah haftalık rapor gönder', icon: <FaCalendarAlt /> },
                      { key: 'monthlyReportEnabled', label: 'Aylık Rapor', desc: 'Her ayın 1\'inde aylık rapor gönder', icon: <FaChartBar /> },
                    ].map((item) => (
                      <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f9fafb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <div style={{ fontSize: '1.5rem', color: '#2563eb' }}>{item.icon}</div>
                          <div>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.label}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{item.desc}</div>
                          </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                          <input
                            type="checkbox"
                            checked={(settings.reports?.[item.key as keyof typeof settings.reports] as boolean) ?? false}
                            onChange={(e) => handleSettingsChange('reports', item.key, e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: ((settings.reports?.[item.key as keyof typeof settings.reports] as boolean) ?? false) ? '#2563eb' : '#ccc',
                            transition: '0.3s',
                            borderRadius: '28px',
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '""',
                              height: '20px',
                              width: '20px',
                              left: '4px',
                              bottom: '4px',
                              backgroundColor: '#fff',
                              transition: '0.3s',
                              borderRadius: '50%',
                              transform: ((settings.reports?.[item.key as keyof typeof settings.reports] as boolean) ?? false) ? 'translateX(22px)' : 'translateX(0)',
                            }} />
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Rapor Gönderim Saati (Günlük Rapor İçin)
                    </label>
                    <input
                      type="time"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      value={settings.reports?.reportTime ?? '09:00'}
                      onChange={(e) => handleSettingsChange('reports', 'reportTime', e.target.value)}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Günlük raporun gönderileceği saat (HH:mm formatında)
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Özel Rapor E-posta Adresi (Opsiyonel)
                    </label>
                    <input
                      type="email"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      value={settings.reports?.reportEmail ?? ''}
                      onChange={(e) => handleSettingsChange('reports', 'reportEmail', e.target.value)}
                      placeholder="rapor@example.com"
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Raporların gönderileceği özel e-posta adresi. Boş bırakılırsa admin e-postası kullanılır.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSettingsSave}
                disabled={isSettingsSaving || isSettingsLoading}
                className="dashboard-card__button"
                style={{ minWidth: '200px' }}
              >
                {isSettingsSaving ? (
                  <>
                    <FaSpinner style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <FaSave style={{ marginRight: '0.5rem' }} />
                    Ayarları Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </article>

      </section>
    </main>
  )
}

export default ProfilePage

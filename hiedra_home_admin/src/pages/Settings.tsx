import { useState, useEffect } from 'react'
import { FaPalette, FaBell, FaEye, FaGlobe, FaChartBar, FaFileAlt, FaSun, FaMoon, FaSync, FaEnvelope, FaExclamationTriangle, FaClipboard, FaCalendar, FaUser, FaShoppingCart, FaBox, FaSpinner, FaSave, FaChartLine, FaCalendarAlt } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { useTheme } from '../context/ThemeContext'

type SettingsPageProps = {
  session: AuthResponse
  toast?: {
    showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => string
    success: (message: string) => string
    error: (message: string) => string
    info: (message: string) => string
  }
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

function SettingsPage({ session, toast }: SettingsPageProps) {
  const { setTheme: setThemeContext } = useTheme()
  const [settings, setSettings] = useState<AppSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('theme')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/settings`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Ayarlar yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: AppSettings
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Ayarlar yüklenemedi.')
      }

      setSettings(payload.data)
      
      // Tema ayarını context'e yükle
      if (payload.data?.theme?.theme) {
        setThemeContext(payload.data.theme.theme as 'light' | 'dark' | 'auto')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

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
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Ayarlar kaydedilemedi.')
      }

      setSuccess('Ayarlar başarıyla kaydedildi.')
      toast?.success('Ayarlar başarıyla kaydedildi.')
      
      // Tema değiştiyse context'i güncelle
      if (settings.theme?.theme) {
        setThemeContext(settings.theme.theme as 'light' | 'dark' | 'auto')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(message)
      toast?.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (category: keyof AppSettings, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [field]: value,
      },
    }))
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <div className="dashboard__hero-text">
            <h1>Ayarlar</h1>
            <p>Yükleniyor...</p>
          </div>
        </section>
      </main>
    )
  }

  const tabs = [
    { id: 'theme', label: 'Tema', icon: <FaPalette /> },
    { id: 'notifications', label: 'Bildirimler', icon: <FaBell /> },
    { id: 'display', label: 'Görünüm', icon: <FaEye /> },
    { id: 'locale', label: 'Dil & Yerel', icon: <FaGlobe /> },
    { id: 'dashboard', label: 'Dashboard', icon: <FaChartBar /> },
    { id: 'reports', label: 'Raporlar', icon: <FaFileAlt /> },
  ]

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Kullanıcı Ayarları</p>
          <h1>Ayarlar</h1>
          <p>Panel görünümünü ve tercihlerinizi buradan yönetebilirsiniz.</p>
        </div>
      </section>

      {error && (
        <div className="settings-alert settings-alert--error">
          {error}
        </div>
      )}

      {success && (
        <div className="settings-alert settings-alert--success">
          {success}
        </div>
      )}

      <section className="dashboard-card settings-container">
        {/* Tab Navigation */}
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab ${activeTab === tab.id ? 'settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings-tab__icon">{tab.icon}</span>
              <span className="settings-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* Tema Ayarları */}
          {activeTab === 'theme' && (
            <div className="settings-section">
              <div className="settings-section__header">
                <h2 className="settings-section__title"><FaPalette style={{ marginRight: '0.5rem' }} /> Tema Tercihi</h2>
                <p className="settings-section__description">Panel görünümünüz için bir tema seçin</p>
              </div>
              <div className="settings-theme-options">
                {['light', 'dark', 'auto'].map((theme) => (
                  <label
                    key={theme}
                    className={`settings-theme-option ${settings.theme?.theme === theme || (settings.theme?.theme === undefined && theme === 'light') ? 'settings-theme-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={settings.theme?.theme === theme || (settings.theme?.theme === undefined && theme === 'light')}
                      onChange={(e) => {
                        const newTheme = e.target.value as 'light' | 'dark' | 'auto'
                        handleChange('theme', 'theme', newTheme)
                        // Anında tema değişimi
                        setThemeContext(newTheme)
                      }}
                      className="settings-theme-option__input"
                    />
                    <div className="settings-theme-option__icon">
                      {theme === 'light' ? <FaSun /> : theme === 'dark' ? <FaMoon /> : <FaSync />}
                    </div>
                    <div className="settings-theme-option__label">
                      {theme === 'light' ? 'Açık' : theme === 'dark' ? 'Koyu' : 'Otomatik'}
                    </div>
                    <div className="settings-theme-option__description">
                      {theme === 'light' ? 'Açık renk teması' : theme === 'dark' ? 'Koyu renk teması' : 'Sistem temasını kullan'}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Bildirim Ayarları */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="settings-section__header">
                <h2 className="settings-section__title"><FaBell style={{ marginRight: '0.5rem' }} /> Bildirim Tercihleri</h2>
                <p className="settings-section__description">Hangi bildirimleri almak istediğinizi seçin</p>
              </div>
              <div className="settings-options-list">
                {[
                  { key: 'emailNotifications', label: 'E-posta Bildirimleri', desc: 'Sistem bildirimlerini e-posta ile al', icon: <FaEnvelope /> },
                  { key: 'orderNotifications', label: 'Sipariş Bildirimleri', desc: 'Yeni siparişler hakkında bildirim al', icon: <FaShoppingCart /> },
                  { key: 'userNotifications', label: 'Kullanıcı Bildirimleri', desc: 'Yeni kullanıcı kayıtları hakkında bildirim al', icon: <FaUser /> },
                  { key: 'systemNotifications', label: 'Sistem Bildirimleri', desc: 'Sistem durumu ve hata bildirimleri', icon: <FaExclamationTriangle /> },
                ].map((item) => (
                  <div key={item.key} className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon">{item.icon}</div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">{item.label}</div>
                        <div className="settings-option-item__description">{item.desc}</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.notifications?.[item.key as keyof typeof settings.notifications] ?? false}
                        onChange={(e) => handleChange('notifications', item.key, e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${(settings.notifications?.[item.key as keyof typeof settings.notifications] ?? false) ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Görünüm Ayarları */}
          {activeTab === 'display' && (
            <div className="settings-section">
              <div className="settings-section__header">
                <h2 className="settings-section__title"><FaEye style={{ marginRight: '0.5rem' }} /> Görünüm Ayarları</h2>
                <p className="settings-section__description">Panel görünümünü özelleştirin</p>
              </div>
              <div className="settings-form">
                <div className="settings-form-group">
                  <label className="settings-form-label">
                    Sayfa Başına Öğe Sayısı
                  </label>
                  <select
                    className="settings-form-select"
                    value={settings.display?.itemsPerPage ?? 20}
                    onChange={(e) => handleChange('display', 'itemsPerPage', parseInt(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <p className="settings-form-hint">
                    Liste görünümlerinde sayfa başına gösterilecek öğe sayısı
                  </p>
                </div>

                <div className="settings-options-list">
                  <div className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon"><FaBox /></div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">Kompakt Mod</div>
                        <div className="settings-option-item__description">Daha az boşluklu, kompakt görünüm</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.display?.compactMode ?? false}
                        onChange={(e) => handleChange('display', 'compactMode', e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${settings.display?.compactMode ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>

                  <div className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon"><FaClipboard /></div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">Sidebar Göster</div>
                        <div className="settings-option-item__description">Sol taraftaki menüyü göster/gizle</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.display?.showSidebar ?? true}
                        onChange={(e) => handleChange('display', 'showSidebar', e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${settings.display?.showSidebar ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dil & Yerel Ayarlar */}
          {activeTab === 'locale' && (
            <div className="settings-section">
              <div className="settings-section__header">
                <h2 className="settings-section__title"><FaGlobe style={{ marginRight: '0.5rem' }} /> Dil ve Yerel Ayarlar</h2>
                <p className="settings-section__description">Dil, zaman dilimi ve tarih/saat formatlarını ayarlayın</p>
              </div>
              <div className="settings-form">
                <div className="settings-form-group">
                  <label className="settings-form-label">Dil</label>
                  <select
                    className="settings-form-select"
                    value={settings.locale?.language ?? 'tr'}
                    onChange={(e) => handleChange('locale', 'language', e.target.value)}
                  >
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Zaman Dilimi</label>
                  <select
                    className="settings-form-select"
                    value={settings.locale?.timezone ?? 'Europe/Istanbul'}
                    onChange={(e) => handleChange('locale', 'timezone', e.target.value)}
                  >
                    <option value="Europe/Istanbul">🇹🇷 İstanbul (GMT+3)</option>
                    <option value="UTC">🌍 UTC (GMT+0)</option>
                    <option value="America/New_York">🇺🇸 New York (GMT-5)</option>
                    <option value="Europe/London">🇬🇧 Londra (GMT+0)</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Tarih Formatı</label>
                  <select
                    className="settings-form-select"
                    value={settings.locale?.dateFormat ?? 'dd/MM/yyyy'}
                    onChange={(e) => handleChange('locale', 'dateFormat', e.target.value)}
                  >
                    <option value="dd/MM/yyyy">GG/AA/YYYY (31/12/2024)</option>
                    <option value="MM/dd/yyyy">AA/GG/YYYY (12/31/2024)</option>
                    <option value="yyyy-MM-dd">YYYY-AA-GG (2024-12-31)</option>
                    <option value="dd.MM.yyyy">GG.AA.YYYY (31.12.2024)</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Saat Formatı</label>
                  <div className="settings-radio-group">
                    {['12', '24'].map((format) => (
                      <label
                        key={format}
                        className={`settings-radio-option ${settings.locale?.timeFormat === format ? 'settings-radio-option--active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="timeFormat"
                          className="settings-radio-option__input"
                          value={format}
                          checked={settings.locale?.timeFormat === format}
                          onChange={(e) => handleChange('locale', 'timeFormat', e.target.value)}
                        />
                        <div className="settings-radio-option__icon">{format === '12' ? '🕐' : '🕛'}</div>
                        <div className="settings-radio-option__content">
                          <div className="settings-radio-option__label">{format} Saat</div>
                          <div className="settings-radio-option__description">
                            {format === '12' ? 'Öğleden önce/sonra' : '24 saatlik format'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Ayarları */}
          {activeTab === 'dashboard' && (
            <div className="settings-section">
              <div className="settings-section__header">
                <h2 className="settings-section__title"><FaChartBar style={{ marginRight: '0.5rem' }} /> Dashboard Ayarları</h2>
                <p className="settings-section__description">Dashboard görünümünü ve yenileme ayarlarını yapılandırın</p>
              </div>
              <div className="settings-form">
                <div className="settings-form-group">
                  <label className="settings-form-label">
                    Yenileme Aralığı (saniye)
                  </label>
                  <input
                    type="number"
                    className="settings-form-input"
                    min="10"
                    max="300"
                    step="10"
                    value={settings.dashboard?.refreshInterval ?? 30}
                    onChange={(e) => handleChange('dashboard', 'refreshInterval', parseInt(e.target.value))}
                  />
                  <p className="settings-form-hint">
                    Dashboard verilerinin otomatik yenilenme sıklığı
                  </p>
                </div>

                <div className="settings-options-list">
                  <div className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon"><FaChartLine /></div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">Grafikleri Göster</div>
                        <div className="settings-option-item__description">Dashboard'daki grafikleri göster/gizle</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.dashboard?.showCharts ?? true}
                        onChange={(e) => handleChange('dashboard', 'showCharts', e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${settings.dashboard?.showCharts ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>

                  <div className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon"><FaChartBar /></div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">İstatistikleri Göster</div>
                        <div className="settings-option-item__description">Dashboard'daki istatistik kartlarını göster/gizle</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.dashboard?.showStatistics ?? true}
                        onChange={(e) => handleChange('dashboard', 'showStatistics', e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${settings.dashboard?.showStatistics ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rapor Ayarları */}
          {activeTab === 'reports' && (
            <div className="settings-section">
              <div className="settings-section__header">
                <h2 className="settings-section__title"><FaFileAlt style={{ marginRight: '0.5rem' }} /> Rapor Ayarları</h2>
                <p className="settings-section__description">Otomatik rapor gönderim ayarlarını yapılandırın</p>
              </div>
              <div className="settings-form">
                <div className="settings-options-list">
                  <div className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon"><FaCalendar /></div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">Günlük Rapor</div>
                        <div className="settings-option-item__description">Her gün belirlenen saatte günlük rapor gönder</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.reports?.dailyReportEnabled ?? false}
                        onChange={(e) => handleChange('reports', 'dailyReportEnabled', e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${settings.reports?.dailyReportEnabled ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>

                  <div className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon"><FaCalendarAlt /></div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">Haftalık Rapor</div>
                        <div className="settings-option-item__description">Her Pazartesi sabah haftalık rapor gönder</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.reports?.weeklyReportEnabled ?? false}
                        onChange={(e) => handleChange('reports', 'weeklyReportEnabled', e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${settings.reports?.weeklyReportEnabled ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>

                  <div className="settings-option-item">
                    <div className="settings-option-item__content">
                      <div className="settings-option-item__icon"><FaChartBar /></div>
                      <div className="settings-option-item__text">
                        <div className="settings-option-item__label">Aylık Rapor</div>
                        <div className="settings-option-item__description">Her ayın 1'inde aylık rapor gönder</div>
                      </div>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        className="settings-toggle__input"
                        checked={settings.reports?.monthlyReportEnabled ?? false}
                        onChange={(e) => handleChange('reports', 'monthlyReportEnabled', e.target.checked)}
                      />
                      <span className={`settings-toggle__slider ${settings.reports?.monthlyReportEnabled ? 'settings-toggle__slider--active' : ''}`} />
                    </label>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">
                    Rapor Gönderim Saati (Günlük Rapor İçin)
                  </label>
                  <input
                    type="time"
                    className="settings-form-input"
                    value={settings.reports?.reportTime ?? '09:00'}
                    onChange={(e) => handleChange('reports', 'reportTime', e.target.value)}
                  />
                  <p className="settings-form-hint">
                    Günlük raporun gönderileceği saat (HH:mm formatında)
                  </p>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">
                    Özel Rapor E-posta Adresi (Opsiyonel)
                  </label>
                  <input
                    type="email"
                    className="settings-form-input"
                    value={settings.reports?.reportEmail ?? ''}
                    onChange={(e) => handleChange('reports', 'reportEmail', e.target.value)}
                    placeholder="rapor@example.com"
                  />
                  <p className="settings-form-hint">
                    Raporların gönderileceği özel e-posta adresi. Boş bırakılırsa admin e-postası kullanılır.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-primary settings-save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <><FaSpinner style={{ marginRight: '0.25rem' }} /> Kaydediliyor...</> : <><FaSave style={{ marginRight: '0.25rem' }} /> Ayarları Kaydet</>}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default SettingsPage

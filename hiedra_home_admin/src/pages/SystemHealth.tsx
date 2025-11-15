import { useEffect, useState, type FormEvent } from 'react'
import { FaCheckCircle, FaTimes, FaClock, FaGlobe, FaChartBar, FaClipboard, FaTrash, FaPlus, FaSpinner, FaDesktop, FaMemory } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import ConfirmModal from '../components/ConfirmModal'

type SystemHealthPageProps = {
  session: AuthResponse
}

type SystemHealthData = {
  status: string
  uptime: string
  uptimeMillis: number
  memoryUsed: string
  memoryFree: string
  memoryTotal: string
  memoryUsagePercent: number
  javaVersion: string
  javaVendor: string
  osName: string
  osVersion: string
  serverStartTime: string
  securityInfo: Record<string, string>
  currentUserEmail: string
  currentUserRole: string
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function SystemHealthPage({ session }: SystemHealthPageProps) {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allowedIps, setAllowedIps] = useState<string[]>([])
  const [isLoadingIps, setIsLoadingIps] = useState(false)
  const [newIp, setNewIp] = useState('')
  const [isAddingIp, setIsAddingIp] = useState(false)
  const [ipError, setIpError] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; ip: string | null }>({
    isOpen: false,
    ip: null,
  })
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  })

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/admin/system/health`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Sistem sağlık bilgileri alınamadı.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: SystemHealthData
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Sistem sağlık bilgileri alınamadı.')
        }

        setHealthData(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHealth()
  }, [session.accessToken])

  useEffect(() => {
    const fetchIps = async () => {
      try {
        setIsLoadingIps(true)
        const response = await fetch(`${apiBaseUrl}/admin/system/ips`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('IP listesi alınamadı.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: { ips: string[] }
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'IP listesi alınamadı.')
        }

        setAllowedIps(payload.data.ips)
      } catch (err) {
        console.error('IP listesi yüklenemedi:', err)
      } finally {
        setIsLoadingIps(false)
      }
    }

    if (session.accessToken) {
      fetchIps()
    }
  }, [session.accessToken])

  const handleAddIp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIpError(null)

    if (!newIp.trim()) {
      setIpError('IP adresi gereklidir.')
      return
    }

    try {
      setIsAddingIp(true)
      const response = await fetch(`${apiBaseUrl}/admin/system/ips`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: newIp.trim() }),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: { ips: string[] }
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'IP adresi eklenemedi.')
      }

      setAllowedIps(payload.data.ips)
      setNewIp('')
      setIpError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'IP adresi eklenemedi.'
      setIpError(message)
    } finally {
      setIsAddingIp(false)
    }
  }

  const handleRemoveIpClick = (ip: string) => {
    setDeleteModal({ isOpen: true, ip })
  }

  const handleRemoveIp = async () => {
    if (!deleteModal.ip) {
      return
    }

    try {
      setIsLoadingIps(true)
      const response = await fetch(`${apiBaseUrl}/admin/system/ips/${encodeURIComponent(deleteModal.ip)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: { ips: string[] }
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'IP adresi kaldırılamadı.')
      }

      setAllowedIps(payload.data.ips)
      setDeleteModal({ isOpen: false, ip: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'IP adresi kaldırılamadı.'
      setAlertModal({ isOpen: true, message })
    } finally {
      setIsLoadingIps(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Toast mesajı gösterilebilir
    })
  }

  // Format uptime
  const formatUptime = (uptime: string) => {
    return uptime
  }

  // Get memory status color
  const getMemoryStatusColor = (percent: number) => {
    if (percent < 50) return 'success'
    if (percent < 75) return 'warning'
    return 'error'
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

  if (error || !healthData) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <p className="dashboard-card__feedback dashboard-card__feedback--error">
            {error ?? 'Sistem sağlık bilgileri alınamadı.'}
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Sistem Durumu</p>
          <h1>Sistem Sağlığı</h1>
          <p>Sunucu durumu, kaynak kullanımı ve güvenlik yapılandırması bilgileri.</p>
        </div>
        <div className="dashboard__hero-actions">
          <span
            className={`system-health-status-badge ${
              healthData.status === 'UP' ? 'system-health-status-badge--success' : 'system-health-status-badge--error'
            }`}
          >
            {healthData.status === 'UP' ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> ÇALIŞIYOR</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> ÇALIŞMIYOR</>}
          </span>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid system-health-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="system-health-stats__title">Sistem Özeti</h3>
          <div className="system-health-stats__grid">
            <div className={`system-health-stat-card system-health-stat-card--${healthData.status === 'UP' ? 'success' : 'error'}`}>
              <div className="system-health-stat-card__icon">{healthData.status === 'UP' ? <FaCheckCircle /> : <FaTimes />}</div>
              <div className="system-health-stat-card__value">{healthData.status}</div>
              <div className="system-health-stat-card__label">Sistem Durumu</div>
              <div className="system-health-stat-card__subtitle">{healthData.status === 'UP' ? 'Aktif' : 'Pasif'}</div>
            </div>
            <div className={`system-health-stat-card system-health-stat-card--${getMemoryStatusColor(healthData.memoryUsagePercent)}`}>
              <div className="system-health-stat-card__icon"><FaMemory /></div>
              <div className="system-health-stat-card__value">{healthData.memoryUsagePercent}%</div>
              <div className="system-health-stat-card__label">Bellek Kullanımı</div>
              <div className="system-health-stat-card__subtitle">{healthData.memoryUsed} / {healthData.memoryTotal}</div>
            </div>
            <div className="system-health-stat-card system-health-stat-card--info">
              <div className="system-health-stat-card__icon"><FaClock /></div>
              <div className="system-health-stat-card__value">{formatUptime(healthData.uptime)}</div>
              <div className="system-health-stat-card__label">Çalışma Süresi</div>
              <div className="system-health-stat-card__subtitle">Uptime</div>
            </div>
            <div className="system-health-stat-card system-health-stat-card--info">
              <div className="system-health-stat-card__icon"><FaGlobe /></div>
              <div className="system-health-stat-card__value">{allowedIps.length}</div>
              <div className="system-health-stat-card__label">İzin Verilen IP</div>
              <div className="system-health-stat-card__subtitle">Admin erişimi</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        {/* Sunucu Durumu */}
        <article className="dashboard-card system-health-card">
          <div className="system-health-card__header">
            <h2 className="system-health-card__title"><FaDesktop style={{ marginRight: '0.5rem' }} /> Sunucu Durumu</h2>
          </div>
          <div className="system-health-card__content">
            <div className="system-health-info-grid">
              <div className="system-health-info-item">
                <div className="system-health-info-item__icon"><FaChartBar /></div>
                <div className="system-health-info-item__content">
                  <div className="system-health-info-item__label">Durum</div>
                  <div className="system-health-info-item__value">
                    <span
                      className={`system-health-badge ${
                        healthData.status === 'UP' ? 'system-health-badge--success' : 'system-health-badge--error'
                      }`}
                    >
                      {healthData.status === 'UP' ? <><FaCheckCircle style={{ marginRight: '0.25rem' }} /> UP</> : <><FaTimes style={{ marginRight: '0.25rem' }} /> DOWN</>}
                    </span>
                  </div>
                </div>
              </div>
              <div className="system-health-info-item">
                <div className="system-health-info-item__icon"><FaClock /></div>
                <div className="system-health-info-item__content">
                  <div className="system-health-info-item__label">Çalışma Süresi</div>
                  <div className="system-health-info-item__value">{formatUptime(healthData.uptime)}</div>
                </div>
              </div>
              <div className="system-health-info-item">
                <div className="system-health-info-item__icon">🕐</div>
                <div className="system-health-info-item__content">
                  <div className="system-health-info-item__label">Başlangıç Zamanı</div>
                  <div className="system-health-info-item__value">
                    {new Date(healthData.serverStartTime).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Bellek Kullanımı */}
        <article className="dashboard-card system-health-card">
          <div className="system-health-card__header">
            <h2 className="system-health-card__title"><FaMemory style={{ marginRight: '0.5rem' }} /> Bellek Kullanımı</h2>
          </div>
          <div className="system-health-card__content">
            <div className="system-health-memory">
              <div className="system-health-memory__progress">
                <div className="system-health-memory__progress-bar-wrapper">
                  <div
                    className={`system-health-memory__progress-bar system-health-memory__progress-bar--${getMemoryStatusColor(healthData.memoryUsagePercent)}`}
                    style={{ width: `${healthData.memoryUsagePercent}%` }}
                  />
                </div>
                <div className="system-health-memory__progress-text">
                  {healthData.memoryUsagePercent}% Kullanılıyor
                </div>
              </div>
              <div className="system-health-memory__details">
                <div className="system-health-memory__detail-item">
                  <div className="system-health-memory__detail-label">Kullanılan</div>
                  <div className="system-health-memory__detail-value">{healthData.memoryUsed}</div>
                </div>
                <div className="system-health-memory__detail-item">
                  <div className="system-health-memory__detail-label">Boş</div>
                  <div className="system-health-memory__detail-value">{healthData.memoryFree}</div>
                </div>
                <div className="system-health-memory__detail-item">
                  <div className="system-health-memory__detail-label">Toplam</div>
                  <div className="system-health-memory__detail-value">{healthData.memoryTotal}</div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* JVM Bilgileri */}
        <article className="dashboard-card system-health-card">
          <div className="system-health-card__header">
            <h2 className="system-health-card__title">☕ JVM Bilgileri</h2>
          </div>
          <div className="system-health-card__content">
            <div className="system-health-info-grid">
              <div className="system-health-info-item">
                <div className="system-health-info-item__icon">☕</div>
                <div className="system-health-info-item__content">
                  <div className="system-health-info-item__label">Java Sürümü</div>
                  <div className="system-health-info-item__value">{healthData.javaVersion}</div>
                </div>
              </div>
              <div className="system-health-info-item">
                <div className="system-health-info-item__icon">🏢</div>
                <div className="system-health-info-item__content">
                  <div className="system-health-info-item__label">Java Üreticisi</div>
                  <div className="system-health-info-item__value">{healthData.javaVendor}</div>
                </div>
              </div>
              <div className="system-health-info-item">
                <div className="system-health-info-item__icon"><FaDesktop /></div>
                <div className="system-health-info-item__content">
                  <div className="system-health-info-item__label">İşletim Sistemi</div>
                  <div className="system-health-info-item__value">{healthData.osName}</div>
                </div>
              </div>
              <div className="system-health-info-item">
                <div className="system-health-info-item__icon"><FaClipboard /></div>
                <div className="system-health-info-item__content">
                  <div className="system-health-info-item__label">OS Sürümü</div>
                  <div className="system-health-info-item__value">{healthData.osVersion}</div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Güvenlik Yapılandırması */}
        <article className="dashboard-card dashboard-card--wide system-health-card">
          <div className="system-health-card__header">
            <h2 className="system-health-card__title">🔒 Güvenlik Yapılandırması</h2>
          </div>
          <p className="system-health-card__description">
            Sistem güvenlik ayarları ve yapılandırma durumu. Hassas bilgiler maskelenmiştir.
          </p>
          <div className="system-health-card__content">
            <div className="system-health-security-grid">
              {Object.entries(healthData.securityInfo)
                .filter(([key]) => key !== 'allowedAdminIps')
                .map(([key, value]) => (
                  <div key={key} className="system-health-security-item">
                    <div className="system-health-security-item__label">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="system-health-security-item__value">
                      {value}
                      <button
                        type="button"
                        className="system-health-security-item__copy"
                        onClick={() => copyToClipboard(value)}
                        title="Kopyala"
                      >
                        <FaClipboard />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </article>

        {/* İzin Verilen Admin IP Adresleri */}
        <article className="dashboard-card dashboard-card--wide system-health-card">
          <div className="system-health-card__header">
            <h2 className="system-health-card__title"><FaGlobe style={{ marginRight: '0.5rem' }} /> İzin Verilen Admin IP Adresleri</h2>
          </div>
          <p className="system-health-card__description">
            Yönetici paneline erişim izni olan IP adreslerini yönetin. IP adresi ekleyebilir veya kaldırabilirsiniz.
          </p>

          <form onSubmit={handleAddIp} className="system-health-ip-form">
            <div className="system-health-ip-form__group">
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="Örn: 192.168.1.1"
                className="system-health-ip-form__input"
                disabled={isAddingIp}
              />
              <button
                type="submit"
                className="btn btn-primary system-health-ip-form__button"
                disabled={isAddingIp || !newIp.trim()}
              >
                {isAddingIp ? <><FaSpinner style={{ marginRight: '0.25rem' }} /> Ekleniyor...</> : <><FaPlus style={{ marginRight: '0.25rem' }} /> IP Ekle</>}
              </button>
            </div>
            {ipError && (
              <p className="system-health-ip-form__error">{ipError}</p>
            )}
          </form>

          {isLoadingIps ? (
            <div className="system-health-ip-loading">
              <p>IP listesi yükleniyor...</p>
            </div>
          ) : allowedIps.length === 0 ? (
            <p className="dashboard-card__empty">Henüz IP adresi eklenmemiş.</p>
          ) : (
            <div className="system-health-ip-list">
              {allowedIps.map((ip) => (
                <div key={ip} className="system-health-ip-item">
                  <div className="system-health-ip-item__content">
                    <div className="system-health-ip-item__icon"><FaGlobe /></div>
                    <div className="system-health-ip-item__value">{ip}</div>
                    <button
                      type="button"
                      className="system-health-ip-item__copy"
                      onClick={() => copyToClipboard(ip)}
                      title="Kopyala"
                    >
                      <FaClipboard />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="system-health-ip-item__remove"
                    onClick={() => handleRemoveIpClick(ip)}
                    disabled={isLoadingIps}
                    title="IP adresini kaldır"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        message={`"${deleteModal.ip}" IP adresini listeden kaldırmak istediğinize emin misiniz?`}
        type="confirm"
        confirmText="Kaldır"
        cancelText="İptal"
        onConfirm={handleRemoveIp}
        onCancel={() => setDeleteModal({ isOpen: false, ip: null })}
      />

      <ConfirmModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type="alert"
        confirmText="Tamam"
        showCancel={false}
        onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
        onCancel={() => setAlertModal({ isOpen: false, message: '' })}
      />
    </main>
  )
}

export default SystemHealthPage


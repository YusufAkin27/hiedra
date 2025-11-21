import { useEffect, useState } from 'react'
import { FaShieldAlt, FaBan, FaPlus, FaTrash, FaSyncAlt, FaSpinner } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { getAdminHeaders } from '../services/authService'
import { useToast } from '../components/Toast'

type IpAccessControlPageProps = {
  session: AuthResponse
}

type AllowedIpResponse = {
  ips: string[]
}

type BlockedIp = {
  id: number
  ipAddress: string
  reason?: string | null
  createdAt?: string | null
}

type BlockedIpResponse = {
  blockedIps: BlockedIp[]
}

type ApiResponse<T> = {
  isSuccess?: boolean
  success?: boolean
  message?: string
  data?: T
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function IpAccessControlPage({ session }: IpAccessControlPageProps) {
  const toast = useToast()
  const [allowedIps, setAllowedIps] = useState<string[]>([])
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [allowedForm, setAllowedForm] = useState({ ip: '', description: '' })
  const [blockedForm, setBlockedForm] = useState({ ip: '', reason: '' })
  const [isSavingAllowed, setIsSavingAllowed] = useState(false)
  const [isSavingBlocked, setIsSavingBlocked] = useState(false)
  const [removingAllowed, setRemovingAllowed] = useState<string | null>(null)
  const [removingBlocked, setRemovingBlocked] = useState<number | null>(null)

  useEffect(() => {
    void initialize()
  }, [])

  const initialize = async () => {
    setIsLoading(true)
    await Promise.all([fetchAllowedIps(), fetchBlockedIps()])
    setIsLoading(false)
  }

  const fetchAllowedIps = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/system/ips`, {
        headers: getAdminHeaders(session.accessToken),
      })
      const payload = (await response.json()) as ApiResponse<AllowedIpResponse>
      const success = payload.isSuccess ?? payload.success ?? response.ok
      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'İzin verilen IP listesi alınamadı.')
      }
      setAllowedIps(payload.data.ips ?? [])
    } catch (error) {
      console.error(error)
      toast.error('İzin verilen IP listesi alınamadı.')
    }
  }

  const fetchBlockedIps = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/system/blocked-ips`, {
        headers: getAdminHeaders(session.accessToken),
      })
      const payload = (await response.json()) as ApiResponse<BlockedIpResponse>
      const success = payload.isSuccess ?? payload.success ?? response.ok
      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Engellenen IP listesi alınamadı.')
      }
      setBlockedIps(payload.data.blockedIps ?? [])
    } catch (error) {
      console.error(error)
      toast.error('Engellenen IP listesi alınamadı.')
    }
  }

  const handleAddAllowedIp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!allowedForm.ip.trim()) {
      toast.error('IP adresi zorunludur.')
      return
    }

    setIsSavingAllowed(true)
    try {
      const response = await fetch(`${apiBaseUrl}/admin/system/ips`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify({
          ip: allowedForm.ip.trim(),
          description: allowedForm.description.trim() || undefined,
        }),
      })
      const payload = (await response.json()) as ApiResponse<AllowedIpResponse>
      const success = payload.isSuccess ?? payload.success ?? response.ok
      if (!success) {
        throw new Error(payload.message ?? 'IP adresi eklenemedi.')
      }
      toast.success(payload.message ?? 'IP adresi eklendi.')
      setAllowedIps(payload.data?.ips ?? [])
      setAllowedForm({ ip: '', description: '' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IP adresi eklenemedi.'
      toast.error(message)
    } finally {
      setIsSavingAllowed(false)
    }
  }

  const handleRemoveAllowedIp = async (ip: string) => {
    if (!confirm(`${ip} adresini listeden kaldırmak istediğinize emin misiniz?`)) {
      return
    }

    setRemovingAllowed(ip)
    try {
      const response = await fetch(`${apiBaseUrl}/admin/system/ips/${encodeURIComponent(ip)}`, {
        method: 'DELETE',
        headers: getAdminHeaders(session.accessToken),
      })
      const payload = (await response.json()) as ApiResponse<AllowedIpResponse>
      const success = payload.isSuccess ?? payload.success ?? response.ok
      if (!success) {
        throw new Error(payload.message ?? 'IP adresi kaldırılamadı.')
      }
      toast.success(payload.message ?? 'IP adresi kaldırıldı.')
      setAllowedIps(payload.data?.ips ?? [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IP adresi kaldırılamadı.'
      toast.error(message)
    } finally {
      setRemovingAllowed(null)
    }
  }

  const handleAddBlockedIp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!blockedForm.ip.trim()) {
      toast.error('IP adresi zorunludur.')
      return
    }

    setIsSavingBlocked(true)
    try {
      const response = await fetch(`${apiBaseUrl}/admin/system/blocked-ips`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify({
          ip: blockedForm.ip.trim(),
          reason: blockedForm.reason.trim() || undefined,
        }),
      })
      const payload = (await response.json()) as ApiResponse<BlockedIpResponse>
      const success = payload.isSuccess ?? payload.success ?? response.ok
      if (!success) {
        throw new Error(payload.message ?? 'Engellenen IP eklenemedi.')
      }
      toast.success(payload.message ?? 'IP adresi engellendi.')
      setBlockedIps(payload.data?.blockedIps ?? [])
      setBlockedForm({ ip: '', reason: '' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Engellenen IP eklenemedi.'
      toast.error(message)
    } finally {
      setIsSavingBlocked(false)
    }
  }

  const handleRemoveBlockedIp = async (id: number) => {
    if (!confirm('Bu IP adresini engel listesinden kaldırmak istediğinize emin misiniz?')) {
      return
    }

    setRemovingBlocked(id)
    try {
      const response = await fetch(`${apiBaseUrl}/admin/system/blocked-ips/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(session.accessToken),
      })
      const payload = (await response.json()) as ApiResponse<BlockedIpResponse>
      const success = payload.isSuccess ?? payload.success ?? response.ok
      if (!success) {
        throw new Error(payload.message ?? 'Engel kaldırılamadı.')
      }
      toast.success(payload.message ?? 'Engel kaldırıldı.')
      setBlockedIps(payload.data?.blockedIps ?? [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Engel kaldırılamadı.'
      toast.error(message)
    } finally {
      setRemovingBlocked(null)
    }
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <div className="dashboard__hero-text">
            <h1>IP Erişim Kontrolü</h1>
            <p>Yükleniyor...</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Güvenlik</p>
          <h1>IP Erişim Kontrolü</h1>
          <p>Admin paneline erişebilecek IP adreslerini tanımlayın ve global olarak engellenen IP listesini yönetin.</p>
        </div>
        <div className="dashboard__hero-actions">
          <button type="button" className="btn btn-secondary" onClick={() => void initialize()}>
            <FaSyncAlt /> Yenile
          </button>
        </div>
      </section>

      <section className="dashboard-card ip-access">
        <div className="ip-access__grid">
          <div className="ip-access__card">
            <div className="ip-access__card-header">
              <div>
                <h2><FaShieldAlt /> Admin Erişim Listesi</h2>
                <p>Admin paneline erişebilecek IP adreslerini ekleyin.</p>
              </div>
              <span className="ip-access__count">{allowedIps.length}</span>
            </div>

            <form className="ip-access__form" onSubmit={handleAddAllowedIp}>
              <div className="ip-access__form-row">
                <input
                  type="text"
                  placeholder="Örn. 5.176.87.92 veya 10.10.0.0/16"
                  value={allowedForm.ip}
                  onChange={(e) => setAllowedForm((prev) => ({ ...prev, ip: e.target.value }))}
                  disabled={isSavingAllowed}
                />
                <input
                  type="text"
                  placeholder="Açıklama (opsiyonel)"
                  value={allowedForm.description}
                  onChange={(e) => setAllowedForm((prev) => ({ ...prev, description: e.target.value }))}
                  disabled={isSavingAllowed}
                />
                <button type="submit" className="btn btn-primary" disabled={isSavingAllowed}>
                  {isSavingAllowed ? <FaSpinner className="btn-icon btn-icon--spinning" /> : <FaPlus />}
                  Ekle
                </button>
              </div>
            </form>

            {allowedIps.length === 0 ? (
              <div className="ip-access__empty">Henüz izin verilen IP adresi bulunmuyor.</div>
            ) : (
              <div className="ip-access__chip-list">
                {allowedIps.map((ip) => (
                  <div key={ip} className="ip-access__chip">
                    <span>{ip}</span>
                    <button
                      type="button"
                      onClick={() => void handleRemoveAllowedIp(ip)}
                      disabled={removingAllowed === ip}
                    >
                      {removingAllowed === ip ? <FaSpinner className="btn-icon btn-icon--spinning" /> : <FaTrash />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ip-access__card">
            <div className="ip-access__card-header">
              <div>
                <h2><FaBan /> Global Engellenen IP'ler</h2>
                <p>Tüm sisteme erişimi engellenen IP adresleri.</p>
              </div>
              <span className="ip-access__count">{blockedIps.length}</span>
            </div>

            <form className="ip-access__form" onSubmit={handleAddBlockedIp}>
              <div className="ip-access__form-row">
                <input
                  type="text"
                  placeholder="Örn. 203.0.113.10 veya 45.92.0.0/12"
                  value={blockedForm.ip}
                  onChange={(e) => setBlockedForm((prev) => ({ ...prev, ip: e.target.value }))}
                  disabled={isSavingBlocked}
                />
                <input
                  type="text"
                  placeholder="Engel nedeni (opsiyonel)"
                  value={blockedForm.reason}
                  onChange={(e) => setBlockedForm((prev) => ({ ...prev, reason: e.target.value }))}
                  disabled={isSavingBlocked}
                />
                <button type="submit" className="btn btn-danger" disabled={isSavingBlocked}>
                  {isSavingBlocked ? <FaSpinner className="btn-icon btn-icon--spinning" /> : <FaPlus />}
                  Engelle
                </button>
              </div>
            </form>

            {blockedIps.length === 0 ? (
              <div className="ip-access__empty">Engellenmiş IP adresi bulunmuyor.</div>
            ) : (
              <div className="ip-access__table-wrapper">
                <table className="ip-access__table">
                  <thead>
                    <tr>
                      <th>IP Adresi</th>
                      <th>Not</th>
                      <th>Eklenme</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {blockedIps.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.ipAddress}</td>
                        <td>{entry.reason || '-'}</td>
                        <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('tr-TR') : '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => void handleRemoveBlockedIp(entry.id)}
                            disabled={removingBlocked === entry.id}
                          >
                            {removingBlocked === entry.id ? (
                              <FaSpinner className="btn-icon btn-icon--spinning" />
                            ) : (
                              <FaTrash />
                            )}
                            Kaldır
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        .ip-access__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 24px;
        }

        .ip-access__card {
          border: 2px solid #000;
          border-radius: 18px;
          padding: 24px;
          background: #fff;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ip-access__card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .ip-access__card-header h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
          margin: 0;
        }

        .ip-access__card-header p {
          margin: 4px 0 0;
          color: #555;
        }

        .ip-access__count {
          min-width: 48px;
          min-height: 48px;
          border-radius: 12px;
          border: 2px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
        }

        .ip-access__form-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
        }

        .ip-access__form-row input {
          border: 2px solid #000;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
        }

        .ip-access__chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ip-access__chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 2px solid #000;
          border-radius: 999px;
          background: #f4f4f4;
        }

        .ip-access__chip button {
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .ip-access__empty {
          padding: 30px;
          border: 2px dashed #000;
          border-radius: 12px;
          text-align: center;
          color: #666;
        }

        .ip-access__table-wrapper {
          max-height: 420px;
          overflow: auto;
        }

        .ip-access__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .ip-access__table th,
        .ip-access__table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          text-align: left;
        }

        .ip-access__table th {
          font-weight: 600;
          background: #fafafa;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 2px solid #000;
          border-radius: 8px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-primary {
          background: #000;
          color: #fff;
        }

        .btn-secondary {
          background: #fff;
          color: #000;
        }

        .btn-danger {
          border-color: #dc2626;
          color: #dc2626;
          background: #fff;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon--spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .ip-access__form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}

export default IpAccessControlPage


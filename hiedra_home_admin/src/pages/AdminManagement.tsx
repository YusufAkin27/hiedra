import { useEffect, useState } from 'react'
import { FaUserShield, FaPlus, FaTrash, FaEnvelope, FaCheckCircle, FaTimesCircle, FaSpinner, FaUserCheck, FaExclamationTriangle } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { getAdminHeaders } from '../services/authService'
import { useToast } from '../components/Toast'

type AdminManagementPageProps = {
  session: AuthResponse
}

type Admin = {
  id: number
  email: string
  fullName?: string | null
  phone?: string | null
  emailVerified: boolean
  active: boolean
  lastLoginAt?: string | null
  createdAt: string
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function AdminManagementPage({ session }: AdminManagementPageProps) {
  const toast = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendingCodeTo, setSendingCodeTo] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [newAdmin, setNewAdmin] = useState({
    email: '',
    fullName: '',
    phone: '',
  })

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBaseUrl}/admin/admins`, {
        headers: getAdminHeaders(session.accessToken),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Admin[]
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Adminler yüklenemedi.')
      }

      setAdmins(payload.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(errorMessage)
      console.error('Admin yükleme hatası:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null) // Önceki hataları temizle

    if (!newAdmin.email.trim()) {
      const errorMsg = 'Email adresi zorunludur.'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/admins`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify({
          email: newAdmin.email.trim(),
          fullName: newAdmin.fullName.trim() || null,
          phone: newAdmin.phone.trim() || null,
        }),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Admin
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        const errorMsg = payload.message ?? 'Admin oluşturulamadı.'
        setError(errorMsg)
        toast.error(errorMsg)
        console.error('Admin oluşturma hatası:', payload)
        return
      }

      toast.success('Admin başarıyla oluşturuldu.')
      setError(null)
      setShowAddForm(false)
      setNewAdmin({ email: '', fullName: '', phone: '' })
      fetchAdmins()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Admin oluşturma hatası:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendCode = async (adminId: number) => {
    setSendingCodeTo(adminId)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/admins/${adminId}/send-code`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Doğrulama kodu gönderilemedi.')
      }

      toast.success('Doğrulama kodu başarıyla gönderildi.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(errorMessage)
      console.error('Kod gönderme hatası:', err)
    } finally {
      setSendingCodeTo(null)
    }
  }

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm('Bu admini silmek istediğinizden emin misiniz?')) {
      return
    }

    setDeletingId(adminId)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(session.accessToken),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Admin silinemedi.')
      }

      toast.success('Admin başarıyla silindi.')
      fetchAdmins()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(errorMessage)
      console.error('Admin silme hatası:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (adminId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/admins/${adminId}/status`, {
        method: 'PUT',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify({ active: !currentStatus }),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Admin durumu güncellenemedi.')
      }

      toast.success(`Admin ${!currentStatus ? 'aktif' : 'pasif'} edildi.`)
      fetchAdmins()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(errorMessage)
      console.error('Admin durumu güncelleme hatası:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: '#000000' }}>
          <FaSpinner className="spinner" />
          <span style={{ marginLeft: '10px' }}>Yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header__title">
          <FaUserShield className="page-header__icon" />
          <h1>Admin Yönetimi</h1>
        </div>
        <p className="page-header__description">
          Sistem yöneticilerini yönetin, yeni admin ekleyin veya mevcut adminleri silin. Yeni adminler direkt aktif ve doğrulanmış olarak oluşturulur.
        </p>
      </div>

      <div className="admin-management-container">
        <div className="admin-management-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowAddForm(!showAddForm)
              setError(null)
            }}
          >
            <FaPlus /> {showAddForm ? 'Formu Kapat' : 'Yeni Admin Ekle'}
          </button>
        </div>

        {showAddForm && (
          <div className="admin-form-card">
            <h3>Yeni Admin Ekle</h3>
            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="admin@example.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fullName" className="form-label">Ad Soyad</label>
                <input
                  type="text"
                  id="fullName"
                  className="form-input"
                  value={newAdmin.fullName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                  placeholder="Ad Soyad (Opsiyonel)"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">Telefon</label>
                <input
                  type="text"
                  id="phone"
                  className="form-input"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                  placeholder="Telefon (Opsiyonel)"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="form-error">
                  <FaExclamationTriangle className="form-error__icon" />
                  <span className="form-error__message">{error}</span>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewAdmin({ email: '', fullName: '', phone: '' })
                    setError(null)
                  }}
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="btn-icon btn-icon--spinning" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <FaPlus /> Admin Ekle
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="admin-list">
          <h3>Mevcut Adminler ({admins.length})</h3>
          {admins.length === 0 ? (
            <div className="empty-state">
              <FaUserShield />
              <p>Henüz admin bulunmuyor.</p>
            </div>
          ) : (
            <div className="admin-grid">
              {admins.map((admin) => (
                <div key={admin.id} className="admin-card">
                  <div className="admin-card__header">
                    <div className="admin-card__avatar">
                      {admin.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-card__info">
                      <h4>{admin.fullName || admin.email}</h4>
                      <p className="admin-card__email">{admin.email}</p>
                      {admin.phone && <p className="admin-card__phone">{admin.phone}</p>}
                    </div>
                  </div>

                  <div className="admin-card__status">
                    <div className="status-item">
                      <span className="status-label">Email Doğrulama:</span>
                      {admin.emailVerified ? (
                        <span className="status-badge status-badge--success">
                          <FaCheckCircle /> Doğrulanmış
                        </span>
                      ) : (
                        <span className="status-badge status-badge--warning">
                          <FaTimesCircle /> Doğrulanmamış
                        </span>
                      )}
                    </div>
                    <div className="status-item">
                      <span className="status-label">Durum:</span>
                      {admin.active ? (
                        <span className="status-badge status-badge--success">
                          <FaCheckCircle /> Aktif
                        </span>
                      ) : (
                        <span className="status-badge status-badge--error">
                          <FaTimesCircle /> Pasif
                        </span>
                      )}
                    </div>
                  </div>

                  {admin.lastLoginAt && (
                    <div className="admin-card__meta">
                      <small>Son Giriş: {new Date(admin.lastLoginAt).toLocaleString('tr-TR')}</small>
                    </div>
                  )}

                  <div className="admin-card__actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleSendCode(admin.id)}
                      disabled={sendingCodeTo === admin.id}
                      title="Doğrulama Kodu Gönder"
                    >
                      {sendingCodeTo === admin.id ? (
                        <FaSpinner className="btn-icon btn-icon--spinning" />
                      ) : (
                        <FaEnvelope />
                      )}
                      Kod Gönder
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleToggleStatus(admin.id, admin.active)}
                      title={admin.active ? 'Pasif Et' : 'Aktif Et'}
                    >
                      <FaUserCheck />
                      {admin.active ? 'Pasif Et' : 'Aktif Et'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteAdmin(admin.id)}
                      disabled={deletingId === admin.id}
                      title="Admin Sil"
                    >
                      {deletingId === admin.id ? (
                        <FaSpinner className="btn-icon btn-icon--spinning" />
                      ) : (
                        <FaTrash />
                      )}
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .page-container {
          min-height: 100vh;
          background: #ffffff;
          padding: 30px 20px;
        }

        .page-header {
          max-width: 1200px;
          margin: 0 auto 30px;
          padding: 30px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 2px solid #000000;
          color: #000000;
        }

        .page-header__title {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 12px;
        }

        .page-header__icon {
          font-size: 32px;
          color: #000000;
          opacity: 0.95;
        }

        .page-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #000000;
        }

        .page-header__description {
          margin: 0;
          font-size: 16px;
          color: #333333;
          line-height: 1.6;
        }

        .admin-management-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .admin-management-actions {
          margin-bottom: 20px;
        }

        .admin-form-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 2px solid #000000;
        }

        .admin-form-card h3 {
          margin: 0 0 25px 0;
          color: #000000;
          font-size: 22px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-form-card h3::before {
          content: '';
          width: 4px;
          height: 24px;
          background: #000000;
          border-radius: 2px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #000000;
          font-size: 14px;
        }

        .required {
          color: #ff0000;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #000000;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s;
          background: #ffffff;
          color: #000000;
        }

        .form-input:focus {
          outline: none;
          border-color: #000000;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
          background: #ffffff;
        }

        .form-input::placeholder {
          color: #999;
        }

        .form-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #fff5f5;
          border: 2px solid #ff0000;
          border-radius: 8px;
          margin: 20px 0;
          color: #ff0000;
        }

        .form-error__icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .form-error__message {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .admin-list h3 {
          margin: 0 0 20px 0;
          color: #000000;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666666;
          background: #ffffff;
          border-radius: 16px;
          border: 2px dashed #000000;
        }

        .empty-state svg {
          font-size: 48px;
          margin-bottom: 15px;
          opacity: 0.6;
          color: #000000;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .admin-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 2px solid #000000;
          transition: all 0.3s ease;
        }

        .admin-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
          border-color: #000000;
        }

        .admin-card__header {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .admin-card__avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #000000;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          flex-shrink: 0;
          border: 2px solid #000000;
        }

        .admin-card__info {
          flex: 1;
          min-width: 0;
        }

        .admin-card__info h4 {
          margin: 0 0 5px 0;
          color: #000000;
          font-size: 16px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-card__email {
          margin: 0;
          color: #666666;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-card__phone {
          margin: 5px 0 0 0;
          color: #666666;
          font-size: 13px;
        }

        .admin-card__status {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 12px;
          border: 2px solid #000000;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-label {
          font-size: 13px;
          color: #666666;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge--success {
          background: #f0fdf4;
          color: #16a34a;
          border: 2px solid #16a34a;
        }

        .status-badge--warning {
          background: #fffbeb;
          color: #d97706;
          border: 2px solid #d97706;
        }

        .status-badge--error {
          background: #fef2f2;
          color: #dc2626;
          border: 2px solid #dc2626;
        }

        .admin-card__meta {
          margin-bottom: 15px;
          padding-top: 15px;
          border-top: 2px solid #000000;
        }

        .admin-card__meta small {
          color: #666666;
          font-size: 12px;
        }

        .admin-card__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-primary {
          background: #000000;
          color: #ffffff;
          border: 2px solid #000000;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          background: #333333;
          border-color: #333333;
        }

        .btn-secondary {
          background: transparent;
          color: #000000;
          border: 2px solid #000000;
          font-weight: 600;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #000000;
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .btn-danger {
          background: transparent;
          color: #ff0000;
          border: 2px solid #ff0000;
        }

        .btn-danger:hover:not(:disabled) {
          background: #ff0000;
          color: #ffffff;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 14px;
        }

        .btn-icon--spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner {
          animation: spin 1s linear infinite;
          font-size: 24px;
          color: #000000;
        }

        @media (max-width: 768px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }

          .admin-management-container {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  )
}

export default AdminManagementPage


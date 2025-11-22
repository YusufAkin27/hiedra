import { useEffect, useState, type FormEvent } from 'react'
import { FaPlus, FaEdit, FaTrash, FaEye, FaTimes, FaHistory } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type ContractsPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
  onNavigateToAcceptances?: (contractId: number) => void
}

type Contract = {
  id: number
  type: 'SATIS' | 'GIZLILIK' | 'KULLANIM' | 'KVKK' | 'IADE' | 'KARGO'
  title: string
  content: string
  version: number
  active: boolean
  requiredApproval: boolean
  createdAt: string
  updatedAt: string
  acceptances?: ContractAcceptance[]
}

type ContractAcceptance = {
  id: number
  status: 'ACCEPTED' | 'REJECTED'
  acceptedVersion: number
  acceptedAt: string
  user?: {
    id: number
    email: string
    fullName?: string
  }
  guestUserId?: string
  ipAddress?: string
  userAgent?: string
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SATIS: 'Satış Sözleşmesi',
  GIZLILIK: 'Gizlilik Politikası',
  KULLANIM: 'Kullanım Koşulları',
  KVKK: 'KVKK Aydınlatma Metni',
  IADE: 'İade ve Değişim Koşulları',
  KARGO: 'Kargo ve Teslimat Koşulları',
}

function ContractsPage({ session, toast, onNavigateToAcceptances }: ContractsPageProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; contractId: number | null; contractTitle: string }>({
    isOpen: false,
    contractId: null,
    contractTitle: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showContentModal, setShowContentModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('')

  const [formData, setFormData] = useState({
    type: 'KVKK' as Contract['type'],
    title: '',
    content: '',
    requiredApproval: true,
    active: true,
  })

  useEffect(() => {
    fetchContracts()
  }, [session.accessToken])

  const fetchContracts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBaseUrl}/admin/contracts`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Sözleşmeler yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Contract[]
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setContracts(payload.data)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sözleşmeler yüklenirken bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${apiBaseUrl}/admin/contracts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          content: formData.content,
          requiredApproval: formData.requiredApproval,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Sözleşme oluşturulamadı.')
      }

      toast.success('Sözleşme başarıyla oluşturuldu!')
      setShowCreateForm(false)
      resetForm()
      fetchContracts()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sözleşme oluşturulurken bir hata oluştu.'
      toast.error(message)
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingContract) return

    try {
      const response = await fetch(`${apiBaseUrl}/admin/contracts/${editingContract.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          active: formData.active,
          requiredApproval: formData.requiredApproval,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Sözleşme güncellenemedi.')
      }

      toast.success('Sözleşme başarıyla güncellendi!')
      setEditingContract(null)
      resetForm()
      fetchContracts()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sözleşme güncellenirken bir hata oluştu.'
      toast.error(message)
    }
  }

  const handleDeleteClick = (id: number) => {
    const contract = contracts.find((c) => c.id === id)
    const contractTitle = contract?.title || 'Bu sözleşme'
    setDeleteModal({ isOpen: true, contractId: id, contractTitle })
  }

  const handleDelete = async () => {
    if (!deleteModal.contractId) {
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/contracts/${deleteModal.contractId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Sözleşme silinemedi.')
      }

      toast.success('Sözleşme başarıyla silindi!')
      setDeleteModal({ isOpen: false, contractId: null, contractTitle: '' })
      fetchContracts()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sözleşme silinirken bir hata oluştu.'
      toast.error(message)
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'KVKK',
      title: '',
      content: '',
      requiredApproval: true,
      active: true,
    })
  }

  const startEdit = (contract: Contract) => {
    setEditingContract(contract)
    setFormData({
      type: contract.type,
      title: contract.title,
      content: contract.content,
      requiredApproval: contract.requiredApproval,
      active: contract.active,
    })
    setShowCreateForm(true)
  }

  const cancelEdit = () => {
    setEditingContract(null)
    setShowCreateForm(false)
    resetForm()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleShowAcceptances = (contract: Contract) => {
    if (onNavigateToAcceptances) {
      onNavigateToAcceptances(contract.id)
    }
  }

  // Filtreleme
  const filteredContracts = contracts.filter((contract) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (
        !contract.title.toLowerCase().includes(search) &&
        !contract.content.toLowerCase().includes(search) &&
        !CONTRACT_TYPE_LABELS[contract.type]?.toLowerCase().includes(search)
      ) {
        return false
      }
    }
    if (typeFilter && contract.type !== typeFilter) {
      return false
    }
    if (activeFilter === 'active' && !contract.active) {
      return false
    }
    if (activeFilter === 'inactive' && contract.active) {
      return false
    }
    return true
  })

  // İstatistikler
  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.active).length,
    inactive: contracts.filter((c) => !c.active).length,
    byType: Object.keys(CONTRACT_TYPE_LABELS).map((type) => ({
      type,
      label: CONTRACT_TYPE_LABELS[type],
      count: contracts.filter((c) => c.type === type).length,
    })),
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <p>Yükleniyor...</p>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Sözleşme Yönetimi</p>
          <h1>Sözleşmeler</h1>
          <p>Tüm sözleşmeleri görüntüleyin, oluşturun ve yönetin.</p>
        </div>
        <div className="dashboard__hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowCreateForm(true)
              setEditingContract(null)
              resetForm()
            }}
          >
            <FaPlus style={{ marginRight: '0.5rem' }} /> Yeni Sözleşme Oluştur
          </button>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3>Genel İstatistikler</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f0f4f8', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{stats.total}</div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Toplam Sözleşme</div>
            </div>
            <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>{stats.active}</div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Aktif</div>
            </div>
            <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>{stats.inactive}</div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Pasif</div>
            </div>
          </div>
        </article>
      </section>

      {/* İçerik Görüntüleme Modal */}
      {showContentModal && selectedContract && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => {
            setShowContentModal(false)
            setSelectedContract(null)
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>{selectedContract.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowContentModal(false)
                  setSelectedContract(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div
              style={{
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '8px',
                whiteSpace: 'pre-wrap',
                maxHeight: '60vh',
                overflow: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: selectedContract.content }}
            />
          </div>
        </div>
      )}

      {/* Sözleşme Oluştur/Düzenle Formu */}
      {showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={cancelEdit}
        >
          <div
            style={{
              background: 'white',
              padding: '2.5rem',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>{editingContract ? 'Sözleşme Düzenle' : 'Yeni Sözleşme Oluştur'}</h2>
              <button
                type="button"
                onClick={cancelEdit}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={editingContract ? handleUpdate : handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!editingContract && (
                  <div>
                    <label htmlFor="type" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Sözleşme Türü *
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Contract['type'] })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                    >
                      {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Başlık *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                    }}
                    placeholder="Sözleşme başlığı"
                  />
                </div>

                <div>
                  <label htmlFor="content" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    İçerik * (HTML desteklenir)
                  </label>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={15}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      resize: 'vertical',
                      fontFamily: 'monospace',
                    }}
                    placeholder="Sözleşme içeriği..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>Aktif</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.requiredApproval}
                      onChange={(e) => setFormData({ ...formData, requiredApproval: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>Zorunlu Onay</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ minWidth: '100px' }}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }}>
                  {editingContract ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Sözleşme ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            >
              <option value="">Tüm Türler</option>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>

          {contracts.length === 0 ? (
            <p className="dashboard-card__empty">Henüz sözleşme bulunmuyor.</p>
          ) : filteredContracts.length === 0 ? (
            <p className="dashboard-card__empty">Arama kriterlerinize uygun sözleşme bulunamadı.</p>
          ) : (
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tür</th>
                    <th>Başlık</th>
                    <th>Versiyon</th>
                    <th>Durum</th>
                    <th>Güncellenme</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>#{contract.id}</td>
                      <td>
                        <span className="dashboard-card__chip">{CONTRACT_TYPE_LABELS[contract.type]}</span>
                      </td>
                      <td>
                        <strong>{contract.title}</strong>
                      </td>
                      <td>v{contract.version}</td>
                      <td>
                        {contract.active ? (
                          <span className="dashboard-card__chip dashboard-card__chip--success">Aktif</span>
                        ) : (
                          <span className="dashboard-card__chip dashboard-card__chip--error">Pasif</span>
                        )}
                      </td>
                      <td>{formatDate(contract.updatedAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContract(contract)
                              setShowContentModal(true)
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                          >
                            <FaEye style={{ marginRight: '0.25rem' }} /> Görüntüle
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Contracts sayfasından ayrı bir sayfaya yönlendirme yapılacak
                              // Bu buton Contracts.tsx'te kalacak ama yeni sayfaya yönlendirecek
                              handleShowAcceptances(contract)
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                          >
                            <FaHistory style={{ marginRight: '0.25rem' }} /> Onay Geçmişi
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(contract)}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                          >
                            <FaEdit style={{ marginRight: '0.25rem' }} /> Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(contract.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                          >
                            <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        message={`${deleteModal.contractTitle} adlı sözleşmeyi silmek istediğinizden emin misiniz?`}
        type="confirm"
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, contractId: null, contractTitle: '' })}
      />
    </main>
  )
}

export default ContractsPage


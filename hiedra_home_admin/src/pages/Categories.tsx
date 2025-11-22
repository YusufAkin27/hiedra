import { useEffect, useState, type FormEvent } from 'react'
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type CategoriesPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
}

type Category = {
  id: number
  name: string
  description?: string
  products?: Array<{ id: number; name: string }>
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function CategoriesPage({ session, toast }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; categoryId: number | null; categoryName: string }>({
    isOpen: false,
    categoryId: null,
    categoryName: '',
  })

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    fetchCategories()
  }, [session.accessToken])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBaseUrl}/admin/categories`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Kategoriler yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Category[]
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setCategories(payload.data)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kategoriler yüklenirken bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${apiBaseUrl}/admin/categories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Kategori oluşturulamadı.')
      }

      toast.success('Kategori başarıyla oluşturuldu!')
      setShowCreateForm(false)
      resetForm()
      fetchCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kategori oluşturulurken bir hata oluştu.'
      toast.error(message)
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return

    try {
      const response = await fetch(`${apiBaseUrl}/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Kategori güncellenemedi.')
      }

      toast.success('Kategori başarıyla güncellendi!')
      setEditingCategory(null)
      resetForm()
      fetchCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kategori güncellenirken bir hata oluştu.'
      toast.error(message)
    }
  }

  const handleDeleteClick = (id: number) => {
    const category = categories.find((c) => c.id === id)
    const categoryName = category?.name || 'Bu kategori'
    setDeleteModal({ isOpen: true, categoryId: id, categoryName })
  }

  const handleDelete = async () => {
    if (!deleteModal.categoryId) {
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/categories/${deleteModal.categoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Kategori silinemedi.')
      }

      toast.success('Kategori başarıyla silindi!')
      setDeleteModal({ isOpen: false, categoryId: null, categoryName: '' })
      fetchCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kategori silinirken bir hata oluştu.'
      toast.error(message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    })
  }

  const startEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
    })
    setShowCreateForm(true)
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setShowCreateForm(false)
    resetForm()
  }

  // Filtreleme
  const filteredCategories = categories.filter((category) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        category.name.toLowerCase().includes(search) ||
        (category.description && category.description.toLowerCase().includes(search))
      )
    }
    return true
  })

  // İstatistikler
  const stats = {
    total: categories.length,
    withProducts: categories.filter((c) => c.products && c.products.length > 0).length,
    withoutProducts: categories.filter((c) => !c.products || c.products.length === 0).length,
    totalProducts: categories.reduce((sum, c) => sum + (c.products?.length || 0), 0),
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
          <p className="dashboard__eyebrow">Kategori Yönetimi</p>
          <h1>Kategoriler</h1>
          <p>Tüm kategorileri görüntüleyin, oluşturun ve yönetin.</p>
        </div>
        <div className="dashboard__hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowCreateForm(true)
              setEditingCategory(null)
              resetForm()
            }}
          >
            <FaPlus style={{ marginRight: '0.5rem' }} /> Yeni Kategori Oluştur
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
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Toplam Kategori</div>
            </div>
            <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>{stats.withProducts}</div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Ürünlü Kategori</div>
            </div>
            <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>{stats.withoutProducts}</div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Boş Kategori</div>
            </div>
            <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196f3' }}>{stats.totalProducts}</div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Toplam Ürün</div>
            </div>
          </div>
        </article>
      </section>

      {/* Kategori Oluştur/Düzenle Formu */}
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
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>{editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Oluştur'}</h2>
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

            <form onSubmit={editingCategory ? handleUpdate : handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Kategori Adı *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                    }}
                    placeholder="Kategori adı"
                  />
                </div>

                <div>
                  <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Açıklama
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      resize: 'vertical',
                    }}
                    placeholder="Kategori açıklaması (opsiyonel)"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ minWidth: '100px' }}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }}>
                  {editingCategory ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Arama */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Kategori ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
          </div>

          {categories.length === 0 ? (
            <p className="dashboard-card__empty">Henüz kategori bulunmuyor.</p>
          ) : filteredCategories.length === 0 ? (
            <p className="dashboard-card__empty">Arama kriterlerinize uygun kategori bulunamadı.</p>
          ) : (
            <div className="dashboard-card__table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Kategori Adı</th>
                    <th>Açıklama</th>
                    <th>Ürün Sayısı</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id}>
                      <td>#{category.id}</td>
                      <td>
                        <strong>{category.name}</strong>
                      </td>
                      <td>{category.description || '-'}</td>
                      <td>
                        <span className="dashboard-card__chip">
                          {category.products?.length || 0} ürün
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                          >
                            <FaEdit style={{ marginRight: '0.25rem' }} /> Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(category.id)}
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
        message={`${deleteModal.categoryName} adlı kategoriyi silmek istediğinizden emin misiniz? Bu kategoriye bağlı ürünler varsa silme işlemi başarısız olacaktır.`}
        type="confirm"
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, categoryId: null, categoryName: '' })}
      />
    </main>
  )
}

export default CategoriesPage


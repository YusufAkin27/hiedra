import { useEffect, useState, useMemo, useRef, type FormEvent } from 'react'
import { FaPlus, FaEdit, FaTrash, FaEye, FaBox, FaCheckCircle, FaExclamationTriangle, FaDollarSign, FaChartBar, FaClipboard, FaTable, FaStar } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type ProductsPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
  onViewProduct: (id: number) => void
  onEditProduct: (id: number) => void
  onAddProduct: () => void
}

type Product = {
  id: number
  name: string
  price: number
  quantity: number
  description?: string
  width?: number
  height?: number
  pleatType?: string
  coverImageUrl?: string
  detailImageUrl?: string
  category?: {
    id: number
    name: string
  }
  reviewCount?: number
  averageRating?: number
  viewCount?: number
  mountingType?: string
  material?: string
  lightTransmittance?: string
  pieceCount?: number
  color?: string
  usageArea?: string
}

type Category = {
  id: number
  name: string
  description?: string
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function ProductsPage({ session, toast, onViewProduct, onEditProduct, onAddProduct }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: number | null; productName: string }>({
    isOpen: false,
    productId: null,
    productName: '',
  })
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [stockFilter, setStockFilter] = useState<string>('') // 'all', 'inStock', 'outOfStock'
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Debounce search query - performans için
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1)
    }, 300) // 300ms debounce
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery])

  // Category form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (session?.accessToken) {
      fetchProducts()
      fetchCategories()
    } else {
      console.error('Access token bulunamadı!')
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
    }
  }, [session.accessToken])

  const fetchProducts = async () => {
    try {
      if (!session?.accessToken) {
        throw new Error('Access token bulunamadı!')
      }
      
      setIsLoading(true)

      const response = await fetch(`${apiBaseUrl}/admin/products`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Ürünler yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Product[]
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Ürünler yüklenemedi.')
      }

      setProducts(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      if (!session?.accessToken) {
        console.error('Access token bulunamadı!')
        return
      }
      
      const response = await fetch(`${apiBaseUrl}/admin/categories`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Category[]
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setCategories(payload.data)
        }
      }
    } catch (err) {
      console.error('Kategoriler yüklenemedi:', err)
    }
  }

  const handleDeleteClick = (id: number) => {
    const product = products.find((p) => p.id === id)
    const productName = product?.name || 'Bu ürün'
    setDeleteModal({ isOpen: true, productId: id, productName })
  }

  const handleDeleteProduct = async () => {
    if (!deleteModal.productId || !session?.accessToken) {
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      setDeleteModal({ isOpen: false, productId: null, productName: '' })
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/products/${deleteModal.productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        await fetchProducts()
        toast.success('Ürün başarıyla silindi.')
        setDeleteModal({ isOpen: false, productId: null, productName: '' })
      } else {
        const payload = (await response.json()) as { message?: string }
        throw new Error(payload.message ?? 'Ürün silinemedi.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ürün silinemedi.'
      toast.error(message)
    }
  }

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!session?.accessToken) {
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }
    
    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/categories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!response.ok || !success) {
        throw new Error(payload.message ?? 'Kategori oluşturulamadı.')
      }

      await fetchCategories()
      setShowCategoryForm(false)
      setCategoryForm({ name: '', description: '' })
      toast.success('Kategori başarıyla oluşturuldu.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kategori oluşturulamadı.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }



  // Filtered products
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Search filter - debounced query kullan
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.name.toLowerCase().includes(query) ||
          product.id.toString().includes(query) ||
          product.price.toString().includes(query)
      )
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((product) => product.category?.id.toString() === categoryFilter)
    }

    // Stock filter
    if (stockFilter === 'inStock') {
      filtered = filtered.filter((product) => (product.quantity ?? 0) > 0)
    } else if (stockFilter === 'outOfStock') {
      filtered = filtered.filter((product) => (product.quantity ?? 0) === 0)
    }

    return filtered
  }, [products, debouncedSearchQuery, categoryFilter, stockFilter])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: products.length,
    inStock: products.filter((p) => (p.quantity ?? 0) > 0).length,
    outOfStock: products.filter((p) => (p.quantity ?? 0) === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * (p.quantity ?? 0)), 0),
    averagePrice: products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0,
    totalViews: products.reduce((sum, p) => sum + (p.viewCount ?? 0), 0),
    totalReviews: products.reduce((sum, p) => sum + (p.reviewCount ?? 0), 0),
    categories: categories.length,
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
          <p className="dashboard__eyebrow">Ürün Yönetimi</p>
          <h1>Ürünler</h1>
          <p>Tüm ürünleri görüntüleyin, ekleyin ve yönetin.</p>
        </div>
        <div className="dashboard__hero-actions products-hero-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowCategoryForm(true)
            }}
          >
            📁 Kategori Ekle
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onAddProduct()
            }}
          >
            <FaPlus style={{ marginRight: '0.5rem' }} /> Ürün Ekle
          </button>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid products-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="products-stats__title">Genel İstatistikler</h3>
          <div className="products-stats__grid">
            <div className="products-stat-card products-stat-card--primary">
              <div className="products-stat-card__icon"><FaBox /></div>
              <div className="products-stat-card__value">{stats.total}</div>
              <div className="products-stat-card__label">Toplam Ürün</div>
              <div className="products-stat-card__subtitle">Tüm ürünler</div>
            </div>
            <div className="products-stat-card products-stat-card--success">
              <div className="products-stat-card__icon"><FaCheckCircle /></div>
              <div className="products-stat-card__value">{stats.inStock}</div>
              <div className="products-stat-card__label">Stokta Var</div>
              <div className="products-stat-card__subtitle">Mevcut stok</div>
            </div>
            <div className="products-stat-card products-stat-card--warning">
              <div className="products-stat-card__icon"><FaExclamationTriangle /></div>
              <div className="products-stat-card__value">{stats.outOfStock}</div>
              <div className="products-stat-card__label">Stokta Yok</div>
              <div className="products-stat-card__subtitle">Tükendi</div>
            </div>
            <div className="products-stat-card products-stat-card--info">
              <div className="products-stat-card__icon"><FaDollarSign /></div>
              <div className="products-stat-card__value">{stats.totalValue.toFixed(2)} ₺</div>
              <div className="products-stat-card__label">Toplam Değer</div>
              <div className="products-stat-card__subtitle">Stok değeri</div>
            </div>
            <div className="products-stat-card products-stat-card--info">
              <div className="products-stat-card__icon"><FaChartBar /></div>
              <div className="products-stat-card__value">{stats.averagePrice.toFixed(2)} ₺</div>
              <div className="products-stat-card__label">Ortalama Fiyat</div>
              <div className="products-stat-card__subtitle">Ürün başına</div>
            </div>
            <div className="products-stat-card products-stat-card--success">
              <div className="products-stat-card__icon"><FaEye /></div>
              <div className="products-stat-card__value">{stats.totalViews}</div>
              <div className="products-stat-card__label">Toplam Görüntüleme</div>
              <div className="products-stat-card__subtitle">Tüm ürünler</div>
            </div>
            <div className="products-stat-card products-stat-card--info">
              <div className="products-stat-card__icon">💬</div>
              <div className="products-stat-card__value">{stats.totalReviews}</div>
              <div className="products-stat-card__label">Toplam Yorum</div>
              <div className="products-stat-card__subtitle">Tüm ürünler</div>
            </div>
            <div className="products-stat-card products-stat-card--primary">
              <div className="products-stat-card__icon">📁</div>
              <div className="products-stat-card__value">{stats.categories}</div>
              <div className="products-stat-card__label">Kategori</div>
              <div className="products-stat-card__subtitle">Toplam kategori</div>
            </div>
          </div>
        </article>
      </section>


      {/* Kategori Ekleme Modal */}
      {showCategoryForm && (
        <div
          className="product-modal-overlay"
          onClick={() => {
            setShowCategoryForm(false)
            setCategoryForm({ name: '', description: '' })
          }}
        >
          <div
            className="product-modal product-modal--category"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="product-modal__header">
              <h2 className="product-modal__title">Yeni Kategori</h2>
              <button
                type="button"
                className="product-modal__close"
                onClick={() => {
                  setShowCategoryForm(false)
                  setCategoryForm({ name: '', description: '' })
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="product-modal__form">
              <div className="product-modal__form-group">
                <label htmlFor="categoryName" className="product-modal__form-label">
                  Kategori Adı *
                </label>
                <input
                  id="categoryName"
                  type="text"
                  className="product-modal__form-input"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                  placeholder="Örn: Perde, Tül, Jaluzi"
                />
              </div>
              <div className="product-modal__form-group">
                <label htmlFor="categoryDescription" className="product-modal__form-label">
                  Açıklama
                </label>
                <textarea
                  id="categoryDescription"
                  className="product-modal__form-textarea"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={3}
                  placeholder="Kategori hakkında açıklama..."
                />
              </div>
              <div className="product-modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCategoryForm(false)
                    setCategoryForm({ name: '', description: '' })
                  }}
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Oluşturuluyor...' : '📁 Kategori Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="products-filters">
            <div className="products-filters__row">
              <div className="products-filters__search">
                <input
                  type="text"
                  className="products-filters__input"
                  placeholder="Ürün ara (ad, kategori, ID, fiyat...)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    // setCurrentPage debounce içinde yapılıyor
                  }}
                />
              </div>
              <div className="products-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary products-view-toggle products-view-toggle--desktop"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                >
                  {viewMode === 'table' ? <><FaTable style={{ marginRight: '0.5rem' }} /> Kart</> : <><FaClipboard style={{ marginRight: '0.5rem' }} /> Tablo</>}
                </button>
                {(searchQuery || categoryFilter || stockFilter) && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setSearchQuery('')
                      setCategoryFilter('')
                      setStockFilter('')
                      setCurrentPage(1)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
            <div className="products-filters__row">
              <div className="products-filters__select-group">
                <select
                  className="products-filters__select"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">📁 Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <select
                  className="products-filters__select"
                  value={stockFilter}
                  onChange={(e) => {
                    setStockFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">Stok Durumu</option>
                  <option value="inStock">Stokta Var</option>
                  <option value="outOfStock">Stokta Yok</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="products-header">
            <div className="products-header__info">
              <span className="products-header__count">
                Toplam: <strong>{filteredProducts.length}</strong> ürün
              </span>
              {filteredProducts.length !== products.length && (
                <span className="products-header__filtered">
                  (Filtrelenmiş: {filteredProducts.length} / {products.length})
                </span>
              )}
            </div>
            <div className="products-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {products.length === 0 ? (
            <p className="dashboard-card__empty">Henüz ürün bulunmuyor.</p>
          ) : filteredProducts.length === 0 ? (
            <p className="dashboard-card__empty">Arama kriterlerinize uygun ürün bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table products-table-desktop ${viewMode === 'table' ? '' : 'products-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Fotoğraf</th>
                      <th>ID</th>
                      <th>Ürün Adı</th>
                      <th>Kategori</th>
                      <th>Fiyat</th>
                      <th>Stok</th>
                      <th>Görüntülenme</th>
                      <th>Yorumlar</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          {product.coverImageUrl ? (
                            <img
                              src={product.coverImageUrl}
                              alt={product.name}
                              className="products-table__image"
                            />
                          ) : (
                            <div className="products-table__no-image">
                              📷
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="products-table__id">#{product.id}</div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="products-table__name-btn"
                            onClick={() => onViewProduct(product.id)}
                          >
                            {product.name}
                          </button>
                        </td>
                        <td>
                          <div className="products-table__category">{product.category?.name || '-'}</div>
                        </td>
                        <td>
                          <div className="products-table__price">{product.price.toFixed(2)} ₺</div>
                        </td>
                        <td>
                          <span
                            className={`dashboard-card__chip ${
                              product.quantity > 0
                                ? 'dashboard-card__chip--success'
                                : 'dashboard-card__chip--error'
                            }`}
                          >
                            {product.quantity}
                          </span>
                        </td>
                        <td>
                          <div className="products-table__views">
                            <FaEye style={{ marginRight: '0.25rem' }} /> {product.viewCount || 0}
                          </div>
                        </td>
                        <td>
                          <div className="products-table__reviews">
                            <div className="products-table__review-count">
                              💬 {product.reviewCount || 0}
                            </div>
                            {product.averageRating && product.averageRating > 0 && (
                              <div className="products-table__rating">
                                <FaStar style={{ marginRight: '0.25rem' }} /> {product.averageRating.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="products-table__actions">
                            <button
                              type="button"
                              className="products-table__btn products-table__btn--primary"
                              onClick={() => onEditProduct(product.id)}
                              title="Düzenle"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className="products-table__btn products-table__btn--danger"
                              onClick={() => handleDeleteClick(product.id)}
                              title="Sil"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`products-cards ${viewMode === 'cards' ? '' : 'products-cards--hidden'}`}>
                {paginatedProducts.map((product) => (
                  <div key={product.id} className="product-card">
                    <div className="product-card__image-section">
                      {product.coverImageUrl ? (
                        <img
                          src={product.coverImageUrl}
                          alt={product.name}
                          className="product-card__image"
                          loading="lazy"
                          decoding="async"
                          onClick={() => onViewProduct(product.id)}
                        />
                      ) : (
                        <div className="product-card__no-image" onClick={() => onViewProduct(product.id)}>
                          📷
                        </div>
                      )}
                      <div className="product-card__id">#{product.id}</div>
                    </div>
                    <div className="product-card__body">
                      <h3 className="product-card__name" onClick={() => onViewProduct(product.id)}>
                        {product.name}
                      </h3>
                      <div className="product-card__info">
                        <div className="product-card__info-row">
                          <div className="product-card__info-icon">📁</div>
                          <div className="product-card__info-content">
                            <div className="product-card__info-label">Kategori</div>
                            <div className="product-card__info-value">{product.category?.name || '-'}</div>
                          </div>
                        </div>
                        <div className="product-card__info-row">
                          <div className="product-card__info-icon"><FaDollarSign /></div>
                          <div className="product-card__info-content">
                            <div className="product-card__info-label">Fiyat</div>
                            <div className="product-card__info-value product-card__info-value--price">
                              {product.price.toFixed(2)} ₺
                            </div>
                          </div>
                        </div>
                        <div className="product-card__info-row">
                          <div className="product-card__info-icon"><FaBox /></div>
                          <div className="product-card__info-content">
                            <div className="product-card__info-label">Stok</div>
                            <div className="product-card__info-value">
                              <span
                                className={`dashboard-card__chip ${
                                  product.quantity > 0
                                    ? 'dashboard-card__chip--success'
                                    : 'dashboard-card__chip--error'
                                }`}
                              >
                                {product.quantity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="product-card__info-row">
                          <div className="product-card__info-icon"><FaEye /></div>
                          <div className="product-card__info-content">
                            <div className="product-card__info-label">Görüntülenme</div>
                            <div className="product-card__info-value">{product.viewCount || 0}</div>
                          </div>
                        </div>
                        {(product.reviewCount || 0) > 0 && (
                          <div className="product-card__info-row">
                            <div className="product-card__info-icon">💬</div>
                            <div className="product-card__info-content">
                              <div className="product-card__info-label">Yorumlar</div>
                              <div className="product-card__info-value">
                                {product.reviewCount || 0} yorum
                                {product.averageRating && product.averageRating > 0 && (
                                  <span className="product-card__rating"> <FaStar style={{ marginRight: '0.25rem' }} /> {product.averageRating.toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="product-card__actions">
                      <button
                        type="button"
                        className="product-card__btn product-card__btn--primary"
                        onClick={() => onEditProduct(product.id)}
                      >
                        <FaEdit style={{ marginRight: '0.25rem' }} /> Düzenle
                      </button>
                      <button
                        type="button"
                        className="product-card__btn product-card__btn--danger"
                        onClick={() => handleDeleteClick(product.id)}
                      >
                        <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="products-pagination">
                  <button
                    type="button"
                    className="products-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="products-pagination__btn"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Önceki
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={`products-pagination__btn products-pagination__btn--number ${
                          currentPage === pageNum ? 'products-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="products-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="products-pagination__btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Son
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </section>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        message={`${deleteModal.productName} adlı ürünü silmek istediğinize emin misiniz?`}
        type="confirm"
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeleteModal({ isOpen: false, productId: null, productName: '' })}
      />

    </main>
  )
}

export default ProductsPage

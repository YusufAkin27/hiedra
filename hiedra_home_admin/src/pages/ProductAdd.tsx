import { useState, useEffect, type FormEvent } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'

type ProductAddPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
  onBack: () => void
}

type Category = {
  id: number
  name: string
  description?: string
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function ProductAddPage({ session, toast, onBack }: ProductAddPageProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    quantity: '',
    categoryId: '',
    mountingType: '',
    material: '',
    lightTransmittance: '',
    pieceCount: '',
    color: '',
    usageArea: '',
  })
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [detailImage, setDetailImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [detailImagePreview, setDetailImagePreview] = useState<string | null>(null)
  
  // Zoom lens state
  const [zoomLensVisible, setZoomLensVisible] = useState(false)
  const [zoomLensPosition, setZoomLensPosition] = useState<{
    x: number
    y: number
    imageX?: number
    imageY?: number
    imageRect?: DOMRect
  }>({ x: 0, y: 0 })
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null)

  useEffect(() => {
    if (session?.accessToken) {
      fetchCategories()
    } else {
      console.error('Access token bulunamadı!')
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
    }
  }, [session.accessToken])

  const fetchCategories = async () => {
    try {
      if (!session?.accessToken) {
        throw new Error('Access token bulunamadı!')
      }
      
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
        categories?: Category[]
      }

      const success = payload.isSuccess ?? payload.success ?? false
      const categoriesData = payload.data ?? payload.categories ?? []

      if (!success) {
        throw new Error('Kategoriler yüklenemedi.')
      }

      setCategories(categoriesData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kategoriler yüklenemedi.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!session?.accessToken) {
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }
    
    setIsSubmitting(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('price', formData.price)
      if (formData.description) formDataToSend.append('description', formData.description)
      if (formData.quantity) formDataToSend.append('quantity', formData.quantity)
      if (formData.categoryId) formDataToSend.append('categoryId', formData.categoryId)
      if (formData.mountingType) formDataToSend.append('mountingType', formData.mountingType)
      if (formData.material) formDataToSend.append('material', formData.material)
      if (formData.lightTransmittance) formDataToSend.append('lightTransmittance', formData.lightTransmittance)
      if (formData.pieceCount) formDataToSend.append('pieceCount', formData.pieceCount)
      if (formData.color) formDataToSend.append('color', formData.color)
      if (formData.usageArea) formDataToSend.append('usageArea', formData.usageArea)
      if (coverImage) formDataToSend.append('coverImage', coverImage)
      if (detailImage) formDataToSend.append('detailImage', detailImage)

      const response = await fetch(`${apiBaseUrl}/admin/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: formDataToSend,
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!response.ok || !success) {
        throw new Error(payload.message ?? 'Ürün oluşturulamadı.')
      }

      toast.success('Ürün başarıyla oluşturuldu.')
      resetForm()
      // Başarılı olursa ürünler sayfasına dön
      setTimeout(() => {
        onBack()
      }, 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ürün oluşturulamadı.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      quantity: '',
      categoryId: '',
      mountingType: '',
      material: '',
      lightTransmittance: '',
      pieceCount: '',
      color: '',
      usageArea: '',
    })
    setCoverImage(null)
    setDetailImage(null)
    setCoverImagePreview(null)
    setDetailImagePreview(null)
    setZoomLensVisible(false)
    setPreviewColor(null)
    // Reset file inputs
    const coverInput = document.getElementById('coverImage') as HTMLInputElement
    const detailInput = document.getElementById('detailImage') as HTMLInputElement
    if (coverInput) coverInput.value = ''
    if (detailInput) detailInput.value = ''
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      // Dosya boyutu kontrolü (100MB limit)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        toast.error(`Dosya boyutu çok büyük. Maksimum boyut: 100MB. Seçilen dosya: ${formatFileSize(file.size)}`)
        e.target.value = ''
        return
      }
      
      // Dosya tipi kontrolü
      if (!file.type.startsWith('image/')) {
        toast.error('Lütfen geçerli bir resim dosyası seçin.')
        e.target.value = ''
        return
      }
      
      setCoverImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string)
      }
      reader.onerror = () => {
        toast.error('Fotoğraf yüklenirken bir hata oluştu.')
      }
      reader.readAsDataURL(file)
    } else {
      setCoverImage(null)
      setCoverImagePreview(null)
    }
  }

  const handleDetailImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      // Dosya boyutu kontrolü (100MB limit)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        toast.error(`Dosya boyutu çok büyük. Maksimum boyut: 100MB. Seçilen dosya: ${formatFileSize(file.size)}`)
        e.target.value = ''
        return
      }
      
      // Dosya tipi kontrolü
      if (!file.type.startsWith('image/')) {
        toast.error('Lütfen geçerli bir resim dosyası seçin.')
        e.target.value = ''
        return
      }
      
      setDetailImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setDetailImagePreview(reader.result as string)
      }
      reader.onerror = () => {
        toast.error('Fotoğraf yüklenirken bir hata oluştu.')
      }
      reader.readAsDataURL(file)
    } else {
      setDetailImage(null)
      setDetailImagePreview(null)
    }
  }

  const getColorAtPosition = (imageSrc: string, x: number, y: number, rect: DOMRect): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        ctx.drawImage(img, 0, 0)
        
        const pixelX = Math.floor(x * (img.width / rect.width))
        const pixelY = Math.floor(y * (img.height / rect.height))
        
        const imageData = ctx.getImageData(pixelX, pixelY, 1, 1)
        const [r, g, b] = imageData.data
        
        const hex = `#${[r, g, b].map(x => {
          const hex = x.toString(16)
          return hex.length === 1 ? '0' + hex : hex
        }).join('').toUpperCase()}`
        
        resolve(hex)
      }
      img.onerror = () => reject(new Error('Image load error'))
      img.src = imageSrc
    })
  }

  const handleImageMouseMove = (imageSrc: string, event: React.MouseEvent<HTMLImageElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    setZoomLensPosition({ 
      x: event.clientX, 
      y: event.clientY,
      imageX: x,
      imageY: y,
      imageRect: rect
    })
    setZoomLensVisible(true)
    setCurrentImageSrc(imageSrc)
    
    getColorAtPosition(imageSrc, x, y, rect).then(hex => {
      setPreviewColor(hex)
    }).catch(() => {
      // Silent fail for preview
    })
  }

  const handleImageMouseLeave = () => {
    setZoomLensVisible(false)
    setPreviewColor(null)
  }

  const getColorFromImage = (imageSrc: string, event: React.MouseEvent<HTMLImageElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    
    getColorAtPosition(imageSrc, clickX, clickY, rect).then(hex => {
      setFormData((prev) => ({ ...prev, color: hex }))
      
      // Color picker'ı da güncelle
      const colorPicker = document.getElementById('color-picker') as HTMLInputElement
      if (colorPicker) {
        colorPicker.value = hex
      }
      
      toast.success(`Renk seçildi: ${hex}`)
      setZoomLensVisible(false)
      setPreviewColor(null)
    }).catch(() => {
      toast.error('Renk seçilirken bir hata oluştu.')
    })
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
        <div className="dashboard__hero-content">
          <div className="dashboard__hero-text">
            <h1>Yeni Ürün Ekle</h1>
            <p>Yeni bir ürün oluşturun</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            style={{ marginTop: '1rem' }}
          >
            <FaTimes style={{ marginRight: '0.5rem' }} /> İptal
          </button>
        </div>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <form onSubmit={handleCreateProduct} className="dashboard-card__form">
            <div className="dashboard-card__form-section">
              <h3 className="dashboard-card__form-section-title">Temel Bilgiler</h3>
              <div className="dashboard-card__form-row">
                <div className="dashboard-card__form-group">
                  <label htmlFor="name">Ürün Adı *</label>
                  <input
                    id="name"
                    type="text"
                    className="dashboard-card__form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Örn: Modern Perde Seti"
                  />
                </div>
                <div className="dashboard-card__form-group">
                  <label htmlFor="price">Fiyat (₺) *</label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    className="dashboard-card__form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="dashboard-card__form-group">
                <label htmlFor="description">Açıklama</label>
                <textarea
                  id="description"
                  className="dashboard-card__form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Ürün hakkında detaylı açıklama..."
                />
              </div>
              <div className="dashboard-card__form-group">
                <label htmlFor="categoryId">Kategori</label>
                <select
                  id="categoryId"
                  className="dashboard-card__form-select"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Kategori Seçin</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dashboard-card__form-section">
              <h3 className="dashboard-card__form-section-title">Stok</h3>
              <div className="dashboard-card__form-row">
                <div className="dashboard-card__form-group">
                  <label htmlFor="quantity">Stok *</label>
                  <input
                    id="quantity"
                    type="number"
                    className="dashboard-card__form-input"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="dashboard-card__form-section">
              <h3 className="dashboard-card__form-section-title">Ürün Özellikleri</h3>
              <div className="dashboard-card__form-row">
                <div className="dashboard-card__form-group">
                  <label htmlFor="mountingType">Takma Şekli</label>
                  <input
                    id="mountingType"
                    type="text"
                    className="dashboard-card__form-input"
                    value={formData.mountingType}
                    onChange={(e) => setFormData({ ...formData, mountingType: e.target.value })}
                    placeholder="Örn: Kornişli, Kancalı"
                  />
                </div>
                <div className="dashboard-card__form-group">
                  <label htmlFor="material">Materyal</label>
                  <input
                    id="material"
                    type="text"
                    className="dashboard-card__form-input"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    placeholder="Örn: Polyester, Pamuk"
                  />
                </div>
              </div>
              <div className="dashboard-card__form-row">
                <div className="dashboard-card__form-group">
                  <label htmlFor="lightTransmittance">Işık Geçirgenliği</label>
                  <input
                    id="lightTransmittance"
                    type="text"
                    className="dashboard-card__form-input"
                    value={formData.lightTransmittance}
                    onChange={(e) => setFormData({ ...formData, lightTransmittance: e.target.value })}
                    placeholder="Örn: Şeffaf, Yarı Şeffaf, Opak"
                  />
                </div>
                <div className="dashboard-card__form-group">
                  <label htmlFor="pieceCount">Parça Sayısı</label>
                  <input
                    id="pieceCount"
                    type="number"
                    min="1"
                    className="dashboard-card__form-input"
                    value={formData.pieceCount}
                    onChange={(e) => setFormData({ ...formData, pieceCount: e.target.value })}
                    placeholder="Örn: 1, 2"
                  />
                </div>
              </div>
              <div className="dashboard-card__form-row">
                <div className="dashboard-card__form-group">
                  <label htmlFor="color">Renk Kodu (Hex)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      id="color-picker"
                      type="color"
                      style={{
                        width: '60px',
                        height: '40px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                      value={formData.color || '#ffffff'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                    />
                    <input
                      id="color"
                      type="text"
                      className="dashboard-card__form-input"
                      value={formData.color || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                          setFormData({ ...formData, color: value.toUpperCase() });
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value && value.startsWith('#') && value.length < 7) {
                          const hexPart = value.substring(1).padEnd(6, '0');
                          setFormData({ ...formData, color: `#${hexPart.toUpperCase()}` });
                        } else if (value && !value.startsWith('#')) {
                          setFormData({ ...formData, color: `#${value.toUpperCase().padEnd(6, '0')}` });
                        }
                      }}
                      placeholder="#FFFFFF"
                      maxLength={7}
                      style={{ flex: 1 }}
                    />
                    {formData.color && (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: formData.color,
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title={`Seçilen renk: ${formData.color}`}
                      />
                    )}
                  </div>
                  <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    <strong>💡 İpucu:</strong> Renk kodunu manuel girebilir, renk paletinden seçebilir veya yüklediğiniz fotoğraf üzerine tıklayarak ürünün rengini otomatik seçebilirsiniz.
                  </small>
                </div>
                <div className="dashboard-card__form-group">
                  <label htmlFor="usageArea">Kullanım Alanı</label>
                  <input
                    id="usageArea"
                    type="text"
                    className="dashboard-card__form-input"
                    value={formData.usageArea}
                    onChange={(e) => setFormData({ ...formData, usageArea: e.target.value })}
                    placeholder="Örn: Salon, Yatak Odası, Mutfak"
                  />
                </div>
              </div>
            </div>

            <div className="dashboard-card__form-section">
              <h3 className="dashboard-card__form-section-title">Fotoğraflar</h3>
              <div className="dashboard-card__form-row">
                <div className="dashboard-card__form-group">
                  <label htmlFor="coverImage">Ana Fotoğraf</label>
                  <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #bae6fd', 
                    borderRadius: '8px', 
                    marginBottom: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#0369a1'
                  }}>
                    <strong>🎨 Renk Seçimi:</strong> Fotoğraf yükledikten sonra fotoğraf üzerine tıklayarak ürünün rengini otomatik olarak seçebilirsiniz.
                  </div>
                  <input
                    id="coverImage"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                  />
                  {coverImage && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                      Dosya: {coverImage.name} ({formatFileSize(coverImage.size)})
                    </div>
                  )}
                  {coverImagePreview && (
                    <div className="dashboard-card__image-preview" style={{ position: 'relative' }}>
                      <img
                        src={coverImagePreview}
                        alt="Ana fotoğraf ön izlemesi"
                        className="dashboard-card__preview-image"
                        style={{ cursor: 'crosshair' }}
                        onMouseMove={(e) => handleImageMouseMove(coverImagePreview, e)}
                        onMouseLeave={handleImageMouseLeave}
                        onClick={(e) => getColorFromImage(coverImagePreview, e)}
                        title="Fotoğraf üzerine tıklayarak renk seçin"
                      />
                      {zoomLensVisible && currentImageSrc === coverImagePreview && zoomLensPosition.imageX !== undefined && zoomLensPosition.imageY !== undefined && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${zoomLensPosition.imageX}px`,
                            top: `${zoomLensPosition.imageY}px`,
                            transform: 'translate(-50%, -50%)',
                            width: '20px',
                            height: '20px',
                            border: '2px solid #2563eb',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.3)',
                            zIndex: 10,
                          }}
                        />
                      )}
                      {coverImage && (
                        <button
                          type="button"
                          className="dashboard-card__remove-preview"
                          onClick={() => {
                            setCoverImage(null)
                            setCoverImagePreview(null)
                            const input = document.getElementById('coverImage') as HTMLInputElement
                            if (input) input.value = ''
                          }}
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="dashboard-card__form-group">
                  <label htmlFor="detailImage">Detay Fotoğrafı</label>
                  <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #bae6fd', 
                    borderRadius: '8px', 
                    marginBottom: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#0369a1'
                  }}>
                    <strong>🎨 Renk Seçimi:</strong> Fotoğraf yükledikten sonra fotoğraf üzerine tıklayarak ürünün rengini otomatik olarak seçebilirsiniz.
                  </div>
                  <input
                    id="detailImage"
                    type="file"
                    accept="image/*"
                    onChange={handleDetailImageChange}
                  />
                  {detailImage && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                      Dosya: {detailImage.name} ({formatFileSize(detailImage.size)})
                    </div>
                  )}
                  {detailImagePreview && (
                    <div className="dashboard-card__image-preview" style={{ position: 'relative' }}>
                      <img
                        src={detailImagePreview}
                        alt="Detay fotoğrafı ön izlemesi"
                        className="dashboard-card__preview-image"
                        style={{ cursor: 'crosshair' }}
                        onMouseMove={(e) => handleImageMouseMove(detailImagePreview, e)}
                        onMouseLeave={handleImageMouseLeave}
                        onClick={(e) => getColorFromImage(detailImagePreview, e)}
                        title="Fotoğraf üzerine tıklayarak renk seçin"
                      />
                      {zoomLensVisible && currentImageSrc === detailImagePreview && zoomLensPosition.imageX !== undefined && zoomLensPosition.imageY !== undefined && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${zoomLensPosition.imageX}px`,
                            top: `${zoomLensPosition.imageY}px`,
                            transform: 'translate(-50%, -50%)',
                            width: '20px',
                            height: '20px',
                            border: '2px solid #2563eb',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.3)',
                            zIndex: 10,
                          }}
                        />
                      )}
                      {detailImage && (
                        <button
                          type="button"
                          className="dashboard-card__remove-preview"
                          onClick={() => {
                            setDetailImage(null)
                            setDetailImagePreview(null)
                            const input = document.getElementById('detailImage') as HTMLInputElement
                            if (input) input.value = ''
                          }}
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" className="dashboard-card__button" disabled={isSubmitting}>
                {isSubmitting ? 'Oluşturuluyor...' : <><FaPlus style={{ marginRight: '0.5rem' }} /> Ürün Oluştur</>}
              </button>
              <button
                type="button"
                className="dashboard-card__button"
                onClick={onBack}
                style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#64748b' }}
                disabled={isSubmitting}
              >
                İptal
              </button>
            </div>
          </form>
        </article>
      </section>

      {/* Zoom Lens */}
      {zoomLensVisible && currentImageSrc && zoomLensPosition.imageRect && (
        <div
          style={{
            position: 'fixed',
            left: `${zoomLensPosition.x + 20}px`,
            top: `${zoomLensPosition.y}px`,
            width: '200px',
            height: '200px',
            border: '3px solid #2563eb',
            borderRadius: '50%',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 10000,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            background: '#fff',
            transform: 'translateY(-50%)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${currentImageSrc})`,
              backgroundSize: `${zoomLensPosition.imageRect.width * 3}px ${zoomLensPosition.imageRect.height * 3}px`,
              backgroundPosition: `${-(zoomLensPosition.imageX || 0) * 3 + 100}px ${-(zoomLensPosition.imageY || 0) * 3 + 100}px`,
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '4px',
              height: '4px',
              border: '2px solid #fff',
              borderRadius: '50%',
              boxShadow: '0 0 0 1px #2563eb',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Color Preview Tooltip */}
      {zoomLensVisible && previewColor && (
        <div
          style={{
            position: 'fixed',
            left: `${zoomLensPosition.x + 230}px`,
            top: `${zoomLensPosition.y}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            pointerEvents: 'none',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transform: 'translateY(-50%)',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: previewColor,
              border: '2px solid #fff',
              borderRadius: '4px',
              flexShrink: 0,
            }}
          />
          <span>{previewColor}</span>
        </div>
      )}
    </main>
  )
}

export default ProductAddPage


import { useEffect, useState, type FormEvent } from 'react'
import { FaCloudUploadAlt } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'

type ProductEditPageProps = {
  session: AuthResponse
  productId: number
  onBack: () => void
  toast: ReturnType<typeof useToast>
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
  mountingType?: string
  material?: string
  lightTransmittance?: string
  pieceCount?: number
  color?: string
  usageArea?: string
  category?: {
    id: number
    name: string
  }
}

type Category = {
  id: number
  name: string
  description?: string
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function ProductEditPage({ session, productId, onBack, toast }: ProductEditPageProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  const [colorSelectedFromImage, setColorSelectedFromImage] = useState<string | null>(null)

  // Renk seçildiğinde input'ları güncelle
  useEffect(() => {
    if (colorSelectedFromImage) {
      // Kısa bir gecikme ile input'ları güncelle (DOM'un güncellenmesi için)
      setTimeout(() => {
        const colorPicker = document.getElementById('color-picker') as HTMLInputElement
        const colorInput = document.getElementById('color') as HTMLInputElement
        
        if (colorPicker) {
          // React'in controlled component sistemini bypass etmek için native setter kullan
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(colorPicker, colorSelectedFromImage)
            const event = new Event('input', { bubbles: true })
            colorPicker.dispatchEvent(event)
            const changeEvent = new Event('change', { bubbles: true })
            colorPicker.dispatchEvent(changeEvent)
          } else {
            colorPicker.value = colorSelectedFromImage
          }
        }
        
        if (colorInput) {
          // React'in controlled component sistemini bypass etmek için native setter kullan
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(colorInput, colorSelectedFromImage)
            const event = new Event('input', { bubbles: true })
            colorInput.dispatchEvent(event)
            const changeEvent = new Event('change', { bubbles: true })
            colorInput.dispatchEvent(changeEvent)
          } else {
            colorInput.value = colorSelectedFromImage
          }
        }
      }, 50)
      
      setColorSelectedFromImage(null)
    }
  }, [colorSelectedFromImage])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch product
        const productResponse = await fetch(`${apiBaseUrl}/admin/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!productResponse.ok) {
          throw new Error('Ürün yüklenemedi.')
        }

        const productPayload = (await productResponse.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Product
        }

        const productSuccess = productPayload.isSuccess ?? productPayload.success ?? false
        if (!productSuccess || !productPayload.data) {
          throw new Error('Ürün yüklenemedi.')
        }

        const productData = productPayload.data
        setProduct(productData)
        setFormData({
          name: productData.name,
          price: productData.price.toString(),
          description: productData.description || '',
          quantity: productData.quantity.toString(),
          categoryId: productData.category?.id.toString() || '',
          mountingType: productData.mountingType || '',
          material: productData.material || '',
          lightTransmittance: productData.lightTransmittance || '',
          pieceCount: productData.pieceCount?.toString() || '',
          color: productData.color || '',
          usageArea: productData.usageArea || '',
        })
        setCoverImagePreview(productData.coverImageUrl || null)
        setDetailImagePreview(productData.detailImageUrl || null)

        // Fetch categories
        const categoriesResponse = await fetch(`${apiBaseUrl}/admin/categories`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (categoriesResponse.ok) {
          const categoriesPayload = (await categoriesResponse.json()) as {
            isSuccess?: boolean
            success?: boolean
            data?: Category[]
          }
          const categoriesSuccess = categoriesPayload.isSuccess ?? categoriesPayload.success ?? false
          if (categoriesSuccess && categoriesPayload.data) {
            setCategories(categoriesPayload.data)
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [productId, session.accessToken])

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
      reader.readAsDataURL(file)
      toast.success(`Ana fotoğraf seçildi: ${file.name} (${formatFileSize(file.size)})`)
    } else {
      setCoverImage(null)
      setCoverImagePreview(product?.coverImageUrl || null)
    }
  }

  const getColorAtPosition = (imageSrc: string, x: number, y: number, rect: DOMRect): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      // CORS sorununu çözmek için crossOrigin attribute'u ekle
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
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
          
          // Sınırları kontrol et
          const clampedX = Math.max(0, Math.min(pixelX, img.width - 1))
          const clampedY = Math.max(0, Math.min(pixelY, img.height - 1))
          
          const imageData = ctx.getImageData(clampedX, clampedY, 1, 1)
          const [r, g, b] = imageData.data
          
          const hex = `#${[r, g, b].map(x => {
            const hex = x.toString(16)
            return hex.length === 1 ? '0' + hex : hex
          }).join('').toUpperCase()}`
          
          resolve(hex)
        } catch (error) {
          console.error('Renk seçimi hatası:', error)
          reject(new Error('Görselden renk seçilemedi. CORS hatası olabilir.'))
        }
      }
      img.onerror = (error) => {
        console.error('Görsel yükleme hatası:', error)
        reject(new Error('Görsel yüklenemedi. CORS hatası olabilir.'))
      }
      
      // Eğer görsel base64 veya data URL ise crossOrigin gerekmez
      if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')) {
        img.crossOrigin = undefined as any
      }
      
      img.src = imageSrc
    })
  }

  const handleImageMouseMove = (imageSrc: string, event: React.MouseEvent<HTMLImageElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Görselin yüklendiğinden emin ol
    const img = event.currentTarget as HTMLImageElement
    if (!img.complete || img.naturalWidth === 0) {
      return
    }
    
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
    }).catch((error) => {
      // Preview için sessizce başarısız ol, sadece console'a log
      console.debug('Renk önizleme hatası (sessiz):', error)
      // Preview rengini temizle
      setPreviewColor(null)
    })
  }

  const handleImageMouseLeave = () => {
    setZoomLensVisible(false)
    setPreviewColor(null)
  }

  const getColorFromImage = (imageSrc: string, event: React.MouseEvent<HTMLImageElement>) => {
    // Form submit'i engelle - TÜM YOLLARLA
    event.preventDefault()
    event.stopPropagation()
    if (event.nativeEvent) {
      event.nativeEvent.stopImmediatePropagation()
      event.nativeEvent.preventDefault()
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    
    // Görselin yüklendiğinden emin ol
    const img = event.currentTarget as HTMLImageElement
    if (!img.complete || img.naturalWidth === 0) {
      toast.error('Görsel henüz yüklenmedi. Lütfen bekleyin.')
      return
    }
    
    getColorAtPosition(imageSrc, clickX, clickY, rect).then(hex => {
      console.log('Seçilen renk:', hex)
      
      // State'i güncelle
      setFormData((prev) => {
        console.log('Önceki formData.color:', prev.color)
        console.log('Yeni renk:', hex)
        return { ...prev, color: hex }
      })
      
      // Input'ları güncellemek için flag set et
      setColorSelectedFromImage(hex)
      
      toast.success(`Renk seçildi: ${hex}`)
      setZoomLensVisible(false)
      setPreviewColor(null)
    }).catch((error) => {
      console.error('Renk seçimi hatası:', error)
      const errorMessage = error instanceof Error ? error.message : 'Renk seçilirken bir hata oluştu.'
      toast.error(errorMessage)
    })
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
      reader.readAsDataURL(file)
      toast.success(`Detay fotoğrafı seçildi: ${file.name} (${formatFileSize(file.size)})`)
    } else {
      setDetailImage(null)
      setDetailImagePreview(product?.detailImageUrl || null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    // Sadece submit butonuna tıklandığında submit olsun
    const submitter = (event.nativeEvent as any).submitter
    if (!submitter || submitter.type !== 'submit') {
      // Submit butonu ile tetiklenmemiş, iptal et
      console.log('Form submit engellendi - submit butonu ile tetiklenmedi')
      return
    }
    
    setIsSubmitting(true)

    try {
      // Dosya boyutu kontrolü
      if (coverImage) {
        const maxSize = 100 * 1024 * 1024 // 100MB
        if (coverImage.size > maxSize) {
          toast.error(`Ana fotoğraf çok büyük. Maksimum boyut: 100MB. Seçilen dosya: ${formatFileSize(coverImage.size)}`)
          setIsSubmitting(false)
          return
        }
      }
      
      if (detailImage) {
        const maxSize = 100 * 1024 * 1024 // 100MB
        if (detailImage.size > maxSize) {
          toast.error(`Detay fotoğrafı çok büyük. Maksimum boyut: 100MB. Seçilen dosya: ${formatFileSize(detailImage.size)}`)
          setIsSubmitting(false)
          return
        }
      }

      const formDataToSend = new FormData()
      if (formData.name) formDataToSend.append('name', formData.name)
      if (formData.price) formDataToSend.append('price', formData.price)
      if (formData.description !== undefined) formDataToSend.append('description', formData.description)
      if (formData.quantity) formDataToSend.append('quantity', formData.quantity)
      if (formData.categoryId) formDataToSend.append('categoryId', formData.categoryId)
      if (formData.mountingType) formDataToSend.append('mountingType', formData.mountingType)
      if (formData.material) formDataToSend.append('material', formData.material)
      if (formData.lightTransmittance) formDataToSend.append('lightTransmittance', formData.lightTransmittance)
      if (formData.pieceCount) formDataToSend.append('pieceCount', formData.pieceCount)
      if (formData.color) formDataToSend.append('color', formData.color)
      if (formData.usageArea) formDataToSend.append('usageArea', formData.usageArea)
      if (coverImage) {
        formDataToSend.append('coverImage', coverImage)
        console.log('Cover image:', coverImage.name, formatFileSize(coverImage.size))
      }
      if (detailImage) {
        formDataToSend.append('detailImage', detailImage)
        console.log('Detail image:', detailImage.name, formatFileSize(detailImage.size))
      }

      const response = await fetch(`${apiBaseUrl}/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        let errorMessage = 'Ürün güncellenemedi.'
        try {
          const errorPayload = JSON.parse(errorText) as { message?: string }
          errorMessage = errorPayload.message ?? errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
        data?: Product
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Ürün güncellenemedi.')
      }

      // Güncellenmiş ürün bilgilerini state'e kaydet (fotoğraflar dahil)
      if (payload.data) {
        setProduct(payload.data)
        // Fotoğraf preview'larını güncelle
        if (payload.data.coverImageUrl) {
          setCoverImagePreview(payload.data.coverImageUrl)
        }
        if (payload.data.detailImageUrl) {
          setDetailImagePreview(payload.data.detailImageUrl)
        }
        // Yüklenen dosyaları temizle (artık preview'da görünüyor)
        setCoverImage(null)
        setDetailImage(null)
      }

      toast.success('Ürün başarıyla güncellendi.')
      // Kısa bir gecikme ile geri dön (kullanıcı güncellenmiş fotoğrafları görebilsin)
      setTimeout(() => {
        onBack()
      }, 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ürün güncellenemedi.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
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

  if (!product) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <p className="dashboard-card__feedback dashboard-card__feedback--error">Ürün bulunamadı.</p>
          <button
            type="button"
            className="dashboard-card__button"
            onClick={onBack}
            style={{ marginTop: '1rem' }}
          >
            Ürünlere Dön
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <button
            type="button"
            className="dashboard-card__button"
            onClick={onBack}
            style={{ marginBottom: '1rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            ← Ürünlere Dön
          </button>
          <h1>Ürün Düzenle</h1>
          <p>{product.name}</p>
        </div>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <h2>Ürün Bilgileri</h2>
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Sadece submit butonuna tıklandığında submit olsun
              const submitButton = (e.nativeEvent as any).submitter
              if (submitButton && submitButton.type === 'submit') {
                handleSubmit(e)
              }
            }}
            onKeyDown={(e) => {
              // Enter tuşuna basıldığında form submit olmasını engelle (sadece submit butonuna basıldığında submit olsun)
              if (e.key === 'Enter') {
                const target = e.target as HTMLElement
                // Eğer target bir button değilse, submit'i engelle
                if (target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  e.stopPropagation()
                  e.stopImmediatePropagation()
                  return false
                }
              }
            }}
            onKeyPress={(e) => {
              // Enter tuşuna basıldığında form submit olmasını engelle
              if (e.key === 'Enter') {
                const target = e.target as HTMLElement
                if (target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  e.stopPropagation()
                  e.stopImmediatePropagation()
                  return false
                }
              }
            }}
          >
            <div className="dashboard-card__form-row">
              <div className="dashboard-card__form-group">
                <label htmlFor="name">Ürün Adı *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  required
                />
              </div>
              <div className="dashboard-card__form-group">
                <label htmlFor="price">Fiyat (₺) *</label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  required
                />
              </div>
            </div>

            <div className="dashboard-card__form-group">
              <label htmlFor="description">Açıklama</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onKeyDown={(e) => {
                  // Ctrl+Enter ile submit yapılabilir, ama tek başına Enter submit yapmasın
                  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                    // Normal Enter'a izin ver (textarea'da yeni satır için)
                    // Ama form submit olmasın
                  }
                }}
                rows={8}
                style={{ minHeight: '150px', resize: 'vertical' }}
              />
            </div>

            <div className="dashboard-card__form-group">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Ürün Özellikleri
              </h3>
            </div>

            <div className="dashboard-card__form-row">
              <div className="dashboard-card__form-group">
                <label htmlFor="mountingType">Takma Şekli</label>
                <input
                  id="mountingType"
                  type="text"
                  value={formData.mountingType}
                  onChange={(e) => setFormData({ ...formData, mountingType: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  placeholder="örn: Kornişli, Kancalı"
                />
              </div>
              <div className="dashboard-card__form-group">
                <label htmlFor="material">Materyal</label>
                <input
                  id="material"
                  type="text"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  placeholder="örn: Polyester, Pamuk"
                />
              </div>
            </div>

            <div className="dashboard-card__form-row">
              <div className="dashboard-card__form-group">
                <label htmlFor="lightTransmittance">Işık Geçirgenliği</label>
                <input
                  id="lightTransmittance"
                  type="text"
                  value={formData.lightTransmittance}
                  onChange={(e) => setFormData({ ...formData, lightTransmittance: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  placeholder="örn: Şeffaf, Yarı Şeffaf, Opak"
                />
              </div>
              <div className="dashboard-card__form-group">
                <label htmlFor="pieceCount">Parça Sayısı</label>
                <input
                  id="pieceCount"
                  type="number"
                  min="1"
                  value={formData.pieceCount}
                  onChange={(e) => setFormData({ ...formData, pieceCount: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  placeholder="örn: 1, 2"
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
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                    value={formData.color || '#ffffff'}
                    onChange={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFormData({ ...formData, color: e.target.value.toUpperCase() })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                      }
                    }}
                  />
                  <input
                    id="color"
                    type="text"
                    value={formData.color || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Hex formatını kontrol et (# ile başlamalı ve 0-6 hex karakter)
                      if (value === '' || /^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                        setFormData({ ...formData, color: value.toUpperCase() });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                      }
                    }}
                    onBlur={(e) => {
                      // Blur olduğunda eksik karakterleri tamamla
                      const value = e.target.value;
                      if (value && value.startsWith('#') && value.length < 7) {
                        // Eksik karakterleri 0 ile doldur
                        const hexPart = value.substring(1).padEnd(6, '0');
                        setFormData({ ...formData, color: `#${hexPart.toUpperCase()}` });
                      } else if (value && !value.startsWith('#')) {
                        // # yoksa ekle
                        setFormData({ ...formData, color: `#${value.toUpperCase().padEnd(6, '0')}` });
                      }
                    }}
                    placeholder="#FFFFFF"
                    maxLength={7}
                    style={{ flex: 1, padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                  {formData.color && (
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: formData.color,
                        border: '1px solid #e2e8f0',
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
                  value={formData.usageArea}
                  onChange={(e) => setFormData({ ...formData, usageArea: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  placeholder="örn: Salon, Yatak Odası, Mutfak"
                />
              </div>
            </div>

            <div className="dashboard-card__form-row">
              <div className="dashboard-card__form-group">
                <label htmlFor="quantity">Stok</label>
                <input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                />
              </div>
            </div>

            <div className="dashboard-card__form-group">
              <label htmlFor="categoryId">Kategori</label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                  }
                }}
              >
                <option value="">Kategori Seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

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
                  className="upload-card__input"
                />
                <label
                  htmlFor="coverImage"
                  className={`upload-card ${coverImage ? 'upload-card--selected' : ''}`}
                >
                  <span className="upload-card__badge">Ana fotoğraf</span>
                  <span className="upload-card__icon">
                    <FaCloudUploadAlt />
                  </span>
                  <span className="upload-card__title">
                    {coverImage ? 'Yeni bir fotoğraf seçmek için tıklayın' : 'Fotoğraf yüklemek için tıklayın veya sürükleyin'}
                  </span>
                  <span className="upload-card__hint">PNG, JPG veya WEBP • Maksimum 100MB</span>
                  {coverImage && (
                    <span className="upload-card__file">
                      {coverImage.name} ({formatFileSize(coverImage.size)})
                    </span>
                  )}
                  {!coverImage && coverImagePreview && (
                    <span className="upload-card__file">Mevcut fotoğraf korunacak</span>
                  )}
                </label>
                {coverImagePreview && (
                  <div 
                    className="dashboard-card__image-preview" 
                    style={{ position: 'relative' }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (e.nativeEvent) {
                        e.nativeEvent.stopImmediatePropagation()
                        e.nativeEvent.preventDefault()
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (e.nativeEvent) {
                        e.nativeEvent.stopImmediatePropagation()
                        e.nativeEvent.preventDefault()
                      }
                    }}
                  >
                    <img
                      src={coverImagePreview}
                      alt="Ana fotoğraf ön izlemesi"
                      className="dashboard-card__preview-image"
                      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                      crossOrigin="anonymous"
                      onMouseMove={(e) => {
                        e.stopPropagation()
                        handleImageMouseMove(coverImagePreview, e)
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation()
                        handleImageMouseLeave()
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.nativeEvent) {
                          e.nativeEvent.stopImmediatePropagation()
                          e.nativeEvent.preventDefault()
                        }
                        getColorFromImage(coverImagePreview, e)
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.nativeEvent) {
                          e.nativeEvent.stopImmediatePropagation()
                          e.nativeEvent.preventDefault()
                        }
                      }}
                      title="Fotoğraf üzerine tıklayarak renk seçin"
                      onLoad={() => {
                        console.log('Ana fotoğraf yüklendi:', coverImagePreview)
                      }}
                      onError={(e) => {
                        console.error('Ana fotoğraf yükleme hatası:', e)
                        toast.error('Ana fotoğraf yüklenemedi. CORS hatası olabilir.')
                      }}
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
                          setCoverImagePreview(product?.coverImageUrl || null)
                          const input = document.getElementById('coverImage') as HTMLInputElement
                          if (input) input.value = ''
                        }}
                      >
                        ×
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
                  className="upload-card__input"
                />
                <label
                  htmlFor="detailImage"
                  className={`upload-card upload-card--compact ${detailImage ? 'upload-card--selected' : ''}`}
                >
                  <span className="upload-card__badge">Detay fotoğrafı</span>
                  <span className="upload-card__icon">
                    <FaCloudUploadAlt />
                  </span>
                  <span className="upload-card__title">
                    {detailImage ? 'Yeni bir fotoğraf seçmek için tıklayın' : 'Fotoğraf yüklemek için tıklayın veya sürükleyin'}
                  </span>
                  <span className="upload-card__hint">PNG, JPG veya WEBP • Maksimum 100MB</span>
                  {detailImage && (
                    <span className="upload-card__file">
                      {detailImage.name} ({formatFileSize(detailImage.size)})
                    </span>
                  )}
                  {!detailImage && detailImagePreview && (
                    <span className="upload-card__file">Mevcut fotoğraf korunacak</span>
                  )}
                </label>
                {detailImagePreview && (
                  <div 
                    className="dashboard-card__image-preview" 
                    style={{ position: 'relative' }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (e.nativeEvent) {
                        e.nativeEvent.stopImmediatePropagation()
                        e.nativeEvent.preventDefault()
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (e.nativeEvent) {
                        e.nativeEvent.stopImmediatePropagation()
                        e.nativeEvent.preventDefault()
                      }
                    }}
                  >
                    <img
                      src={detailImagePreview}
                      alt="Detay fotoğrafı ön izlemesi"
                      className="dashboard-card__preview-image"
                      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                      crossOrigin="anonymous"
                      onMouseMove={(e) => {
                        e.stopPropagation()
                        handleImageMouseMove(detailImagePreview, e)
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation()
                        handleImageMouseLeave()
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.nativeEvent) {
                          e.nativeEvent.stopImmediatePropagation()
                          e.nativeEvent.preventDefault()
                        }
                        getColorFromImage(detailImagePreview, e)
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.nativeEvent) {
                          e.nativeEvent.stopImmediatePropagation()
                          e.nativeEvent.preventDefault()
                        }
                      }}
                      title="Fotoğraf üzerine tıklayarak renk seçin"
                      onLoad={() => {
                        console.log('Detay fotoğrafı yüklendi:', detailImagePreview)
                      }}
                      onError={(e) => {
                        console.error('Detay fotoğrafı yükleme hatası:', e)
                        toast.error('Detay fotoğrafı yüklenemedi. CORS hatası olabilir.')
                      }}
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
                          setDetailImagePreview(product?.detailImageUrl || null)
                          const input = document.getElementById('detailImage') as HTMLInputElement
                          if (input) input.value = ''
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" className="dashboard-card__button" disabled={isSubmitting}>
                {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
              <button
                type="button"
                className="dashboard-card__button"
                onClick={onBack}
                style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#64748b' }}
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

export default ProductEditPage


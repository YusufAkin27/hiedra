import { useEffect, useState, type FormEvent, useRef } from 'react'
import { FaPlus, FaTimes, FaUpload, FaSpinner, FaArrowLeft } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'

type CouponAddPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
  onBack: () => void
}

type UserSearchResult = {
  id: number
  email: string
  role: string
  emailVerified: boolean
  active: boolean
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function CouponAddPage({ session, toast, onBack }: CouponAddPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'YUZDE' as 'YUZDE' | 'SABIT_TUTAR',
    discountValue: '',
    maxUsageCount: '',
    validFrom: '',
    validUntil: '',
    minimumPurchaseAmount: '',
    active: true,
    coverImageUrl: '',
    isPersonal: false,
    targetUserIds: '',
    targetUserEmails: '',
  })
  
  // Kullanıcı arama ve seçme
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const userSearchTimeoutRef = useRef<number | null>(null)
  const userSearchRef = useRef<HTMLDivElement>(null)
  
  // Dosya yükleme
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dışarı tıklama ile arama sonuçlarını kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setShowUserSearch(false)
      }
    }

    if (showUserSearch) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserSearch])

  // Kullanıcı arama
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setUserSearchResults([])
      return
    }

    if (userSearchTimeoutRef.current) {
      window.clearTimeout(userSearchTimeoutRef.current)
    }

    userSearchTimeoutRef.current = window.setTimeout(async () => {
      try {
        setIsSearchingUsers(true)
        const response = await fetch(`${apiBaseUrl}/admin/users/search?query=${encodeURIComponent(query)}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Kullanıcı arama yapılamadı')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: UserSearchResult[]
        }

        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          const selectedIds = selectedUsers.map(u => u.id)
          setUserSearchResults(payload.data.filter(u => !selectedIds.includes(u.id)))
        } else {
          setUserSearchResults([])
        }
      } catch (err) {
        console.error('Kullanıcı arama hatası:', err)
        setUserSearchResults([])
      } finally {
        setIsSearchingUsers(false)
      }
    }, 300)
  }

  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value)
    if (value.trim().length >= 1) {
      setShowUserSearch(true)
      searchUsers(value)
    } else {
      setShowUserSearch(false)
      setUserSearchResults([])
    }
  }

  const addUser = (user: UserSearchResult) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
      setUserSearchQuery('')
      setShowUserSearch(false)
      setUserSearchResults([])
    }
  }

  const removeUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId))
  }

  // Dosya yükleme
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen geçerli bir resim dosyası seçin')
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Dosya çok büyük. Maksimum boyut: 25MB')
      return
    }

    try {
      setIsUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${apiBaseUrl}/admin/coupons/upload-cover-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Resim yüklenemedi')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setFormData(prev => ({ ...prev, coverImageUrl: payload.data! }))
        toast.success('Kapak resmi başarıyla yüklendi!')
      } else {
        throw new Error('Resim yüklenemedi')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resim yüklenirken bir hata oluştu'
      toast.error(message)
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Form gönderilirken seçili kullanıcıları formData'ya ekle
  const prepareFormDataForSubmit = () => {
    if (formData.isPersonal && selectedUsers.length > 0) {
      const userIds = selectedUsers.map(u => u.id).join(',')
      const userEmails = selectedUsers.map(u => u.email).join(',')
      return {
        ...formData,
        targetUserIds: userIds,
        targetUserEmails: userEmails,
      }
    }
    return formData
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (formData.isPersonal && selectedUsers.length === 0) {
      toast.error('Özel kupon için en az bir kullanıcı seçmelisiniz')
      return
    }

    try {
      setIsSubmitting(true)
      const submitData = prepareFormDataForSubmit()
      
      const response = await fetch(`${apiBaseUrl}/admin/coupons`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: submitData.code.toUpperCase(),
          name: submitData.name,
          description: submitData.description || null,
          type: submitData.type,
          discountValue: parseFloat(submitData.discountValue),
          maxUsageCount: parseInt(submitData.maxUsageCount),
          validFrom: submitData.validFrom,
          validUntil: submitData.validUntil,
          minimumPurchaseAmount: submitData.minimumPurchaseAmount ? parseFloat(submitData.minimumPurchaseAmount) : null,
          active: submitData.active,
          coverImageUrl: submitData.coverImageUrl || null,
          isPersonal: submitData.isPersonal,
          targetUserIds: submitData.isPersonal && submitData.targetUserIds ? submitData.targetUserIds : null,
          targetUserEmails: submitData.isPersonal && submitData.targetUserEmails ? submitData.targetUserEmails : null,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Kupon oluşturulamadı.'
        const responseText = await response.text()
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.message || errorData.data || errorMessage
        } catch (e) {
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      toast.success('Kupon başarıyla oluşturuldu!')
      onBack()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kupon oluşturulurken bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Kupon Yönetimi</p>
          <h1>Yeni Kupon Oluştur</h1>
          <p>Yeni bir kupon oluşturun ve kampanyalarınızı başlatın.</p>
        </div>
        <div className="dashboard__hero-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
          >
            <FaArrowLeft style={{ marginRight: '0.5rem' }} />
            Geri Dön
          </button>
        </div>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <form onSubmit={handleSubmit} className="coupon-form-modal__form">
            <div className="coupon-form-modal__fields">
              <div className="coupon-form-modal__field">
                <label htmlFor="code" className="coupon-form-modal__label">
                  Kupon Kodu *
                </label>
                <input
                  type="text"
                  id="code"
                  className="coupon-form-modal__input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="WELCOME10"
                />
              </div>

              <div className="coupon-form-modal__field">
                <label htmlFor="name" className="coupon-form-modal__label">
                  Kupon Adı *
                </label>
                <input
                  type="text"
                  id="name"
                  className="coupon-form-modal__input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Hoş Geldin İndirimi"
                />
              </div>

              <div className="coupon-form-modal__field">
                <label htmlFor="description" className="coupon-form-modal__label">
                  Açıklama
                </label>
                <textarea
                  id="description"
                  className="coupon-form-modal__textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Kupon açıklaması..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="coupon-form-modal__field">
                  <label htmlFor="type" className="coupon-form-modal__label">
                    İndirim Tipi *
                  </label>
                  <select
                    id="type"
                    className="coupon-form-modal__select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'YUZDE' | 'SABIT_TUTAR' })}
                    required
                  >
                    <option value="YUZDE">Yüzde İndirim (%)</option>
                    <option value="SABIT_TUTAR">Sabit Tutar (TL)</option>
                  </select>
                </div>

                <div className="coupon-form-modal__field">
                  <label htmlFor="discountValue" className="coupon-form-modal__label">
                    İndirim Değeri *
                  </label>
                  <input
                    type="number"
                    id="discountValue"
                    className="coupon-form-modal__input"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    required
                    min="0"
                    step={formData.type === 'YUZDE' ? '1' : '0.01'}
                    placeholder={formData.type === 'YUZDE' ? '10' : '50'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="coupon-form-modal__field">
                  <label htmlFor="maxUsageCount" className="coupon-form-modal__label">
                    Maksimum Kullanım *
                  </label>
                  <input
                    type="number"
                    id="maxUsageCount"
                    className="coupon-form-modal__input"
                    value={formData.maxUsageCount}
                    onChange={(e) => setFormData({ ...formData, maxUsageCount: e.target.value })}
                    required
                    min="1"
                    placeholder="100"
                  />
                </div>

                <div className="coupon-form-modal__field">
                  <label htmlFor="minimumPurchaseAmount" className="coupon-form-modal__label">
                    Minimum Alışveriş Tutarı (TL)
                  </label>
                  <input
                    type="number"
                    id="minimumPurchaseAmount"
                    className="coupon-form-modal__input"
                    value={formData.minimumPurchaseAmount}
                    onChange={(e) => setFormData({ ...formData, minimumPurchaseAmount: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="Opsiyonel"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="coupon-form-modal__field">
                  <label htmlFor="validFrom" className="coupon-form-modal__label">
                    Geçerlilik Başlangıç *
                  </label>
                  <input
                    type="datetime-local"
                    id="validFrom"
                    className="coupon-form-modal__input"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                  />
                </div>

                <div className="coupon-form-modal__field">
                  <label htmlFor="validUntil" className="coupon-form-modal__label">
                    Geçerlilik Bitiş *
                  </label>
                  <input
                    type="datetime-local"
                    id="validUntil"
                    className="coupon-form-modal__input"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="coupon-form-modal__field">
                <label htmlFor="coverImage" className="coupon-form-modal__label">
                  Kapak Resmi
                </label>
                <input
                  type="file"
                  id="coverImage"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {isUploadingImage ? (
                      <>
                        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <FaUpload />
                        Resim Seç
                      </>
                    )}
                  </button>
                  {formData.coverImageUrl && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={formData.coverImageUrl} 
                        alt="Kapak önizleme" 
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '150px', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, coverImageUrl: '' }))}
                        className="btn btn-danger"
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
                <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                  Maksimum dosya boyutu: 25MB. Desteklenen formatlar: JPG, PNG, GIF, WebP
                </small>
              </div>

              <div style={{ padding: '1rem', background: '#f7fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isPersonal}
                    onChange={(e) => {
                      setFormData({ ...formData, isPersonal: e.target.checked })
                      if (!e.target.checked) {
                        setSelectedUsers([])
                      }
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600 }}>Özel Kupon (Sadece seçili kullanıcılara açık)</span>
                </label>
                
                {formData.isPersonal && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }} ref={userSearchRef}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                        Kullanıcı Ara ve Ekle
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => handleUserSearchChange(e.target.value)}
                          onFocus={() => {
                            if (userSearchQuery.trim().length >= 1) {
                              setShowUserSearch(true)
                            }
                          }}
                          placeholder="Email veya ID ile ara..."
                          className="coupon-form-modal__input"
                        />
                        {isSearchingUsers && (
                          <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                            <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#666' }} />
                          </div>
                        )}
                        {!isSearchingUsers && userSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setUserSearchQuery('')
                              setShowUserSearch(false)
                              setUserSearchResults([])
                            }}
                            style={{
                              position: 'absolute',
                              right: '0.75rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#666',
                            }}
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                      
                      {showUserSearch && userSearchResults.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          marginTop: '0.25rem',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 1000,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}>
                          {userSearchResults.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => addUser(user)}
                              style={{
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f7fafc'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.email}</div>
                                <div style={{ fontSize: '0.75rem', color: '#666' }}>ID: {user.id}</div>
                              </div>
                              <FaPlus style={{ color: '#3b82f6', fontSize: '0.75rem' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {selectedUsers.length > 0 && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                          Seçili Kullanıcılar ({selectedUsers.length})
                        </label>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          minHeight: '60px',
                        }}>
                          {selectedUsers.map((user) => (
                            <div
                              key={user.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{user.email}</span>
                              <button
                                type="button"
                                onClick={() => removeUser(user.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0.25rem',
                                }}
                              >
                                <FaTimes style={{ fontSize: '0.75rem' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedUsers.length === 0 && (
                      <div style={{
                        padding: '1rem',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        color: '#92400e',
                        fontSize: '0.85rem',
                      }}>
                        ⚠️ Özel kupon için en az bir kullanıcı seçmelisiniz. Bu kupon sadece seçili kullanıcılara görünecek ve mail ile bildirilecek.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="coupon-form-modal__field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600 }}>Aktif</span>
                </label>
              </div>
            </div>

            <div className="coupon-form-modal__actions">
              <button
                type="button"
                onClick={onBack}
                className="btn btn-secondary"
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
                    <FaSpinner style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <FaPlus style={{ marginRight: '0.5rem' }} />
                    Kupon Oluştur
                  </>
                )}
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}

export default CouponAddPage


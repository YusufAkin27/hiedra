import { useEffect, useState, type FormEvent, useRef } from 'react'
import { FaPlus, FaEdit, FaTrash, FaTicketAlt, FaCheckCircle, FaPause, FaClock, FaChartBar, FaDollarSign, FaChartLine, FaClipboard, FaTable, FaCalendar, FaFileAlt, FaPlay, FaStop, FaTimes, FaSpinner, FaCloudUploadAlt } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type CouponsPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
  onAddCoupon?: () => void
}

type Coupon = {
  id: number
  code: string
  name: string
  description?: string
  type: 'YUZDE' | 'SABIT_TUTAR'
  discountValue: number
  maxUsageCount: number
  currentUsageCount: number
  validFrom: string
  validUntil: string
  active: boolean
  createdAt: string
  updatedAt: string
  minimumPurchaseAmount?: number
  coverImageUrl?: string
  isPersonal?: boolean
  targetUserIds?: string
  targetUserEmails?: string
}

type CouponUsage = {
  id: number
  userEmail: string
  userName: string
  discountAmount: number
  orderTotalBeforeDiscount: number
  orderTotalAfterDiscount: number
  status: string
  createdAt: string
  usedAt?: string
  orderId?: number
  orderNumber?: string
}

type ViewMode = 'table' | 'cards'

type UserSearchResult = {
  id: number
  email: string
  role: string
  emailVerified: boolean
  active: boolean
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function CouponsPage({ session, toast, onAddCoupon }: CouponsPageProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [couponUsages, setCouponUsages] = useState<CouponUsage[]>([])
  const [showUsages, setShowUsages] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; couponId: number | null }>({
    isOpen: false,
    couponId: null,
  })
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })

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

  useEffect(() => {
    fetchCoupons()
  }, [session.accessToken])

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

  const fetchCoupons = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBaseUrl}/admin/coupons`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Kuponlar yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: Coupon[]
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setCoupons(payload.data)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kuponlar yüklenirken bir hata oluştu.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCouponUsages = async (couponId: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/coupons/${couponId}/usages`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Kupon kullanımları yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: CouponUsage[]
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setCouponUsages(payload.data)
        setShowUsages(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kupon kullanımları yüklenirken bir hata oluştu.'
      toast.error(message)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    try {
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
          // JSON parse hatası - response text'i direkt kullan
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      toast.success('Kupon başarıyla oluşturuldu!')
      setShowCreateForm(false)
      resetForm()
      fetchCoupons()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kupon oluşturulurken bir hata oluştu.'
      toast.error(message)
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingCoupon) return

    try {
      const submitData = prepareFormDataForSubmit()
      const response = await fetch(`${apiBaseUrl}/admin/coupons/${editingCoupon.id}`, {
        method: 'PUT',
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
        let errorMessage = 'Kupon güncellenemedi.'
        const responseText = await response.text()
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.message || errorData.data || errorMessage
        } catch (e) {
          // JSON parse hatası - response text'i direkt kullan
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      toast.success('Kupon başarıyla güncellendi!')
      setEditingCoupon(null)
      resetForm()
      fetchCoupons()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kupon güncellenirken bir hata oluştu.'
      toast.error(message)
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeleteModal({ isOpen: true, couponId: id })
  }

  const handleDelete = async () => {
    if (!deleteModal.couponId) {
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/coupons/${deleteModal.couponId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Kupon silinemedi.')
      }

      toast.success('Kupon başarıyla silindi!')
      setDeleteModal({ isOpen: false, couponId: null })
      fetchCoupons()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kupon silinirken bir hata oluştu.'
      toast.error(message)
    }
  }

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
          // Zaten seçili olan kullanıcıları filtrele
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

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen geçerli bir resim dosyası seçin')
      return
    }

    // Dosya boyutu kontrolü (25MB)
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

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'YUZDE',
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
    setSelectedUsers([])
    setUserSearchQuery('')
    setUserSearchResults([])
    setShowUserSearch(false)
  }

  const startEdit = async (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      type: coupon.type,
      discountValue: coupon.discountValue.toString(),
      maxUsageCount: coupon.maxUsageCount.toString(),
      validFrom: coupon.validFrom.substring(0, 16), // YYYY-MM-DDTHH:mm formatı
      validUntil: coupon.validUntil.substring(0, 16),
      minimumPurchaseAmount: coupon.minimumPurchaseAmount?.toString() || '',
      active: coupon.active,
      coverImageUrl: coupon.coverImageUrl || '',
      isPersonal: coupon.isPersonal || false,
      targetUserIds: coupon.targetUserIds || '',
      targetUserEmails: coupon.targetUserEmails || '',
    })
    
    // Özel kupon ise kullanıcıları yükle
    if (coupon.isPersonal && (coupon.targetUserIds || coupon.targetUserEmails)) {
      const userIds = coupon.targetUserIds ? coupon.targetUserIds.split(',').map(id => id.trim()).filter(Boolean) : []
      const userEmails = coupon.targetUserEmails ? coupon.targetUserEmails.split(',').map(email => email.trim()).filter(Boolean) : []
      
      const users: UserSearchResult[] = []
      
      // ID'lerden kullanıcıları bul
      for (const idStr of userIds) {
        try {
          const userId = parseInt(idStr)
          if (!isNaN(userId)) {
            const response = await fetch(`${apiBaseUrl}/admin/users/${userId}`, {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
              },
            })
            if (response.ok) {
              const payload = await response.json()
              if (payload.data) {
                users.push({
                  id: payload.data.id,
                  email: payload.data.email,
                  role: payload.data.role,
                  emailVerified: payload.data.emailVerified,
                  active: payload.data.active,
                })
              }
            }
          }
        } catch (err) {
          console.error('Kullanıcı yüklenemedi:', err)
        }
      }
      
      // Email'lerden kullanıcıları bul
      for (const email of userEmails) {
        try {
          const response = await fetch(`${apiBaseUrl}/admin/users/search?query=${encodeURIComponent(email)}`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
          })
          if (response.ok) {
            const payload = await response.json()
            if (payload.data && payload.data.length > 0) {
              const user = payload.data[0]
              if (!users.find(u => u.id === user.id)) {
                users.push(user)
              }
            }
          }
        } catch (err) {
          console.error('Kullanıcı yüklenemedi:', err)
        }
      }
      
      setSelectedUsers(users)
    } else {
      setSelectedUsers([])
    }
    
    setShowCreateForm(true)
  }

  const cancelEdit = () => {
    setEditingCoupon(null)
    setShowCreateForm(false)
    resetForm()
  }

  const isCouponValid = (coupon: Coupon): boolean => {
    const now = new Date()
    const validFrom = new Date(coupon.validFrom)
    const validUntil = new Date(coupon.validUntil)
    return (
      coupon.active &&
      now >= validFrom &&
      now <= validUntil &&
      coupon.currentUsageCount < coupon.maxUsageCount
    )
  }

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.active) {
      return <span className="dashboard-card__chip dashboard-card__chip--error">Pasif</span>
    }
    if (isCouponValid(coupon)) {
      return <span className="dashboard-card__chip dashboard-card__chip--success">Geçerli</span>
    }
    return <span className="dashboard-card__chip dashboard-card__chip--warning">Geçersiz</span>
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

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Kopyalandı!')
    })
  }


  // Filtreleme ve sayfalama
  const filteredCoupons = coupons.filter((coupon) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        coupon.code.toLowerCase().includes(search) ||
        coupon.name.toLowerCase().includes(search) ||
        (coupon.description && coupon.description.toLowerCase().includes(search)) ||
        coupon.id.toString().includes(search)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredCoupons.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCoupons = filteredCoupons.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.active).length,
    inactive: coupons.filter((c) => !c.active).length,
    valid: coupons.filter((c) => isCouponValid(c)).length,
    expired: coupons.filter((c) => {
      const now = new Date()
      const validUntil = new Date(c.validUntil)
      return now > validUntil
    }).length,
    percentageType: coupons.filter((c) => c.type === 'YUZDE').length,
    fixedAmountType: coupons.filter((c) => c.type === 'SABIT_TUTAR').length,
    totalUsages: coupons.reduce((sum, c) => sum + c.currentUsageCount, 0),
    totalSavings: coupons.reduce((sum, c) => sum + (c.currentUsageCount * c.discountValue), 0),
  }

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === 'YUZDE') {
      return `%${coupon.discountValue}`
    }
    return `${coupon.discountValue.toFixed(2)} ₺`
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
          <p className="dashboard__eyebrow">Kupon Yönetimi</p>
          <h1>Kuponlar</h1>
          <p>Tüm kuponları görüntüleyin, oluşturun ve yönetin.</p>
        </div>
        <div className="dashboard__hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (onAddCoupon) {
                onAddCoupon()
              } else {
                setShowCreateForm(true)
                setEditingCoupon(null)
                resetForm()
              }
            }}
          >
            <FaPlus style={{ marginRight: '0.5rem' }} /> Yeni Kupon Oluştur
          </button>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid coupons-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="coupons-stats__title">Genel İstatistikler</h3>
          <div className="coupons-stats__grid">
            <div className="coupons-stat-card coupons-stat-card--primary">
              <div className="coupons-stat-card__icon"><FaTicketAlt /></div>
              <div className="coupons-stat-card__value">{stats.total}</div>
              <div className="coupons-stat-card__label">Toplam Kupon</div>
              <div className="coupons-stat-card__subtitle">Tüm kuponlar</div>
            </div>
            <div className="coupons-stat-card coupons-stat-card--success">
              <div className="coupons-stat-card__icon"><FaCheckCircle /></div>
              <div className="coupons-stat-card__value">{stats.active}</div>
              <div className="coupons-stat-card__label">Aktif</div>
              <div className="coupons-stat-card__subtitle">Yayında</div>
            </div>
            <div className="coupons-stat-card coupons-stat-card--info">
              <div className="coupons-stat-card__icon"><FaCheckCircle /></div>
              <div className="coupons-stat-card__value">{stats.valid}</div>
              <div className="coupons-stat-card__label">Geçerli</div>
              <div className="coupons-stat-card__subtitle">Kullanılabilir</div>
            </div>
            <div className="coupons-stat-card coupons-stat-card--warning">
              <div className="coupons-stat-card__icon"><FaPause /></div>
              <div className="coupons-stat-card__value">{stats.inactive}</div>
              <div className="coupons-stat-card__label">Pasif</div>
              <div className="coupons-stat-card__subtitle">Yayında değil</div>
            </div>
            <div className="coupons-stat-card coupons-stat-card--error">
              <div className="coupons-stat-card__icon"><FaClock /></div>
              <div className="coupons-stat-card__value">{stats.expired}</div>
              <div className="coupons-stat-card__label">Süresi Dolmuş</div>
              <div className="coupons-stat-card__subtitle">Geçersiz</div>
            </div>
            <div className="coupons-stat-card coupons-stat-card--info">
              <div className="coupons-stat-card__icon"><FaChartBar /></div>
              <div className="coupons-stat-card__value">{stats.percentageType}</div>
              <div className="coupons-stat-card__label">Yüzde İndirim</div>
              <div className="coupons-stat-card__subtitle">% indirimli</div>
            </div>
            <div className="coupons-stat-card coupons-stat-card--info">
              <div className="coupons-stat-card__icon"><FaDollarSign /></div>
              <div className="coupons-stat-card__value">{stats.fixedAmountType}</div>
              <div className="coupons-stat-card__label">Sabit Tutar</div>
              <div className="coupons-stat-card__subtitle">TL indirimli</div>
            </div>
            <div className="coupons-stat-card coupons-stat-card--success">
              <div className="coupons-stat-card__icon"><FaChartLine /></div>
              <div className="coupons-stat-card__value">{stats.totalUsages}</div>
              <div className="coupons-stat-card__label">Toplam Kullanım</div>
              <div className="coupons-stat-card__subtitle">Kullanılan kupon</div>
            </div>
          </div>
        </article>
      </section>

      {/* Kupon Kullanımları Modal */}
      {showUsages && selectedCoupon && (
        <div
          className="coupon-usage-modal-overlay"
          onClick={() => {
            setShowUsages(false)
            setSelectedCoupon(null)
          }}
        >
          <div
            className="coupon-usage-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="coupon-usage-modal__header">
              <h2 className="coupon-usage-modal__title">Kupon Kullanımları: {selectedCoupon.code}</h2>
              <button
                type="button"
                className="coupon-usage-modal__close"
                onClick={() => {
                  setShowUsages(false)
                  setSelectedCoupon(null)
                }}
              >
                ✕
              </button>
            </div>
            {couponUsages.length === 0 ? (
              <p>Bu kupon için henüz kullanım kaydı bulunmuyor.</p>
            ) : (
              <div className="dashboard-card__table">
                <table>
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>İndirim Tutarı</th>
                      <th>Toplam (Önce)</th>
                      <th>Toplam (Sonra)</th>
                      <th>Durum</th>
                      <th>Sipariş No</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponUsages.map((usage) => (
                      <tr key={usage.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600 }}>{usage.userName}</div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>{usage.userEmail}</div>
                          </div>
                        </td>
                        <td>{usage.discountAmount.toFixed(2)} TL</td>
                        <td>{usage.orderTotalBeforeDiscount.toFixed(2)} TL</td>
                        <td>{usage.orderTotalAfterDiscount.toFixed(2)} TL</td>
                        <td>
                          <span
                            className={`dashboard-card__chip ${
                              usage.status === 'KULLANILDI'
                                ? 'dashboard-card__chip--success'
                                : usage.status === 'BEKLEMEDE'
                                ? 'dashboard-card__chip--warning'
                                : 'dashboard-card__chip--error'
                            }`}
                          >
                            {usage.status === 'KULLANILDI'
                              ? 'Kullanıldı'
                              : usage.status === 'BEKLEMEDE'
                              ? 'Beklemede'
                              : 'İptal Edildi'}
                          </span>
                        </td>
                        <td>{usage.orderNumber || '-'}</td>
                        <td>{formatDate(usage.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kupon Oluştur/Düzenle Formu */}
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
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>{editingCoupon ? 'Kupon Düzenle' : 'Yeni Kupon Oluştur'}</h2>
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
                ×
              </button>
            </div>

            <form className="coupon-form-modal__form" onSubmit={editingCoupon ? handleUpdate : handleCreate}>
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

                <div>
                  <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Kupon Adı *
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
                    placeholder="Hoş Geldin İndirimi"
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
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      resize: 'vertical',
                    }}
                    placeholder="Kupon açıklaması..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label htmlFor="type" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      İndirim Tipi *
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'YUZDE' | 'SABIT_TUTAR' })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                    >
                      <option value="YUZDE">Yüzde İndirim (%)</option>
                      <option value="SABIT_TUTAR">Sabit Tutar (TL)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="discountValue" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      İndirim Değeri *
                    </label>
                    <input
                      type="number"
                      id="discountValue"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      required
                      min="0"
                      step={formData.type === 'YUZDE' ? '1' : '0.01'}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                      placeholder={formData.type === 'YUZDE' ? '10' : '50'}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label htmlFor="maxUsageCount" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Maksimum Kullanım *
                    </label>
                    <input
                      type="number"
                      id="maxUsageCount"
                      value={formData.maxUsageCount}
                      onChange={(e) => setFormData({ ...formData, maxUsageCount: e.target.value })}
                      required
                      min="1"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label htmlFor="minimumPurchaseAmount" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Minimum Alışveriş Tutarı (TL)
                    </label>
                    <input
                      type="number"
                      id="minimumPurchaseAmount"
                      value={formData.minimumPurchaseAmount}
                      onChange={(e) => setFormData({ ...formData, minimumPurchaseAmount: e.target.value })}
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                      placeholder="Opsiyonel"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label htmlFor="validFrom" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Geçerlilik Başlangıç *
                    </label>
                    <input
                      type="datetime-local"
                      id="validFrom"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="validUntil" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Geçerlilik Bitiş *
                    </label>
                    <input
                      type="datetime-local"
                      id="validUntil"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="coverImage" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Kapak Resmi
                  </label>
                  <input
                    type="file"
                    id="coverImage"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="upload-card__input"
                  />
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <label
                      htmlFor="coverImage"
                      className={`upload-card upload-card--compact ${formData.coverImageUrl ? 'upload-card--selected' : ''} ${
                        isUploadingImage ? 'upload-card--disabled' : ''
                      }`}
                      style={{ flex: '1 1 260px', minWidth: '240px' }}
                      aria-disabled={isUploadingImage}
                    >
                      <span className="upload-card__badge">Kapak görseli</span>
                      <span className="upload-card__icon">
                        {isUploadingImage ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaCloudUploadAlt />}
                      </span>
                      <span className="upload-card__title">
                        {isUploadingImage ? 'Fotoğraf yükleniyor...' : 'Fotoğraf seçmek için tıklayın'}
                      </span>
                      <span className="upload-card__hint">PNG, JPG veya WEBP • Maksimum 25MB</span>
                      {formData.coverImageUrl && !isUploadingImage && (
                        <span className="upload-card__file">Yeni kapak görseli hazır</span>
                      )}
                      {isUploadingImage && <span className="upload-card__file">Yükleniyor...</span>}
                    </label>
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
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
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
                      {/* Kullanıcı Arama */}
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
                            style={{
                              width: '100%',
                              padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                            }}
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
                        
                        {/* Arama Sonuçları */}
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
                      
                      {/* Seçili Kullanıcılar */}
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

                <div>
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

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn btn-secondary"
                  style={{ minWidth: '100px' }}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }}>
                  {editingCoupon ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="coupons-filters">
            <div className="coupons-filters__row">
              <div className="coupons-filters__search">
                <input
                  type="text"
                  className="coupons-filters__input"
                  placeholder="Kupon ara (kod, ad, açıklama...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="coupons-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary coupons-view-toggle coupons-view-toggle--desktop"
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                >
                  {viewMode === 'table' ? <><FaTable style={{ marginRight: '0.5rem' }} /> Kart</> : <><FaChartBar style={{ marginRight: '0.5rem' }} /> Tablo</>}
                </button>
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setSearchTerm('')
                      setCurrentPage(1)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="coupons-header">
            <div className="coupons-header__info">
              <span className="coupons-header__count">
                Toplam: <strong>{filteredCoupons.length}</strong> kupon
              </span>
              {filteredCoupons.length !== coupons.length && (
                <span className="coupons-header__filtered">
                  (Filtrelenmiş: {filteredCoupons.length} / {coupons.length})
                </span>
              )}
            </div>
            <div className="coupons-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {coupons.length === 0 ? (
            <p className="dashboard-card__empty">Henüz kupon bulunmuyor.</p>
          ) : filteredCoupons.length === 0 ? (
            <p className="dashboard-card__empty">Arama kriterlerinize uygun kupon bulunamadı.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table coupons-table-desktop ${viewMode === 'table' ? '' : 'coupons-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Ad</th>
                      <th>İndirim</th>
                      <th>Kullanım</th>
                      <th>Geçerlilik</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCoupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td>
                          <div className="coupons-table__code">
                            <div className="coupons-table__code-value">{coupon.code}</div>
                            <button
                              type="button"
                              className="coupons-table__copy-btn"
                              onClick={() => copyToClipboard(coupon.code)}
                              title="Kopyala"
                            >
                              <FaClipboard />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="coupons-table__name">
                            {coupon.name}
                            {coupon.isPersonal && (
                              <span style={{ 
                                marginLeft: '0.5rem', 
                                padding: '0.25rem 0.5rem', 
                                background: '#fef3c7', 
                                color: '#92400e', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                Özel
                              </span>
                            )}
                          </div>
                          {coupon.description && (
                            <div className="coupons-table__description" title={coupon.description}>
                              {coupon.description.length > 50 ? coupon.description.substring(0, 50) + '...' : coupon.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="coupons-table__discount">
                            <strong className="coupons-table__discount-value">{formatDiscount(coupon)}</strong>
                            {coupon.minimumPurchaseAmount && (
                              <div className="coupons-table__discount-min">
                                Min: {coupon.minimumPurchaseAmount.toFixed(2)} ₺
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="coupons-table__usage">
                            <div className="coupons-table__usage-count">
                              {coupon.currentUsageCount} / {coupon.maxUsageCount}
                            </div>
                            <div className="coupons-table__usage-percent">
                              {((coupon.currentUsageCount / coupon.maxUsageCount) * 100).toFixed(0)}% kullanıldı
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="coupons-table__validity">
                            <div className="coupons-table__validity-from">{formatDate(coupon.validFrom)}</div>
                            <div className="coupons-table__validity-until">→ {formatDate(coupon.validUntil)}</div>
                          </div>
                        </td>
                        <td>{getStatusBadge(coupon)}</td>
                        <td>
                          <div className="coupons-table__actions">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCoupon(coupon)
                                fetchCouponUsages(coupon.id)
                              }}
                              className="coupons-table__btn coupons-table__btn--info"
                              title="Kullanımları Gör"
                            >
                              <FaChartBar />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(coupon)}
                              className="coupons-table__btn coupons-table__btn--primary"
                              title="Düzenle"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(coupon.id)}
                              className="coupons-table__btn coupons-table__btn--danger"
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
              <div className={`coupons-cards ${viewMode === 'cards' ? '' : 'coupons-cards--hidden'}`}>
                {paginatedCoupons.map((coupon) => (
                  <div key={coupon.id} className={`coupon-card ${!coupon.active ? 'coupon-card--inactive' : ''}`}>
                    <div className="coupon-card__header">
                      <div className="coupon-card__header-left">
                        <div className="coupon-card__code">
                          <div className="coupon-card__code-value">{coupon.code}</div>
                          <button
                            type="button"
                            className="coupon-card__copy-btn"
                            onClick={() => copyToClipboard(coupon.code)}
                            title="Kopyala"
                          >
                            <FaClipboard />
                          </button>
                        </div>
                        <div className="coupon-card__name">
                          {coupon.name}
                          {coupon.isPersonal && (
                            <span style={{ 
                              marginLeft: '0.5rem', 
                              padding: '0.25rem 0.5rem', 
                              background: '#fef3c7', 
                              color: '#92400e', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              Özel
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="coupon-card__header-right">
                        {getStatusBadge(coupon)}
                        <div className="coupon-card__id">#{coupon.id}</div>
                      </div>
                    </div>
                    <div className="coupon-card__body">
                      <div className="coupon-card__discount">
                        <div className="coupon-card__discount-label">İndirim</div>
                        <div className="coupon-card__discount-value">{formatDiscount(coupon)}</div>
                        {coupon.minimumPurchaseAmount && (
                          <div className="coupon-card__discount-min">
                            Min. alışveriş: {coupon.minimumPurchaseAmount.toFixed(2)} ₺
                          </div>
                        )}
                      </div>
                      {coupon.description && (
                        <div className="coupon-card__description">
                          <div className="coupon-card__description-label"><FaFileAlt style={{ marginRight: '0.25rem' }} /> Açıklama</div>
                          <div className="coupon-card__description-text">{coupon.description}</div>
                        </div>
                      )}
                      <div className="coupon-card__usage">
                        <div className="coupon-card__usage-label"><FaChartBar style={{ marginRight: '0.25rem' }} /> Kullanım</div>
                        <div className="coupon-card__usage-content">
                          <div className="coupon-card__usage-count">
                            {coupon.currentUsageCount} / {coupon.maxUsageCount}
                          </div>
                          <div className="coupon-card__usage-percent">
                            {((coupon.currentUsageCount / coupon.maxUsageCount) * 100).toFixed(0)}% kullanıldı
                          </div>
                        </div>
                      </div>
                      <div className="coupon-card__validity">
                        <div className="coupon-card__validity-label"><FaCalendar style={{ marginRight: '0.25rem' }} /> Geçerlilik</div>
                        <div className="coupon-card__validity-content">
                          <div className="coupon-card__validity-from">
                            <FaPlay style={{ marginRight: '0.25rem' }} />
                            {formatDate(coupon.validFrom)}
                          </div>
                          <div className="coupon-card__validity-until">
                            <FaStop style={{ marginRight: '0.25rem' }} />
                            {formatDate(coupon.validUntil)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="coupon-card__actions">
                      <button
                        type="button"
                        className="coupon-card__btn coupon-card__btn--info"
                        onClick={() => {
                          setSelectedCoupon(coupon)
                          fetchCouponUsages(coupon.id)
                        }}
                      >
                        <FaChartBar style={{ marginRight: '0.25rem' }} /> Kullanımlar
                      </button>
                      <button
                        type="button"
                        className="coupon-card__btn coupon-card__btn--primary"
                        onClick={() => startEdit(coupon)}
                      >
                        <FaEdit style={{ marginRight: '0.25rem' }} /> Düzenle
                      </button>
                      <button
                        type="button"
                        className="coupon-card__btn coupon-card__btn--danger"
                        onClick={() => handleDeleteClick(coupon.id)}
                      >
                        <FaTrash style={{ marginRight: '0.25rem' }} /> Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="coupons-pagination">
                  <button
                    type="button"
                    className="coupons-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="coupons-pagination__btn"
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
                        className={`coupons-pagination__btn coupons-pagination__btn--number ${
                          currentPage === pageNum ? 'coupons-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="coupons-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="coupons-pagination__btn"
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
        message="Bu kuponu silmek istediğinizden emin misiniz?"
        type="confirm"
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, couponId: null })}
      />
    </main>
  )
}

export default CouponsPage


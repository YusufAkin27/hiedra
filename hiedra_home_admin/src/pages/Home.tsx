import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthResponse } from '../services/authService'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { FaDollarSign, FaCreditCard, FaTruck, FaChartLine, FaInfoCircle } from 'react-icons/fa'
import type { AdminPage } from '../types/navigation'

type DashboardStats = {
  totalProducts: number
  totalOrders: number
  ordersByStatus: Record<string, number>
  totalRevenue: number
  todayOrders: number
  pendingMessages: number
  ordersLast7Days: Record<string, number>
  totalReviews: number
  activeReviews: number
  pendingReviews: number
  averageRating: number
  totalGuests: number
  activeGuestsLast24Hours: number
  activeVisitorsNow: number
  activeVisitorsLastHour: number
  activeGuestSessions: number
  activeUserSessions: number
  activeAdminSessions: number
  activeAuthenticatedSessions: number
  totalUsers: number
  activeUsers: number
  verifiedUsers: number
  adminUsers: number
  customerUsers: number
  newUsersLast7Days: number
  usersLoggedLast24Hours: number
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
type HomePageProps = {
  session: AuthResponse
  onLogout: () => void
  onViewUser?: (userId: number) => void
  onNavigate?: (page: AdminPage, productId?: number, orderId?: number, userId?: number) => void
}


type RevenueData = {
  totalOrders: number
  totalRevenue: number
  iyzicoFee: number
  iyzicoFeeRate: number
  totalShippingCost: number
  shippingCostPerOrder: number
  netProfit: number
}

function HomePage({ session, onLogout: _onLogout, onViewUser: _onViewUser, onNavigate }: HomePageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(false)
  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    updateViewport()
    
    // Resize event'i throttle et - performans için
    let timeoutId: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateViewport, 150) // 150ms throttle
    }
    
    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  // Kullanıcı profil bilgilerini çek
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/user/profile`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const payload = (await response.json()) as {
            isSuccess?: boolean
            success?: boolean
            data?: {
              id: number
              email: string
              fullName?: string
              phone?: string
              emailVerified: boolean
              active: boolean
              lastLoginAt?: string
              createdAt?: string
            }
          }
          const success = payload.isSuccess ?? payload.success ?? false
          if (success && payload.data?.fullName) {
            setUserName(payload.data.fullName)
          }
        }
      } catch (err) {
        console.warn('Kullanıcı profil bilgileri yüklenemedi:', err)
      }
    }

    fetchUserProfile()
  }, [session.accessToken])

  const fetchStats = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingStats(true)
      
      // Cache service kullan
      const { cacheService } = await import('../services/cacheService')
      const cacheKey = `dashboard_stats_${session.user.id}`
      
      // Force refresh ise cache'i temizle
      if (forceRefresh) {
        cacheService.clear(cacheKey)
      }
      
      const result = await cacheService.fetch<{
        isSuccess?: boolean
        success?: boolean
        data?: DashboardStats
      }>(`${apiBaseUrl}/admin/dashboard/stats`, {
        cacheKey,
        cacheOptions: {
          ttl: 5 * 60 * 1000, // 5 dakika
          useHttpCache: true,
        },
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const payload = result.data
      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setStats(payload.data)
        setLastRefreshedAt(new Date())
      }
    } catch (err) {
      console.error('İstatistikler yüklenemedi:', err)
    } finally {
      setIsLoadingStats(false)
    }
  }, [session.accessToken, session.user.id])

  const fetchRevenue = useCallback(async () => {
    try {
      setIsLoadingRevenue(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/revenue`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: RevenueData
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setRevenueData(payload.data)
      }
    } catch (err) {
      console.error('Kazanç verisi yüklenemedi:', err)
    } finally {
      setIsLoadingRevenue(false)
    }
  }, [session.accessToken])

  useEffect(() => {
    fetchStats()
    fetchRevenue()
    // Cache kullanıldığı için interval'i 2 dakikaya çıkar (cache 5 dakika)
    const interval = window.setInterval(() => {
      fetchStats(false)
      fetchRevenue()
    }, 2 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [fetchStats, fetchRevenue])

  const getStatusDisplayName = (status: string): string => {
    const statusMap: Record<string, string> = {
      PENDING: 'Ödeme Bekleniyor',
      PAID: 'Ödendi',
      PROCESSING: 'İşleme Alındı',
      SHIPPED: 'Kargoya Verildi',
      DELIVERED: 'Teslim Edildi',
      CANCELLED: 'İptal Edildi',
      REFUND_REQUESTED: 'İade Talep Edildi',
      REFUNDED: 'İade Yapıldı',
      COMPLETED: 'Tamamlandı',
    }
    return statusMap[status] || status
  }

  // Grafik verilerini hazırla
  const ordersByStatusData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.ordersByStatus)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: getStatusDisplayName(status),
        value: count,
        status,
      }))
  }, [stats])

  const ordersLast7DaysData = useMemo(() => {
    if (!stats?.ordersLast7Days) return []
    return Object.entries(stats.ordersLast7Days).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      sipariş: count,
      fullDate: date,
    }))
  }, [stats])

  const reviewsData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Aktif', value: stats.activeReviews, color: '#10b981' },
      { name: 'Pasif', value: stats.pendingReviews, color: '#ef4444' },
    ]
  }, [stats])

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316']
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
      }),
    []
  )

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('tr-TR', {
        maximumFractionDigits: 0,
      }),
    []
  )

  const lastRefreshedLabel = useMemo(() => {
    if (!lastRefreshedAt) return 'Henüz yenilenmedi'
    return lastRefreshedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, [lastRefreshedAt])

  const pieChartHeight = isMobile ? 240 : 300
  const trendChartHeight = isMobile ? 220 : 280
  const trendBarChartHeight = isMobile ? 220 : 260
  const visitorChartHeight = isMobile ? 220 : 260

  const summaryCards = useMemo(() => {
    if (!stats) return []
    return [
      {
        id: 'revenue',
        tone: 'blue',
        title: 'Toplam Gelir',
        value: currencyFormatter.format(stats.totalRevenue),
        subtitle: 'Ödenmiş ve tamamlanmış siparişler',
        navigateTo: 'orders' as const,
      },
      {
        id: 'todayOrders',
        tone: 'emerald',
        title: 'Bugünkü Sipariş',
        value: numberFormatter.format(stats.todayOrders),
        subtitle: 'Son 24 saatte tamamlanan işlemler',
        navigateTo: 'orders' as const,
      },
      {
        id: 'totalUsers',
        tone: 'violet',
        title: 'Toplam Üye',
        value: numberFormatter.format(stats.totalUsers),
        subtitle: `Aktif üye: ${numberFormatter.format(stats.activeUsers)}`,
        navigateTo: 'users' as const,
      },
      {
        id: 'verifiedUsers',
        tone: 'sky',
        title: 'Doğrulanmış Üye',
        value: numberFormatter.format(stats.verifiedUsers),
        subtitle: 'E-posta doğrulaması tamamlanan kullanıcılar',
        navigateTo: 'users' as const,
      },
      {
        id: 'adminUsers',
        tone: 'amber',
        title: 'Yönetici',
        value: numberFormatter.format(stats.adminUsers),
        subtitle: `Müşteri: ${numberFormatter.format(stats.customerUsers)}`,
        navigateTo: 'users' as const,
      },
      {
        id: 'newUsers',
        tone: 'rose',
        title: 'Yeni Üye (7 Gün)',
        value: numberFormatter.format(stats.newUsersLast7Days),
        subtitle: 'Son 7 günde kayıt olan kullanıcılar',
        navigateTo: 'users' as const,
      },
    ]
  }, [currencyFormatter, numberFormatter, stats])

  const userInsightMetrics = useMemo(() => {
    if (!stats) return []
    return [
      {
        label: 'Aktif Üye (24 Saat)',
        value: numberFormatter.format(stats.usersLoggedLast24Hours),
        hint: 'Son 24 saatte giriş yapan üyeler',
        navigateTo: 'users' as const,
      },
      {
        label: 'İletişim Kutusunda',
        value: numberFormatter.format(stats.pendingMessages),
        hint: 'Yanıt bekleyen mesajlar',
        navigateTo: 'messages' as const,
      },
      {
        label: 'Aktif Guest',
        value: numberFormatter.format(stats.activeGuestsLast24Hours),
        hint: 'Son 24 saatte etkileşimde bulunan misafirler',
        navigateTo: 'guests' as const,
      },
      {
        label: 'Toplam Guest',
        value: numberFormatter.format(stats.totalGuests),
        hint: 'Ziyaretçi olarak kayıtlı kullanıcılar',
        navigateTo: 'guests' as const,
      },
    ]
  }, [numberFormatter, stats])

  return (
    <main className="page dashboard" aria-live="polite">
      <section className="dashboard__hero dashboard__hero--modern">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Yönetim Merkezi</p>
          <h1>Hoş geldin{userName ? ` ${userName}` : ''}</h1>
          <p>
            Hiedra Home için gerçek zamanlı operasyon kontrol paneliniz. Gösterge paneli her 30 saniyede
            otomatik güncellenir; dilerseniz şimdi yenileyebilirsiniz.
          </p>
          <div className="dashboard__hero-meta">
            <span>Son güncelleme: {lastRefreshedLabel}</span>
          </div>
        </div>

        <div className="dashboard__hero-actions">
          <button className="dashboard__refresh-button" type="button" onClick={() => {
            fetchStats(true)
            fetchRevenue()
          }} disabled={isLoadingStats || isLoadingRevenue}>
            {!isLoadingStats && !isLoadingRevenue ? 'Verileri Yenile' : 'Yükleniyor...'}
          </button>
        </div>
      </section>

      {isLoadingStats && !stats && (
        <section className="dashboard__grid">
          <article className="dashboard-card">
            <p>İstatistikler yükleniyor...</p>
          </article>
        </section>
      )}

      {stats && (
        <>
          {revenueData && (
            <section className="dashboard__grid" style={{ marginBottom: '2rem' }}>
              <article className="dashboard-card revenue-modern" style={{ gridColumn: '1 / -1' }}>
                <div className="revenue-modern__header">
                  <div className="revenue-modern__header-content">
                    <div className="revenue-modern__icon-wrapper">
                      <FaChartLine className="revenue-modern__icon" />
                    </div>
                    <div>
                      <h2>Kazanç Hesaplama</h2>
                      <p className="revenue-modern__description">
                        Başarılı siparişlerden elde edilen ortalama kazanç hesaplaması
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="revenue-modern__content">
                  <div className="revenue-modern__grid">
                    <div className="revenue-modern__card revenue-modern__card--income">
                      <div className="revenue-modern__card-icon">
                        <FaDollarSign />
                      </div>
                      <div className="revenue-modern__card-content">
                        <div className="revenue-modern__card-label">Toplam Gelir</div>
                        <div className="revenue-modern__card-value">
                          {currencyFormatter.format(revenueData.totalRevenue)}
                        </div>
                        <div className="revenue-modern__card-meta">
                          {revenueData.totalOrders} başarılı sipariş
                        </div>
                      </div>
                    </div>
                    
                    <div className="revenue-modern__card revenue-modern__card--expense">
                      <div className="revenue-modern__card-icon revenue-modern__card-icon--red">
                        <FaCreditCard />
                      </div>
                      <div className="revenue-modern__card-content">
                        <div className="revenue-modern__card-label">İyzico Kesintisi</div>
                        <div className="revenue-modern__card-value revenue-modern__card-value--negative">
                          -{currencyFormatter.format(revenueData.iyzicoFee)}
                        </div>
                        <div className="revenue-modern__card-meta">
                          %{revenueData.iyzicoFeeRate.toFixed(2)} komisyon
                        </div>
                      </div>
                    </div>
                    
                    <div className="revenue-modern__card revenue-modern__card--expense">
                      <div className="revenue-modern__card-icon revenue-modern__card-icon--orange">
                        <FaTruck />
                      </div>
                      <div className="revenue-modern__card-content">
                        <div className="revenue-modern__card-label">Kargo Maliyeti</div>
                        <div className="revenue-modern__card-value revenue-modern__card-value--negative">
                          -{currencyFormatter.format(revenueData.totalShippingCost)}
                        </div>
                        <div className="revenue-modern__card-meta">
                          {currencyFormatter.format(revenueData.shippingCostPerOrder)} / sipariş
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="revenue-modern__result">
                    <div className="revenue-modern__result-icon">
                      <FaChartLine />
                    </div>
                    <div className="revenue-modern__result-content">
                      <div className="revenue-modern__result-label">Ortalama Kazanç</div>
                      <div className="revenue-modern__result-value">
                        {currencyFormatter.format(revenueData.netProfit)}
                      </div>
                      <div className="revenue-modern__result-note">
                        <FaInfoCircle className="revenue-modern__info-icon" />
                        <span>Tahmini hesaplama</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          )}

          <section className="dashboard__summary">
            {summaryCards.map((card) => (
              <article 
                key={card.id} 
                className={`summary-card summary-card--accent-${card.tone}`}
                onClick={() => {
                  if (onNavigate && card.navigateTo) {
                    onNavigate(card.navigateTo)
                  }
                }}
                style={{ 
                  cursor: onNavigate && card.navigateTo ? 'pointer' : 'default',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate && card.navigateTo) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate && card.navigateTo) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = ''
                  }
                }}
              >
                <header>
                  <span>{card.title}</span>
                </header>
                <strong>{card.value}</strong>
                <footer>{card.subtitle}</footer>
              </article>
            ))}
          </section>

          <section className="session-card">
            <header className="session-card__header">
              <div>
                <h2>Anlık Oturumlar</h2>
                <p>Misafir ve giriş yapmış kullanıcı oturumları gerçek zamanlı olarak takip ediliyor.</p>
              </div>
              <div className="session-card__total">
                <span>Toplam</span>
                <strong>{numberFormatter.format(stats.activeVisitorsNow)}</strong>
              </div>
            </header>
            <div className="session-card__grid">
              <div className="session-card__item">
                <span>Aktif Misafir</span>
                <strong>{numberFormatter.format(stats.activeGuestSessions)}</strong>
                <p>Kimlik doğrulaması yapmamış ziyaretçiler</p>
              </div>
              <div className="session-card__item">
                <span>Aktif Üye</span>
                <strong>{numberFormatter.format(stats.activeUserSessions)}</strong>
                <p>Panel ve mağaza için giriş yapmış müşteriler</p>
              </div>
              <div className="session-card__item">
                <span>Aktif Admin</span>
                <strong>{numberFormatter.format(stats.activeAdminSessions)}</strong>
                <p>Yönetici oturumları</p>
              </div>
              <div className="session-card__item">
                <span>Doğrulanmış Oturum</span>
                <strong>{numberFormatter.format(stats.activeAuthenticatedSessions)}</strong>
                <p>Son 5 dakikada token ile doğrulanmış kullanıcılar</p>
              </div>
              <div className="session-card__item">
                <span>Son 1 Saat Ziyaret</span>
                <strong>{numberFormatter.format(stats.activeVisitorsLastHour)}</strong>
                <p>Son 60 dakika içerisinde hareket eden oturumlar</p>
              </div>
              <div 
                className="session-card__item"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('guests')
                  }
                }}
                style={{ 
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = ''
                  }
                }}
              >
                <span>Kayıtlı Guest</span>
                <strong>{numberFormatter.format(stats.totalGuests)}</strong>
                <p>Guest hesabı oluşturmuş kullanıcılar</p>
              </div>
            </div>
            <footer className="session-card__footer">
              <div
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('users')
                  }
                }}
                style={{ 
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '0.8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '1'
                  }
                }}
              >
                <span>Toplam Üye</span>
                <strong>{numberFormatter.format(stats.totalUsers)}</strong>
              </div>
              <div
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('users')
                  }
                }}
                style={{ 
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '0.8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '1'
                  }
                }}
              >
                <span>Aktif Üye</span>
                <strong>{numberFormatter.format(stats.activeUsers)}</strong>
              </div>
              <div
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('users')
                  }
                }}
                style={{ 
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '0.8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '1'
                  }
                }}
              >
                <span>Yeni Üye (7 Gün)</span>
                <strong>{numberFormatter.format(stats.newUsersLast7Days)}</strong>
              </div>
              <div
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('users')
                  }
                }}
                style={{ 
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '0.8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.opacity = '1'
                  }
                }}
              >
                <span>Giriş (24 Saat)</span>
                <strong>{numberFormatter.format(stats.usersLoggedLast24Hours)}</strong>
              </div>
            </footer>
          </section>

          <section className="dashboard__grid dashboard__grid--insights">
            <article className="dashboard-card">
              <div className="dashboard-card__header">
                <h2>Üye ve İletişim Özeti</h2>
              </div>
              <div className="metric-grid">
                {userInsightMetrics.map((metric) => (
                  <div 
                    key={metric.label} 
                    className="metric-pill"
                    onClick={() => {
                      if (onNavigate && metric.navigateTo) {
                        onNavigate(metric.navigateTo)
                      }
                    }}
                    style={{ 
                      cursor: onNavigate && metric.navigateTo ? 'pointer' : 'default',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (onNavigate && metric.navigateTo) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (onNavigate && metric.navigateTo) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = ''
                      }
                    }}
                  >
                    <span className="metric-pill__label">{metric.label}</span>
                    <strong className="metric-pill__value">{metric.value}</strong>
                    <span className="metric-pill__hint">{metric.hint}</span>
                  </div>
                ))}
              </div>
            </article>

            <article 
              className="dashboard-card"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('reviews')
                }
              }}
              style={{ 
                cursor: onNavigate ? 'pointer' : 'default',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = ''
                }
              }}
            >
              <h2>Yorum Performansı</h2>
              <p className="dashboard-card__description">
                Ortalama puan: <strong>{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}</strong>
              </p>
              <div className="metric-progress">
                <div className="metric-progress__value">
                  <span>Toplam Yorum</span>
                  <strong>{numberFormatter.format(stats.totalReviews)}</strong>
                </div>
                <div className="metric-progress__bar metric-progress__bar--violet">
                  <span style={{ width: `${Math.min((stats.totalReviews / 200) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="metric-progress metric-progress--inline">
                <div>
                  <span>Aktif</span>
                  <strong>{numberFormatter.format(stats.activeReviews)}</strong>
                </div>
                <div>
                  <span>Bekleyen</span>
                  <strong>{numberFormatter.format(stats.pendingReviews)}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="dashboard__grid dashboard__grid--modern">
            <article 
              className="dashboard-card"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('products')
                }
              }}
              style={{ 
                cursor: onNavigate ? 'pointer' : 'default',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = ''
                }
              }}
            >
              <h2>Ürün Stoğu</h2>
              <div className="metric-progress">
                <div className="metric-progress__value">
                  <strong>{numberFormatter.format(stats.totalProducts)}</strong>
                  <span>aktif ürün</span>
                </div>
                <div className="metric-progress__bar">
                  <span style={{ width: `${Math.min((stats.totalProducts / 150) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="metric-progress">
                <div className="metric-progress__value">
                  <strong>{numberFormatter.format(stats.totalOrders)}</strong>
                  <span>toplam sipariş</span>
                </div>
                <div className="metric-progress__bar metric-progress__bar--emerald">
                  <span style={{ width: `${Math.min((stats.totalOrders / 80) * 100, 100)}%` }} />
                </div>
              </div>
            </article>

            <article 
              className="dashboard-card"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('reviews')
                }
              }}
              style={{ 
                cursor: onNavigate ? 'pointer' : 'default',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = ''
                }
              }}
            >
              <h2>Yorumlar</h2>
              {reviewsData.some((r) => r.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={reviewsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reviewsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="dashboard-card__empty">Yorum verisi bulunmuyor.</p>
              )}
              <div className="dashboard-card__meta">
                <div>
                  <span>Bekleyen Yorum</span>
                  <strong>{numberFormatter.format(stats.pendingReviews)}</strong>
                </div>
                <div>
                  <span>Aktif Yorum</span>
                  <strong>{numberFormatter.format(stats.activeReviews)}</strong>
                </div>
              </div>
            </article>

            <article 
              className="dashboard-card dashboard-card--wide"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('orders')
                }
              }}
              style={{ 
                cursor: onNavigate ? 'pointer' : 'default',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (onNavigate) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = ''
                }
              }}
            >
              <h2>Sipariş Durumları</h2>
              {ordersByStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={pieChartHeight}>
                  <PieChart>
                    <Pie
                      data={ordersByStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {ordersByStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="dashboard-card__empty">Sipariş verisi bulunmuyor.</p>
              )}
            </article>

            {ordersLast7DaysData.length > 0 && (
              <article 
                className="dashboard-card dashboard-card--wide"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('orders')
                  }
                }}
                style={{ 
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = ''
                  }
                }}
              >
                <h2>Son 7 Günlük Sipariş Trendi</h2>
                <ResponsiveContainer width="100%" height={trendChartHeight}>
                  <AreaChart data={ordersLast7DaysData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="sipariş" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </article>
            )}

            {ordersLast7DaysData.length > 0 && (
              <article 
                className="dashboard-card dashboard-card--wide"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('orders')
                  }
                }}
                style={{ 
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onNavigate) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = ''
                  }
                }}
              >
                <h2>Son 7 Günlük Sipariş (Bar)</h2>
                <ResponsiveContainer width="100%" height={trendBarChartHeight}>
                  <BarChart data={ordersLast7DaysData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sipariş" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            )}

            <article className="dashboard-card dashboard-card--wide">
              <h2>Ziyaretçi Eğilimleri</h2>
              <ResponsiveContainer width="100%" height={visitorChartHeight}>
                <LineChart
                  data={[
                    { name: 'Anlık', ziyaretçi: stats.activeVisitorsNow },
                    { name: 'Son 1 Saat', ziyaretçi: stats.activeVisitorsLastHour },
                    { name: 'Son 24 Saat Guest', ziyaretçi: stats.activeGuestsLast24Hours },
                    { name: 'Kayıtlı Guest', ziyaretçi: stats.totalGuests },
                    { name: 'Doğrulanmış Oturum', ziyaretçi: stats.activeAuthenticatedSessions },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ziyaretçi" stroke="#14b8a6" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </article>
          </section>
        </> 
      )}

      <style>{`
        /* Modern Revenue Styles */
        .revenue-modern {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .revenue-modern__header {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-bottom: 1px solid #e5e7eb;
          padding: 24px 30px;
        }

        .revenue-modern__header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .revenue-modern__icon-wrapper {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #000000 0%, #333333 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .revenue-modern__icon {
          font-size: 24px;
          color: #ffffff;
        }

        .revenue-modern__header h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          font-weight: 700;
          color: #000000;
        }

        .revenue-modern__description {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }

        .revenue-modern__content {
          padding: 30px;
        }

        .revenue-modern__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .revenue-modern__card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .revenue-modern__card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        .revenue-modern__card--income {
          border-left: 4px solid #10b981;
        }

        .revenue-modern__card--expense {
          border-left: 4px solid #ef4444;
        }

        .revenue-modern__card-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 20px;
          color: #ffffff;
        }

        .revenue-modern__card-icon--red {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .revenue-modern__card-icon--orange {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        }

        .revenue-modern__card-content {
          flex: 1;
          min-width: 0;
        }

        .revenue-modern__card-label {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .revenue-modern__card-value {
          font-size: 24px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .revenue-modern__card-value--negative {
          color: #ef4444;
        }

        .revenue-modern__card-meta {
          font-size: 12px;
          color: #9ca3af;
          line-height: 1.4;
        }

        .revenue-modern__result {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border: 2px solid #000000;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .revenue-modern__result-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #000000 0%, #333333 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 24px;
          color: #ffffff;
        }

        .revenue-modern__result-content {
          flex: 1;
        }

        .revenue-modern__result-label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .revenue-modern__result-value {
          font-size: 36px;
          font-weight: 800;
          color: #000000;
          margin-bottom: 8px;
          line-height: 1;
        }

        .revenue-modern__result-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #9ca3af;
          font-style: italic;
        }

        .revenue-modern__info-icon {
          font-size: 14px;
          color: #9ca3af;
        }

        @media (max-width: 768px) {
          .revenue-modern__header {
            padding: 20px;
          }

          .revenue-modern__header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .revenue-modern__content {
            padding: 20px;
          }

          .revenue-modern__grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .revenue-modern__result {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .revenue-modern__result-value {
            font-size: 28px;
          }
        }

        @media (max-width: 768px) {
          .revenue-stat-card__value {
            font-size: 28px;
          }

          .revenue-net__value {
            font-size: 24px;
          }

          .revenue-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .revenue-item__value {
            align-self: flex-end;
          }
        }
      `}</style>
    </main>
  )
}

export default HomePage


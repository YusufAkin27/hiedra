import { useEffect, useState, useRef, lazy, Suspense, useMemo, useCallback } from 'react'
import LoginPage from './pages/Login'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import { ToastContainer, useToast } from './components/Toast'
import { loadSession, saveSession, clearSession, type AuthResponse, getClientIpInfo } from './services/authService'
import SessionHeartbeat from './components/SessionHeartbeat'
import { ThemeProvider } from './context/ThemeContext'

// Lazy load tüm sayfalar - code splitting için
const HomePage = lazy(() => import('./pages/Home'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const SystemHealthPage = lazy(() => import('./pages/SystemHealth'))
const UsersPage = lazy(() => import('./pages/Users'))
const UserLogsPage = lazy(() => import('./pages/UserLogs'))
const OrdersPage = lazy(() => import('./pages/Orders'))
const ProductsPage = lazy(() => import('./pages/Products'))
const ShippingPage = lazy(() => import('./pages/Shipping'))
const MessagesPage = lazy(() => import('./pages/Messages'))
const BulkMailPage = lazy(() => import('./pages/BulkMail'))
const CartsPage = lazy(() => import('./pages/Carts'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetail'))
const ProductEditPage = lazy(() => import('./pages/ProductEdit'))
const ProductAddPage = lazy(() => import('./pages/ProductAdd'))
const ReviewsPage = lazy(() => import('./pages/Reviews'))
const ProductViewsPage = lazy(() => import('./pages/ProductViews'))
const GuestsPage = lazy(() => import('./pages/Guests'))
const VisitorsPage = lazy(() => import('./pages/Visitors'))
const AddressesPage = lazy(() => import('./pages/Addresses'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetail'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogs'))
const UserDetailPage = lazy(() => import('./pages/UserDetail'))
const CouponsPage = lazy(() => import('./pages/Coupons'))
const CookiePreferencesPage = lazy(() => import('./pages/CookiePreferences'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const UserAnalyticsPage = lazy(() => import('./pages/UserAnalytics'))
const ContractsPage = lazy(() => import('./pages/Contracts'))
const ContractAcceptancesPage = lazy(() => import('./pages/ContractAcceptances'))
const CategoriesPage = lazy(() => import('./pages/Categories'))
const AdminManagementPage = lazy(() => import('./pages/AdminManagement'))

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <p>Yükleniyor...</p>
  </div>
)

type Page =
  | 'home'
  | 'profile'
  | 'system'
  | 'users'
  | 'userDetail'
  | 'userLogs'
  | 'orders'
  | 'orderDetail'
  | 'products'
  | 'productDetail'
  | 'productEdit'
  | 'productAdd'
  | 'shipping'
  | 'messages'
  | 'bulkMail'
  | 'carts'
  | 'reviews'
  | 'productViews'
  | 'guests'
  | 'visitors'
  | 'addresses'
  | 'auditLogs'
  | 'coupons'
  | 'cookiePreferences'
  | 'settings'
  | 'userAnalytics'
  | 'contracts'
  | 'contractAcceptances'
  | 'categories'
  | 'adminManagement'

const NAVIGATION_STORAGE_KEY = 'admin_navigation_state'

type NavigationState = {
  currentPage: Page
  selectedProductId: number | null
  selectedOrderId: number | null
  selectedUserId: number | null
  selectedContractId: number | null
  isSidebarOpen: boolean
}

function loadNavigationState(): NavigationState | null {
  try {
    const saved = localStorage.getItem(NAVIGATION_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Navigation state yüklenemedi:', error)
  }
  return null
}

function saveNavigationState(state: NavigationState) {
  try {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Navigation state kaydedilemedi:', error)
  }
}

function App() {
  const [session, setSession] = useState<AuthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const hasCheckedRedirect = useRef(false)
  
  // Navigation state'i localStorage'dan yükle
  const savedNavState = loadNavigationState()
  const [currentPage, setCurrentPage] = useState<Page>(savedNavState?.currentPage || 'home')
  const [selectedProductId, setSelectedProductId] = useState<number | null>(savedNavState?.selectedProductId || null)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(savedNavState?.selectedOrderId || null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(savedNavState?.selectedUserId || null)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(savedNavState?.selectedContractId || null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(savedNavState?.isSidebarOpen ?? true)
  const toast = useToast()
  
  // Bildirim sayıları
  const [notificationCounts, setNotificationCounts] = useState<{
    messages?: number
    orders?: number
    reviews?: number
  }>({})
  
  // Tema ayarlarını backend'den yükle - TÜM HOOK'LAR KOŞULLARDAN ÖNCE OLMALI
  const [initialTheme, setInitialTheme] = useState<'light' | 'dark' | 'auto'>(
    (localStorage.getItem('admin-theme') as any) || 'light'
  )

  useEffect(() => {
    const initializeApp = async () => {
      // IP adresini al ve kaydet (tüm API çağrıları için)
      try {
        await getClientIpInfo()
      } catch (error) {
        console.warn('IP adresi alınamadı:', error)
      }
      
      const savedSession = loadSession()
      if (savedSession) {
        setSession(savedSession)
      }
      setIsLoading(false)
      setIsInitialized(true)
    }
    
    initializeApp()
  }, [])

  // İlk yüklemede detail sayfalarında ID yoksa yönlendir (sadece bir kez)
  useEffect(() => {
    if (!isInitialized || !session || hasCheckedRedirect.current) return

    // Sadece ilk yüklemede ve detail sayfalarında ID yoksa yönlendir
    let shouldRedirect = false
    let redirectPage: Page | null = null

    if ((currentPage === 'productDetail' || currentPage === 'productEdit') && !selectedProductId) {
      shouldRedirect = true
      redirectPage = 'products'
    } else if (currentPage === 'orderDetail' && !selectedOrderId) {
      shouldRedirect = true
      redirectPage = 'orders'
    } else if (currentPage === 'userDetail' && !selectedUserId) {
      shouldRedirect = true
      redirectPage = 'users'
    }

    if (shouldRedirect && redirectPage) {
      setCurrentPage(redirectPage)
      if (redirectPage === 'products') setSelectedProductId(null)
      if (redirectPage === 'orders') setSelectedOrderId(null)
      if (redirectPage === 'users') setSelectedUserId(null)
    }

    hasCheckedRedirect.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, session]) // Sadece ilk yüklemede çalış

  // Navigation state'i her değişiklikte kaydet (debounce ile)
  useEffect(() => {
    if (!session || !isInitialized) return
    
    const timeoutId = setTimeout(() => {
      saveNavigationState({
        currentPage,
        selectedProductId,
        selectedOrderId,
        selectedUserId,
        selectedContractId,
        isSidebarOpen,
      })
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [currentPage, selectedProductId, selectedOrderId, selectedUserId, selectedContractId, isSidebarOpen, session, isInitialized])

  // Tema ayarlarını backend'den yükle
  useEffect(() => {
    if (session) {
      const fetchTheme = async () => {
        try {
          const DEFAULT_API_URL = 'http://localhost:8080/api'
          const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
          const response = await fetch(`${apiBaseUrl}/admin/settings`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
          })
          if (response.ok) {
            const payload = await response.json()
            if (payload.data?.theme?.theme) {
              const backendTheme = payload.data.theme.theme as 'light' | 'dark' | 'auto'
              setInitialTheme(backendTheme)
              localStorage.setItem('admin-theme', backendTheme)
            }
          }
        } catch (err) {
          // Hata durumunda localStorage'dan yükle
        }
      }
      fetchTheme()
    }
  }, [session])

  // Bekleyen öğe sayılarını çek
  useEffect(() => {
    if (!session) {
      setNotificationCounts({})
      return
    }

    const fetchNotificationCounts = async (forceRefresh = false) => {
      try {
        const DEFAULT_API_URL = 'http://localhost:8080/api'
        const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
        
        // Cache service kullan
        const { cacheService } = await import('./services/cacheService')
        const cacheKey = `notification_counts_${session.user.id}`
        
        // Force refresh ise cache'i temizle
        if (forceRefresh) {
          cacheService.clear(cacheKey)
        }
        
        const result = await cacheService.fetch<{
          isSuccess?: boolean
          success?: boolean
          data?: {
            pendingMessages?: number
            pendingReviews?: number
            ordersByStatus?: Record<string, number>
          }
        }>(`${apiBaseUrl}/admin/dashboard/stats`, {
          cacheKey,
          cacheOptions: {
            ttl: 2 * 60 * 1000, // 2 dakika (bildirimler daha sık güncellenmeli)
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
          // Bekleyen mesajlar (yanıtlanmamış)
          const pendingMessages = payload.data.pendingMessages ?? 0
          
          // Bekleyen yorumlar (onay bekleyen)
          const pendingReviews = payload.data.pendingReviews ?? 0
          
          // Bekleyen siparişler (PROCESSING + REFUND_REQUESTED + PENDING)
          const ordersByStatus = payload.data.ordersByStatus ?? {}
          const pendingOrders = 
            (ordersByStatus['PROCESSING'] ?? 0) +
            (ordersByStatus['REFUND_REQUESTED'] ?? 0) +
            (ordersByStatus['PENDING'] ?? 0)

          setNotificationCounts({
            messages: pendingMessages > 0 ? pendingMessages : undefined,
            orders: pendingOrders > 0 ? pendingOrders : undefined,
            reviews: pendingReviews > 0 ? pendingReviews : undefined,
          })
        }
      } catch (err) {
        console.error('Bildirim sayıları yüklenemedi:', err)
      }
    }

    fetchNotificationCounts()
    // Cache kullanıldığı için interval'i 2 dakikaya çıkar
    const interval = setInterval(() => fetchNotificationCounts(false), 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [session])

  const handleLoginSuccess = useCallback((authResponse: AuthResponse) => {
    saveSession(authResponse)
    setSession(authResponse)
    // Login sonrası ana sayfaya git
    const navState: NavigationState = {
      currentPage: 'home',
      selectedProductId: null,
      selectedOrderId: null,
      selectedUserId: null,
      isSidebarOpen: true,
    }
    setCurrentPage('home')
    setSelectedProductId(null)
    setSelectedOrderId(null)
    setSelectedUserId(null)
    setIsSidebarOpen(true)
    saveNavigationState(navState)
  }, [])

  const handleLogout = useCallback(() => {
    clearSession()
    setSession(null)
    // Logout sonrası navigation state'i temizle
    localStorage.removeItem(NAVIGATION_STORAGE_KEY)
    setCurrentPage('home')
    setSelectedProductId(null)
    setSelectedOrderId(null)
    setSelectedUserId(null)
    setIsSidebarOpen(true)
  }, [])

  const handleNavigate = useCallback((page: Page, productId?: number, orderId?: number, userId?: number) => {
    setCurrentPage(page)
    setSelectedProductId(productId ?? null)
    setSelectedOrderId(orderId ?? null)
    setSelectedUserId(userId ?? null)
  }, [])

  // Sidebar için currentPage hesaplaması - hook'lar component üst seviyesinde olmalı
  const sidebarCurrentPage = useMemo(() => {
    if (currentPage === 'productDetail' || currentPage === 'productEdit' || currentPage === 'productAdd') {
      return 'products'
    }
    if (currentPage === 'orderDetail') {
      return 'orders'
    }
    if (currentPage === 'userDetail') {
      return 'users'
    }
    return currentPage
  }, [currentPage])

  // Sidebar toggle callback
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  if (isLoading) {
    return (
      <main className="page page--centered">
        <section className="login-card">
          <p>Yükleniyor...</p>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <ThemeProvider initialTheme={initialTheme}>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        user={session.user}
        currentPage={sidebarCurrentPage}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onToggle={handleSidebarToggle}
        notificationCounts={notificationCounts}
      />
      <div 
        className="main-content"
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          marginLeft: isSidebarOpen ? '280px' : '0', 
          transition: 'margin-left 0.3s ease',
          minWidth: 0
        }}
      >
        <Header
          user={session.user}
          onLogout={handleLogout}
          onSidebarToggle={handleSidebarToggle}
          accessToken={session.accessToken}
          onViewUser={(id: number) => handleNavigate('userDetail', undefined, undefined, id)}
          onNavigate={handleNavigate}
        />
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
        <SessionHeartbeat
          session={session}
          currentPage={currentPage}
          selectedProductId={selectedProductId}
          selectedOrderId={selectedOrderId}
          selectedUserId={selectedUserId}
        />
      <Suspense fallback={<PageLoader />}>
        {currentPage === 'home' && (
          <HomePage 
            session={session} 
            onLogout={handleLogout}
            onViewUser={(id: number) => handleNavigate('userDetail', undefined, undefined, id)}
            onNavigate={handleNavigate}
          />
        )}
        {currentPage === 'profile' && <ProfilePage session={session} toast={toast} onLogout={handleLogout} />}
        {currentPage === 'system' && <SystemHealthPage session={session} />}
        {currentPage === 'users' && (
          <UsersPage 
            session={session} 
            onViewUser={(id: number) => handleNavigate('userDetail', undefined, undefined, id)} 
          />
        )}
        {currentPage === 'userDetail' && selectedUserId && (
          <UserDetailPage
            session={session}
            userId={selectedUserId}
            onBack={() => handleNavigate('users')}
          />
        )}
        {currentPage === 'userLogs' && <UserLogsPage session={session} />}
        {currentPage === 'orders' && (
          <OrdersPage 
            session={session} 
          />
        )}
        {currentPage === 'orderDetail' && selectedOrderId && (
          <OrderDetailPage
            session={session}
            orderId={selectedOrderId}
            onBack={() => handleNavigate('orders')}
          />
        )}
        {currentPage === 'products' && (
          <ProductsPage
            session={session}
            toast={toast}
            onViewProduct={(id: number) => handleNavigate('productDetail', id)}
            onEditProduct={(id: number) => handleNavigate('productEdit', id)}
            onAddProduct={() => handleNavigate('productAdd')}
          />
        )}
        {currentPage === 'productDetail' && selectedProductId && (
          <ProductDetailPage
            session={session}
            productId={selectedProductId}
            onBack={() => handleNavigate('products')}
            onEdit={(id: number) => handleNavigate('productEdit', id)}
          />
        )}
        {currentPage === 'productEdit' && selectedProductId && (
          <ProductEditPage
            session={session}
            productId={selectedProductId}
            onBack={() => handleNavigate('products')}
            toast={toast}
          />
        )}
        {currentPage === 'productAdd' && (
          <ProductAddPage
            session={session}
            onBack={() => handleNavigate('products')}
            toast={toast}
          />
        )}
        {currentPage === 'shipping' && <ShippingPage session={session} />}
        {currentPage === 'messages' && <MessagesPage session={session} />}
        {currentPage === 'bulkMail' && <BulkMailPage session={session} />}
        {currentPage === 'carts' && <CartsPage session={session} />}
        {currentPage === 'reviews' && <ReviewsPage session={session} toast={toast} />}
        {currentPage === 'productViews' && <ProductViewsPage session={session} toast={toast} />}
        {currentPage === 'guests' && <GuestsPage session={session} toast={toast} />}
        {currentPage === 'visitors' && <VisitorsPage session={session} toast={toast} />}
        {currentPage === 'addresses' && <AddressesPage session={session} />}
        {currentPage === 'auditLogs' && <AuditLogsPage session={session} />}
        {currentPage === 'coupons' && <CouponsPage session={session} toast={toast} />}
        {currentPage === 'cookiePreferences' && <CookiePreferencesPage session={session} toast={toast} />}
        {currentPage === 'settings' && <SettingsPage session={session} toast={toast} />}
        {currentPage === 'userAnalytics' && <UserAnalyticsPage session={session} />}
        {currentPage === 'contracts' && (
          <ContractsPage
            session={session}
            toast={toast}
            onNavigateToAcceptances={(contractId: number) => {
              setSelectedContractId(contractId)
              setCurrentPage('contractAcceptances')
            }}
          />
        )}
        {currentPage === 'contractAcceptances' && (
          <ContractAcceptancesPage
            session={session}
            toast={toast}
            contractId={selectedContractId}
            onBack={() => {
              setSelectedContractId(null)
              setCurrentPage('contracts')
            }}
          />
        )}
        {currentPage === 'categories' && <CategoriesPage session={session} toast={toast} />}
        {currentPage === 'adminManagement' && <AdminManagementPage session={session} />}
      </Suspense>
          </div>
        </div>
      </ThemeProvider>
  )
    }
    
    export default App


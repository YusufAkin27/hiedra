import { useState } from 'react'
import { 
  FaChevronDown, 
  FaChevronRight, 
  FaBars, 
  FaTimes,
  FaHome,
  FaStore,
  FaShoppingBag,
  FaBox,
  FaTags,
  FaTicketAlt,
  FaComments,
  FaUsers,
  FaUser,
  FaChartLine,
  FaMapMarkerAlt,
  FaShoppingCart,
  FaEye,
  FaUserSecret,
  FaFileAlt,
  FaEllipsisH,
  FaTruck,
  FaEnvelope,
  FaChartBar,
  FaCog,
  FaServer,
  FaHistory,
  FaFileContract,
  FaCookie,
  FaUserCircle,
  FaUserShield,
  FaDollarSign,
  FaShieldAlt
} from 'react-icons/fa'
import type { AuthUser } from '../services/authService'
import type { AdminPage } from '../types/navigation'

type SidebarProps = {
  user: AuthUser
  currentPage: AdminPage
  onNavigate: (page: AdminPage) => void
  isOpen: boolean
  onToggle: () => void
  notificationCounts?: {
    messages?: number
    orders?: number
    reviews?: number
  }
}

function Sidebar({ user, currentPage, onNavigate, isOpen, onToggle, notificationCounts }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    users: false,
    products: false,
    system: false,
    operations: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const isActive = (page: AdminPage | AdminPage[]) => {
    if (Array.isArray(page)) {
      return page.includes(currentPage)
    }
    return currentPage === page
  }

  return (
    <>
      {/* Overlay - Sidebar açıkken arka planı karartır */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <div className="sidebar__brand" onClick={() => onNavigate('home')}>
            <img
              src="/photos/logo.png"
              alt="Hiedra Home"
              className="sidebar__logo"
              style={{ cursor: 'pointer' }}
            />
            <h1 className="sidebar__title">HIEDRA COLLECTION HOME</h1>
          </div>
          <button
            type="button"
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <nav className="sidebar__nav">
          {/* Ana Sayfa */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive('home') ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('home')
              if (!isOpen) onToggle()
            }}
          >
            <FaHome className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Ana Sayfa</span>
          </button>

          {/* Mağaza Önizleme */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive('storePreview') ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('storePreview')
              if (!isOpen) onToggle()
            }}
          >
            <FaStore className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Mağaza Önizlemesi</span>
          </button>

          {/* Siparişler - Doğrudan erişim */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive(['orders', 'orderDetail']) ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('orders')
              if (!isOpen) onToggle()
            }}
          >
            <FaShoppingBag className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Siparişler</span>
            {notificationCounts?.orders && notificationCounts.orders > 0 && (
              <span className="sidebar__nav-badge">{notificationCounts.orders > 99 ? '99+' : notificationCounts.orders}</span>
            )}
          </button>

          {/* Ödemeler - Doğrudan erişim */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive('payments') ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('payments')
              if (!isOpen) onToggle()
            }}
          >
            <FaDollarSign className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Ödemeler</span>
          </button>

          {/* Ürünler - Doğrudan erişim */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive(['products', 'productDetail', 'productEdit', 'productAdd']) ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('products')
              if (!isOpen) onToggle()
            }}
          >
            <FaBox className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Ürünler</span>
          </button>

          {/* Kategoriler - Doğrudan erişim */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive('categories') ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('categories')
              if (!isOpen) onToggle()
            }}
          >
            <FaTags className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Kategoriler</span>
          </button>

          {/* Kuponlar - Doğrudan erişim */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive('coupons') ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('coupons')
              if (!isOpen) onToggle()
            }}
          >
            <FaTicketAlt className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Kuponlar</span>
          </button>

          {/* Yorumlar - Doğrudan erişim */}
          <button
            type="button"
            className={`sidebar__nav-item ${isActive('reviews') ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => {
              onNavigate('reviews')
              if (!isOpen) onToggle()
            }}
          >
            <FaComments className="sidebar__nav-icon" />
            <span className="sidebar__nav-text">Yorumlar</span>
            {notificationCounts?.reviews && notificationCounts.reviews > 0 && (
              <span className="sidebar__nav-badge">{notificationCounts.reviews > 99 ? '99+' : notificationCounts.reviews}</span>
            )}
          </button>

          {/* Kullanıcılar Bölümü */}
          <div className="sidebar__nav-section">
            <button
              type="button"
              className={`sidebar__nav-item sidebar__nav-item--section ${isActive(['users', 'userLogs', 'addresses', 'carts', 'guests', 'visitors', 'userAnalytics']) ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => toggleSection('users')}
            >
              <FaUsers className="sidebar__nav-icon" />
              <span className="sidebar__nav-text">Kullanıcılar</span>
              <span className="sidebar__nav-arrow">
                {expandedSections.users ? <FaChevronDown /> : <FaChevronRight />}
              </span>
            </button>
            {expandedSections.users && (
              <div className="sidebar__nav-submenu">
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('users') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('users')}
                >
                  <FaUser className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Tüm Kullanıcılar
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('userAnalytics') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('userAnalytics')}
                >
                  <FaChartLine className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Analiz
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('addresses') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('addresses')}
                >
                  <FaMapMarkerAlt className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Adresler
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('carts') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('carts')}
                >
                  <FaShoppingCart className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Sepetler
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('visitors') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('visitors')}
                >
                  <FaEye className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Ziyaretçiler
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('guests') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('guests')}
                >
                  <FaUserSecret className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Misafirler
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('userLogs') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('userLogs')}
                >
                  <FaFileAlt className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  İşlem Kayıtları
                </button>
              </div>
            )}
          </div>

          {/* Diğer İşlemler */}
          <div className="sidebar__nav-section">
            <button
              type="button"
              className={`sidebar__nav-item sidebar__nav-item--section ${isActive(['shipping', 'messages', 'bulkMail', 'productViews']) ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => toggleSection('operations')}
            >
              <FaEllipsisH className="sidebar__nav-icon" />
              <span className="sidebar__nav-text">Diğer</span>
              <span className="sidebar__nav-arrow">
                {expandedSections.operations ? <FaChevronDown /> : <FaChevronRight />}
              </span>
            </button>
            {expandedSections.operations && (
              <div className="sidebar__nav-submenu">
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('shipping') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('shipping')}
                >
                  <FaTruck className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Kargo
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('messages') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('messages')}
                >
                  <FaEnvelope className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Mesajlar
                  {notificationCounts?.messages && notificationCounts.messages > 0 && (
                    <span className="sidebar__nav-badge sidebar__nav-badge--subitem">{notificationCounts.messages > 99 ? '99+' : notificationCounts.messages}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('bulkMail') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('bulkMail')}
                >
                  <FaEnvelope className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Toplu Mail
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('productViews') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('productViews')}
                >
                  <FaChartBar className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Görüntüleme İstatistikleri
                </button>
              </div>
            )}
          </div>

          {/* Sistem Ayarları */}
          <div className="sidebar__nav-section">
            <button
              type="button"
              className={`sidebar__nav-item sidebar__nav-item--section ${isActive(['system', 'auditLogs', 'cookiePreferences', 'settings', 'contracts', 'adminManagement']) ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => toggleSection('system')}
            >
              <FaCog className="sidebar__nav-icon" />
              <span className="sidebar__nav-text">Sistem</span>
              <span className="sidebar__nav-arrow">
                {expandedSections.system ? <FaChevronDown /> : <FaChevronRight />}
              </span>
            </button>
            {expandedSections.system && (
              <div className="sidebar__nav-submenu">
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('system') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('system')}
                >
                  <FaServer className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Durum
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('auditLogs') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('auditLogs')}
                >
                  <FaHistory className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Denetim Kayıtları
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('contracts') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('contracts')}
                >
                  <FaFileContract className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Sözleşmeler
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('cookiePreferences') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('cookiePreferences')}
                >
                  <FaCookie className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Çerezler
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('adminManagement') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('adminManagement')}
                >
                  <FaUserShield className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  Admin Yönetimi
                </button>
                <button
                  type="button"
                  className={`sidebar__nav-subitem ${isActive('ipAccess') ? 'sidebar__nav-subitem--active' : ''}`}
                  onClick={() => onNavigate('ipAccess')}
                >
                  <FaShieldAlt className="sidebar__nav-icon sidebar__nav-icon--sub" />
                  IP Erişim Kontrolü
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Kullanıcı Bilgisi */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-email">{user.email}</div>
              <button
                type="button"
                className="sidebar__user-profile"
                onClick={() => {
                  onNavigate('profile')
                  if (!isOpen) onToggle()
                }}
              >
                <FaUserCircle className="sidebar__nav-icon" />
                Profil
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar


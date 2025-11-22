export type AdminPage =
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
  | 'couponAdd'
  | 'cookiePreferences'
  | 'settings'
  | 'userAnalytics'
  | 'contracts'
  | 'contractAcceptances'
  | 'categories'
  | 'adminManagement'
  | 'payments'
  | 'ipAccess'
  | 'storePreview'

export type AdminNavigationState = {
  currentPage: AdminPage
  selectedProductId: number | null
  selectedOrderId: number | null
  selectedUserId: number | null
  selectedContractId: number | null
  isSidebarOpen: boolean
}


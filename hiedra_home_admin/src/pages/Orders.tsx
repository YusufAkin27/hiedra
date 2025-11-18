import { useEffect, useState, useCallback, useRef } from 'react'
import { FaBox, FaChartBar, FaCheckCircle, FaTable, FaCalendar, FaDollarSign, FaCog, FaExclamationTriangle, FaEdit, FaSync, FaUser, FaEnvelope, FaPrint } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { getAdminHeaders } from '../services/authService'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

type OrdersPageProps = {
  session: AuthResponse
}

type InvoiceOrderItem = {
  id: number
  productName: string
  quantity: number
  price?: number
  unitPrice?: number
  totalPrice?: number
  width?: number
  height?: number
  pleatType?: string
}

type Order = {
  id: number
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  totalAmount: number
  status: string
  createdAt: string
  adminNotes?: string
  paymentTransactionId?: string
  orderItems?: InvoiceOrderItem[]
}

type PaginatedResponse = {
  content: Order[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

type TabType = 'all' | 'paid' | 'shipped' | 'refund-requests' | 'processing' | 'delivered' | 'cancelled' | 'refunded'
type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function OrdersPage({ session }: OrdersPageProps) {
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState({
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
    pageSize: 20,
    hasNext: false,
    hasPrevious: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [isRefundApprovalModalOpen, setIsRefundApprovalModalOpen] = useState(false)
  const [isRefundRejectionModalOpen, setIsRefundRejectionModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    adminNotes: '',
  })
  const [statusForm, setStatusForm] = useState({
    status: '',
    adminNotes: '',
  })
  const [approvalForm, setApprovalForm] = useState({
    adminNotes: '',
  })
  const [refundApprovalForm, setRefundApprovalForm] = useState({
    adminNotes: '',
  })
  const [refundRejectionForm, setRefundRejectionForm] = useState({
    reason: '',
    adminNotes: '',
  })
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoiceOrderDetail, setInvoiceOrderDetail] = useState<Order | null>(null)
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  })
  const invoiceRef = useRef<HTMLDivElement>(null)
  const formatCurrency = (value: number) =>
    value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  const INVOICE_TAX_RATE = 0.2
  const invoiceSource = invoiceOrderDetail ?? selectedOrder
  const invoiceAmounts = invoiceSource
    ? {
        subtotal: invoiceSource.totalAmount,
        taxAmount: invoiceSource.totalAmount * INVOICE_TAX_RATE,
        total: invoiceSource.totalAmount * (1 + INVOICE_TAX_RATE),
      }
    : null
  const invoiceItems: InvoiceOrderItem[] = invoiceOrderDetail?.orderItems ?? []
  const invoiceTableItems: InvoiceOrderItem[] =
    invoiceItems.length > 0
      ? invoiceItems
      : invoiceSource
        ? [
            {
              id: invoiceSource.id,
              productName: `Sipariş ${invoiceSource.orderNumber}`,
              quantity: 1,
              price: invoiceSource.totalAmount,
            },
          ]
        : []
  const getItemLineTotal = (item: InvoiceOrderItem) => {
    if (typeof item.totalPrice === 'number') return item.totalPrice
    if (typeof item.price === 'number') return item.price
    if (typeof item.unitPrice === 'number' && item.quantity) {
      return item.unitPrice * item.quantity
    }
    return 0
  }
  const getItemUnitPrice = (item: InvoiceOrderItem) => {
    if (typeof item.unitPrice === 'number') return item.unitPrice
    const lineTotal = getItemLineTotal(item)
    if (item.quantity && item.quantity > 0) {
      return lineTotal / item.quantity
    }
    return lineTotal
  }
  const getItemMeasurement = (item: InvoiceOrderItem) => {
    if (item.width && item.height) {
      const pleatText = item.pleatType ? ` · Pile ${item.pleatType}` : ''
      return `${item.width}cm x ${item.height}cm${pleatText}`
    }
    if (item.pleatType) {
      return `Pile ${item.pleatType}`
    }
    return null
  }
  const invoiceTaxPercent = Math.round(INVOICE_TAX_RATE * 100)

  const getStatusFromTab = (tab: TabType): string | null => {
    switch (tab) {
      case 'paid':
        return 'PAID'
      case 'shipped':
        return 'SHIPPED'
      case 'refund-requests':
        return 'REFUND_REQUESTED'
      case 'processing':
        return 'PROCESSING'
      case 'delivered':
        return 'DELIVERED'
      case 'cancelled':
        return 'CANCELLED'
      case 'refunded':
        return 'REFUNDED'
      case 'all':
      default:
        return null
    }
  }

  const fetchOrders = useCallback(async (page: number = 0, size: number = 20) => {
    if (!session?.accessToken) {
      setError('Oturum bulunamadı.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const status = getStatusFromTab(activeTab)
      const url = new URL(`${apiBaseUrl}/admin/orders`)
      url.searchParams.append('page', page.toString())
      url.searchParams.append('size', size.toString())
      if (status) {
        url.searchParams.append('status', status)
      }

      const response = await fetch(url.toString(), {
        headers: getAdminHeaders(session.accessToken),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`Siparişler yüklenemedi. (${response.status})`)
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: PaginatedResponse
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Siparişler yüklenemedi.')
      }

      setOrders(payload.data.content)
      setPagination({
        totalElements: payload.data.totalElements,
        totalPages: payload.data.totalPages,
        currentPage: payload.data.currentPage,
        pageSize: payload.data.pageSize,
        hasNext: payload.data.hasNext,
        hasPrevious: payload.data.hasPrevious,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      console.error('Fetch orders error:', err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken, apiBaseUrl, activeTab])

  useEffect(() => {
    if (session?.accessToken) {
      setCurrentPage(0) // Tab değiştiğinde ilk sayfaya dön
    } else {
      setIsLoading(false)
      setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
    }
  }, [session?.accessToken, activeTab, pageSize])

  // Sayfa veya tab değiştiğinde veri çek
  useEffect(() => {
    if (session?.accessToken && currentPage >= 0) {
      fetchOrders(currentPage, pageSize)
    }
  }, [currentPage, pageSize, activeTab, session?.accessToken])

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    setEditForm({
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      adminNotes: order.adminNotes || '',
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        throw new Error('Sipariş güncellenemedi.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'Sipariş güncellenemedi.')
      }

      toast.success('Sipariş başarıyla güncellendi!')
      setIsEditModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sipariş güncellenemedi.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order)
    setStatusForm({
      status: order.status,
      adminNotes: '',
    })
    setIsStatusModalOpen(true)
  }

  const handleSubmitStatusUpdate = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(statusForm),
      })

      if (!response.ok) {
        throw new Error('Sipariş durumu güncellenemedi.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'Sipariş durumu güncellenemedi.')
      }

      toast.success('Sipariş durumu başarıyla güncellendi! Müşteriye mail gönderildi.')
      setIsStatusModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sipariş durumu güncellenemedi.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveCancelled = (order: Order) => {
    if (order.status !== 'CANCELLED') {
      toast.warning('Sadece iptal edilmiş siparişler onaylanabilir.')
      return
    }
    setSelectedOrder(order)
    setApprovalForm({ adminNotes: '' })
    setIsApprovalModalOpen(true)
  }

  const handleApproveRefund = (order: Order) => {
    if (order.status !== 'REFUND_REQUESTED') {
      toast.warning('Sadece iade talebi bekleyen siparişler onaylanabilir.')
      return
    }
    setSelectedOrder(order)
    setRefundApprovalForm({ adminNotes: '' })
    setIsRefundApprovalModalOpen(true)
  }

  const handleRejectRefund = (order: Order) => {
    if (order.status !== 'REFUND_REQUESTED') {
      toast.warning('Sadece iade talebi bekleyen siparişler reddedilebilir.')
      return
    }
    setSelectedOrder(order)
    setRefundRejectionForm({ reason: '', adminNotes: '' })
    setIsRefundRejectionModalOpen(true)
  }

  const loadInvoiceDetails = useCallback(
    async (orderId: number) => {
      if (!session?.accessToken) {
        setInvoiceError('Oturum bulunamadı.')
        return
      }
      try {
        setIsInvoiceLoading(true)
        setInvoiceError(null)
        const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}`, {
          headers: getAdminHeaders(session.accessToken),
        })

        if (!response.ok) {
          throw new Error('Fatura verileri alınamadı.')
        }

        const payload = (await response.json()) as {
          data?: Order
          success?: boolean
          isSuccess?: boolean
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false
        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Fatura verileri alınamadı.')
        }

        setInvoiceOrderDetail(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fatura verileri alınamadı.'
        setInvoiceError(message)
      } finally {
        setIsInvoiceLoading(false)
      }
    },
    [session?.accessToken, apiBaseUrl]
  )

  const handleOpenInvoice = (order: Order) => {
    setSelectedOrder(order)
    setInvoiceNotes('')
    setInvoiceOrderDetail(null)
    setInvoiceError(null)
    setIsInvoiceModalOpen(true)
    loadInvoiceDetails(order.id)
  }

  const handlePrintInvoice = () => {
    if (isInvoiceLoading) {
      toast.info('Fatura hazırlanıyor, lütfen bekleyin.')
      return
    }

    if (invoiceError) {
      toast.error('Fatura verileri yüklenemedi. Tekrar deneyin.')
      return
    }

    if (!invoiceRef.current || !invoiceSource) {
      toast.warning('Fatura içeriği oluşturulamadı.')
      return
    }

    const printWindow = window.open('', 'PRINT', 'height=900,width=700')
    if (!printWindow) {
      toast.error('Yazdırma penceresi açılamadı. Pop-up engellemesini kontrol edin.')
      return
    }

    printWindow.document.write(`<!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>Fatura ${selectedOrder.orderNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Inter', 'Segoe UI', sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #f3f4f8; }
            h1, h2, h3, h4, h5 { margin: 0; }
            .invoice-layout { max-width: 900px; margin: 0 auto; border-radius: 24px; overflow: hidden; background: #ffffff; box-shadow: 0 35px 70px rgba(15, 23, 42, 0.08); border: 1px solid #e5e7eb; }
            .invoice-brand { max-width: 60%; }
            .invoice-hero { background: #f7f7f7; color: #111827; padding: 34px 40px; display: flex; justify-content: space-between; gap: 32px; align-items: flex-start; border-bottom: 1px solid #e5e7eb; }
            .invoice-logo { font-size: 30px; letter-spacing: 0.18em; font-weight: 700; }
            .invoice-tagline { margin-top: 6px; font-weight: 500; color: #4b5563; }
            .invoice-address { margin-top: 14px; font-size: 14px; line-height: 1.6; color: #6b7280; }
            .invoice-meta { text-align: right; display: grid; gap: 12px; font-size: 15px; color: #111827; }
            .invoice-meta__label { text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; color: #6b7280; }
            .invoice-meta__value { font-size: 20px; font-weight: 700; }
            .invoice-body { padding: 34px 40px; background: #ffffff; }
            .invoice-info { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
            .invoice-card { flex: 1; min-width: 280px; background: #fff; border-radius: 16px; padding: 20px 24px; border: 1px solid #e5e7eb; }
            .invoice-card__label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 10px; font-weight: 600; }
            .invoice-card h4 { font-size: 18px; margin-bottom: 6px; color: #111827; }
            .invoice-card p { margin: 0; line-height: 1.5; font-size: 14px; color: #4b5563; }
            .invoice-table-wrapper { border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
            .invoice-table { width: 100%; border-collapse: collapse; }
            .invoice-table thead { background: #f9fafb; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; color: #6b7280; }
            .invoice-table th { padding: 14px 18px; text-align: left; }
            .invoice-table td { padding: 16px 18px; border-top: 1px solid #e5e7eb; font-size: 15px; color: #0f172a; }
            .invoice-summary { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 30px; }
            .invoice-notes { flex: 1; min-width: 260px; background: #f9fafb; border-radius: 16px; padding: 20px 24px; border: 1px solid #e5e7eb; font-size: 14px; line-height: 1.6; color: #475467; }
            .invoice-totals { min-width: 260px; flex: 0 0 auto; border-radius: 16px; border: 1px solid #e5e7eb; padding: 20px 28px; background: #fff; }
            .invoice-totals__row { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 12px; }
            .invoice-totals__row--grand { font-size: 20px; font-weight: 700; margin-top: 8px; }
            .invoice-footer { margin-top: 32px; padding-top: 24px; border-top: 1px dashed #cbd5f5; display: flex; flex-wrap: wrap; gap: 24px; align-items: center; justify-content: space-between; font-size: 14px; color: #4b5563; }
            .invoice-thanks { font-weight: 600; color: #111827; }
            .invoice-disclaimer { margin-top: 24px; text-align: center; font-size: 12px; color: #6b7280; }
            @media print {
              body { padding: 0; background: #fff; }
              .invoice-layout { box-shadow: none; border-radius: 0; }
            }
          </style>
        </head>
        <body>${invoiceRef.current.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const handleSubmitApproval = async () => {
    if (!selectedOrder) return

    setConfirmModal({
      isOpen: true,
      message: 'İptal edilen siparişi onaylayacak ve para iadesi yapacaksınız. Devam etmek istiyor musunuz?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        await executeApproval()
      },
    })
  }

  const executeApproval = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/approve-cancelled`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(approvalForm),
      })

      if (!response.ok) {
        throw new Error('Sipariş onaylanamadı.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'Sipariş onaylanamadı.')
      }

      toast.success('Sipariş onaylandı ve para iadesi yapıldı! Müşteriye mail gönderildi.')
      setIsApprovalModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sipariş onaylanamadı.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRefundApproval = async () => {
    if (!selectedOrder) return

    setConfirmModal({
      isOpen: true,
      message: 'İade talebini onaylayacak ve para iadesi yapacaksınız (iyzico ile). Devam etmek istiyor musunuz?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        await executeRefundApproval()
      },
    })
  }

  const executeRefundApproval = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/approve-refund`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(refundApprovalForm),
      })

      if (!response.ok) {
        throw new Error('İade talebi onaylanamadı.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'İade talebi onaylanamadı.')
      }

      toast.success('İade talebi onaylandı ve para iadesi yapıldı! Müşteriye mail gönderildi.')
      setIsRefundApprovalModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İade talebi onaylanamadı.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRefundRejection = async () => {
    if (!selectedOrder) return

    if (!refundRejectionForm.reason || refundRejectionForm.reason.trim() === '') {
      toast.warning('Lütfen red nedeni giriniz.')
      return
    }

    setConfirmModal({
      isOpen: true,
      message: 'İade talebini reddedeceksiniz. Devam etmek istiyor musunuz?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })
        await executeRefundRejection()
      },
    })
  }

  const executeRefundRejection = async () => {
    if (!selectedOrder) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`${apiBaseUrl}/admin/orders/${selectedOrder.id}/reject-refund`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify(refundRejectionForm),
      })

      if (!response.ok) {
        throw new Error('İade talebi reddedilemedi.')
      }

      const payload = await response.json()
      if (!payload.success && !payload.isSuccess) {
        throw new Error(payload.message ?? 'İade talebi reddedilemedi.')
      }

      toast.success('İade talebi reddedildi! Müşteriye mail gönderildi.')
      setIsRefundRejectionModalOpen(false)
      fetchOrders(currentPage, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İade talebi reddedilemedi.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'dashboard-card__chip--success'
      case 'CANCELLED':
      case 'REFUNDED':
        return 'dashboard-card__chip--error'
      case 'PROCESSING':
      case 'SHIPPED':
        return 'dashboard-card__chip--warning'
      case 'REFUND_REQUESTED':
        return 'dashboard-card__chip--warning'
      case 'PAID':
        return 'dashboard-card__chip--info'
      default:
        return ''
    }
  }

  const getTabCount = (tab: TabType): number => {
    // Sayfalama kullanıldığı için toplam sayıyı pagination'dan al
    if (tab === activeTab) {
      return pagination.totalElements
    }
    // Diğer sekmeler için şimdilik 0 göster (isteğe bağlı olarak ayrı API çağrısı yapılabilir)
    return 0
  }

  // Filtreleme
  const filteredOrders = orders.filter((order) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.customerEmail.toLowerCase().includes(search) ||
        order.customerPhone.includes(search) ||
        order.totalAmount.toString().includes(search) ||
        getStatusDisplayName(order.status).toLowerCase().includes(search)
      )
    }
    return true
  })

  // İstatistikler
  const stats = {
    total: pagination.totalElements,
    totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    averageAmount: orders.length > 0 ? (orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length).toFixed(2) : '0',
    paid: orders.filter((o) => o.status === 'PAID').length,
    processing: orders.filter((o) => o.status === 'PROCESSING').length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    refundRequests: orders.filter((o) => o.status === 'REFUND_REQUESTED').length,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(0)
  }

  if (!session) {
    return (
      <main className="page dashboard">
        <p className="dashboard-card__feedback dashboard-card__feedback--error">
          Oturum bulunamadı. Lütfen tekrar giriş yapın.
        </p>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Yükleniyor...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page dashboard">
        <section className="dashboard__hero">
          <div className="dashboard__hero-text">
            <p className="dashboard__eyebrow">Hata</p>
            <h1>Siparişler Yüklenemedi</h1>
          </div>
        </section>
        <section className="dashboard__grid">
          <article className="dashboard-card">
            <p className="dashboard-card__feedback dashboard-card__feedback--error">{error}</p>
            <button
              onClick={() => {
                setError(null)
                fetchOrders(currentPage, pageSize)
              }}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Tekrar Dene
            </button>
          </article>
        </section>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">Sipariş Yönetimi</p>
          <h1>Siparişler</h1>
          <p>Tüm siparişleri görüntüleyin ve yönetin.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid orders-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="orders-stats__title">Genel İstatistikler</h3>
          <div className="orders-stats__grid">
            <div className="orders-stat-card orders-stat-card--primary">
              <div className="orders-stat-card__icon"><FaBox /></div>
              <div className="orders-stat-card__value">{stats.total}</div>
              <div className="orders-stat-card__label">Toplam Sipariş</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--success">
              <div className="orders-stat-card__icon"><FaDollarSign /></div>
              <div className="orders-stat-card__value">{stats.totalAmount.toFixed(2)} ₺</div>
              <div className="orders-stat-card__label">Toplam Tutar</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--info">
              <div className="orders-stat-card__icon"><FaChartBar /></div>
              <div className="orders-stat-card__value">{stats.averageAmount} ₺</div>
              <div className="orders-stat-card__label">Ortalama Tutar</div>
              <div className="orders-stat-card__subtitle">Sipariş başına</div>
            </div>
            <div className="orders-stat-card orders-stat-card--success">
              <div className="orders-stat-card__icon"><FaCheckCircle /></div>
              <div className="orders-stat-card__value">{stats.paid}</div>
              <div className="orders-stat-card__label">Ödendi</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--warning">
              <div className="orders-stat-card__icon"><FaCog /></div>
              <div className="orders-stat-card__value">{stats.processing}</div>
              <div className="orders-stat-card__label">İşleme Alındı</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--info">
              <div className="orders-stat-card__icon">🚚</div>
              <div className="orders-stat-card__value">{stats.shipped}</div>
              <div className="orders-stat-card__label">Kargoya Verildi</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--success">
              <div className="orders-stat-card__icon">📬</div>
              <div className="orders-stat-card__value">{stats.delivered}</div>
              <div className="orders-stat-card__label">Teslim Edildi</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
            <div className="orders-stat-card orders-stat-card--danger">
              <div className="orders-stat-card__icon"><FaExclamationTriangle /></div>
              <div className="orders-stat-card__value">{stats.refundRequests}</div>
              <div className="orders-stat-card__label">İade Talepleri</div>
              <div className="orders-stat-card__subtitle">Aktif sekme</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="orders-filters">
            <div className="orders-filters__row">
              <div className="orders-filters__search">
                <input
                  type="text"
                  className="orders-filters__input"
                  placeholder="Sipariş ara (sipariş no, müşteri, e-posta, telefon, tutar...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(0)
                  }}
                />
              </div>
              <div className="orders-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary orders-view-toggle orders-view-toggle--desktop"
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
                      setCurrentPage(0)
                    }}
                  >
                    ✕ Temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sekmeler */}
          <div className="orders-tabs">
            <button
              className={`orders-tab ${activeTab === 'all' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tümü <span className="orders-tab__count">({getTabCount('all')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'paid' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('paid')}
            >
              Ödendi <span className="orders-tab__count">({getTabCount('paid')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'processing' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('processing')}
            >
              İşleme Alındı <span className="orders-tab__count">({getTabCount('processing')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'shipped' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('shipped')}
            >
              Kargoya Verildi <span className="orders-tab__count">({getTabCount('shipped')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'delivered' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('delivered')}
            >
              Teslim Edildi <span className="orders-tab__count">({getTabCount('delivered')})</span>
            </button>
            <button
              className={`orders-tab orders-tab--warning ${activeTab === 'refund-requests' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('refund-requests')}
            >
              İade Talepleri <span className="orders-tab__count orders-tab__count--warning">({getTabCount('refund-requests')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'cancelled' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('cancelled')}
            >
              İptal Edildi <span className="orders-tab__count">({getTabCount('cancelled')})</span>
            </button>
            <button
              className={`orders-tab ${activeTab === 'refunded' ? 'orders-tab--active' : ''}`}
              onClick={() => setActiveTab('refunded')}
            >
              İade Yapıldı <span className="orders-tab__count">({getTabCount('refunded')})</span>
            </button>
          </div>

          {/* Header */}
          <div className="orders-header">
            <div className="orders-header__info">
              <span className="orders-header__count">
                Toplam: <strong>{filteredOrders.length}</strong> sipariş
              </span>
              {filteredOrders.length !== orders.length && (
                <span className="orders-header__filtered">
                  (Filtrelenmiş: {filteredOrders.length} / {orders.length})
                </span>
              )}
            </div>
            <div className="orders-header__pagination">
              Sayfa {pagination.currentPage + 1} / {pagination.totalPages || 1}
            </div>
          </div>

          {/* Sipariş Listesi */}
          {filteredOrders.length === 0 ? (
            <div className="orders-empty">
              <p>Bu kategoride henüz sipariş bulunmuyor.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table orders-table-desktop ${viewMode === 'table' ? '' : 'orders-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Sipariş No</th>
                      <th>Müşteri</th>
                      <th>E-posta</th>
                      <th>Telefon</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <div className="orders-table__number">{order.orderNumber}</div>
                        </td>
                        <td>
                          <div className="orders-table__customer">{order.customerName}</div>
                        </td>
                        <td>
                          <div className="orders-table__email">{order.customerEmail}</div>
                        </td>
                        <td>
                          <div className="orders-table__phone">{order.customerPhone}</div>
                        </td>
                        <td>
                          <div className="orders-table__amount">{order.totalAmount.toFixed(2)} ₺</div>
                        </td>
                        <td>
                          <span className={`dashboard-card__chip ${getStatusColor(order.status)}`}>
                            {getStatusDisplayName(order.status)}
                          </span>
                        </td>
                        <td>
                          <div className="orders-table__date">
                            {new Date(order.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="orders-table__actions">
                            <button
                              className="orders-table__btn orders-table__btn--primary"
                              onClick={() => handleEditOrder(order)}
                              title="Düzenle"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="orders-table__btn orders-table__btn--secondary"
                              onClick={() => handleUpdateStatus(order)}
                              title="Durum"
                            >
                              <FaSync />
                            </button>
                            <button
                              className="orders-table__btn orders-table__btn--info"
                              onClick={() => handleOpenInvoice(order)}
                              title="Faturalandır & Yazdır"
                            >
                              <FaPrint />
                            </button>
                            {order.status === 'CANCELLED' && (
                              <button
                                className="orders-table__btn orders-table__btn--success"
                                onClick={() => handleApproveCancelled(order)}
                                title="Onayla & İade"
                              >
                                <FaCheckCircle />
                              </button>
                            )}
                            {order.status === 'REFUND_REQUESTED' && (
                              <>
                                <button
                                  className="orders-table__btn orders-table__btn--success"
                                  onClick={() => handleApproveRefund(order)}
                                  title="İadeyi Onayla"
                                >
                                  ✓
                                </button>
                                <button
                                  className="orders-table__btn orders-table__btn--danger"
                                  onClick={() => handleRejectRefund(order)}
                                  title="İadeyi Reddet"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`orders-cards ${viewMode === 'cards' ? '' : 'orders-cards--hidden'}`}>
                {filteredOrders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-card__header">
                      <div className="order-card__info">
                        <h3 className="order-card__number">{order.orderNumber}</h3>
                        <span className={`dashboard-card__chip ${getStatusColor(order.status)}`}>
                          {getStatusDisplayName(order.status)}
                        </span>
                      </div>
                      <div className="order-card__amount">{order.totalAmount.toFixed(2)} ₺</div>
                    </div>
                    <div className="order-card__body">
                      <div className="order-card__customer">
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon"><FaUser /></div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">Müşteri</div>
                            <div className="order-card__customer-value">{order.customerName}</div>
                          </div>
                        </div>
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon"><FaEnvelope /></div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">E-posta</div>
                            <div className="order-card__customer-value">{order.customerEmail}</div>
                          </div>
                        </div>
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon">📞</div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">Telefon</div>
                            <div className="order-card__customer-value">{order.customerPhone}</div>
                          </div>
                        </div>
                        <div className="order-card__customer-row">
                          <div className="order-card__customer-icon"><FaCalendar /></div>
                          <div className="order-card__customer-content">
                            <div className="order-card__customer-label">Tarih</div>
                            <div className="order-card__customer-value">
                              {new Date(order.createdAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="order-card__actions">
                      <button
                        className="order-card__btn order-card__btn--primary"
                        onClick={() => handleEditOrder(order)}
                      >
                        <FaEdit style={{ marginRight: '0.25rem' }} /> Düzenle
                      </button>
                      <button
                        className="order-card__btn order-card__btn--secondary"
                        onClick={() => handleUpdateStatus(order)}
                      >
                        <FaSync style={{ marginRight: '0.25rem' }} /> Durum
                      </button>
                      <button
                        className="order-card__btn order-card__btn--info"
                        onClick={() => handleOpenInvoice(order)}
                      >
                        <FaPrint style={{ marginRight: '0.25rem' }} /> Faturalandır
                      </button>
                      {order.status === 'CANCELLED' && (
                        <button
                          className="order-card__btn order-card__btn--success"
                          onClick={() => handleApproveCancelled(order)}
                        >
                          <FaCheckCircle style={{ marginRight: '0.25rem' }} /> Onayla & İade
                        </button>
                      )}
                      {order.status === 'REFUND_REQUESTED' && (
                        <>
                          <button
                            className="order-card__btn order-card__btn--success"
                            onClick={() => handleApproveRefund(order)}
                          >
                            ✓ İadeyi Onayla
                          </button>
                          <button
                            className="order-card__btn order-card__btn--danger"
                            onClick={() => handleRejectRefund(order)}
                          >
                            ✕ İadeyi Reddet
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sayfalama Kontrolleri */}
          {pagination.totalPages > 0 && (
            <div className="orders-pagination">
              <div className="orders-pagination__info">
                <span>
                  Toplam {pagination.totalElements} sipariş, Sayfa {pagination.currentPage + 1} / {pagination.totalPages}
                </span>
                <div className="orders-pagination__size">
                  <label>Sayfa başına:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
              <div className="orders-pagination__controls">
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(0)}
                  disabled={!pagination.hasPrevious}
                >
                  İlk
                </button>
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevious}
                >
                  Önceki
                </button>
                <div className="orders-pagination__numbers">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i
                    } else if (pagination.currentPage < 3) {
                      pageNum = i
                    } else if (pagination.currentPage > pagination.totalPages - 4) {
                      pageNum = pagination.totalPages - 5 + i
                    } else {
                      pageNum = pagination.currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`orders-pagination__btn ${pagination.currentPage === pageNum ? 'orders-pagination__btn--active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                </div>
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                >
                  Sonraki
                </button>
                <button
                  className="orders-pagination__btn"
                  onClick={() => handlePageChange(pagination.totalPages - 1)}
                  disabled={!pagination.hasNext}
                >
                  Son
                </button>
              </div>
            </div>
          )}
        </article>
      </section>

      {/* Düzenleme Modal */}
      {isEditModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Sipariş Düzenle: {selectedOrder.orderNumber}</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Müşteri Adı:</label>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>E-posta:</label>
                <input
                  type="email"
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Telefon:</label>
                <input
                  type="text"
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={editForm.adminNotes}
                  onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsEditModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--primary" onClick={handleUpdateOrder} disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Durum Güncelleme Modal */}
      {isStatusModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsStatusModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Durum Güncelle: {selectedOrder.orderNumber}</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Yeni Durum:</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                >
                  <option value="PENDING">Ödeme Bekleniyor</option>
                  <option value="PAID">Ödendi</option>
                  <option value="PROCESSING">İşleme Alındı</option>
                  <option value="SHIPPED">Kargoya Verildi</option>
                  <option value="DELIVERED">Teslim Edildi</option>
                  <option value="COMPLETED">Tamamlandı</option>
                  <option value="CANCELLED">İptal Edildi</option>
                  <option value="REFUND_REQUESTED">İade Talep Edildi</option>
                  <option value="REFUNDED">İade Yapıldı</option>
                </select>
              </div>
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={statusForm.adminNotes}
                  onChange={(e) => setStatusForm({ ...statusForm, adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsStatusModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--primary" onClick={handleSubmitStatusUpdate} disabled={isSubmitting}>
                {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İptal Onayı Modal */}
      {isApprovalModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsApprovalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>İptal Edilen Siparişi Onayla: {selectedOrder.orderNumber}</h2>
            <p className="modal-warning">Bu işlem para iadesi yapacaktır!</p>
            <div className="modal-form">
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={approvalForm.adminNotes}
                  onChange={(e) => setApprovalForm({ adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsApprovalModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--success" onClick={handleSubmitApproval} disabled={isSubmitting}>
                {isSubmitting ? 'İşleniyor...' : 'Onayla & İade Yap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İade Talebi Onay Modal */}
      {isRefundApprovalModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsRefundApprovalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>İade Talebini Onayla: {selectedOrder.orderNumber}</h2>
            <p className="modal-warning modal-warning--success">Bu işlem iyzico ile para iadesi yapacaktır!</p>
            <div className="modal-form">
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={refundApprovalForm.adminNotes}
                  onChange={(e) => setRefundApprovalForm({ adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsRefundApprovalModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--success" onClick={handleSubmitRefundApproval} disabled={isSubmitting}>
                {isSubmitting ? 'İşleniyor...' : 'Onayla & İade Yap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İade Talebi Red Modal */}
      {isRefundRejectionModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsRefundRejectionModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>İade Talebini Reddet: {selectedOrder.orderNumber}</h2>
            <p className="modal-warning">İade talebi reddedilecek ve müşteriye mail gönderilecektir.</p>
            <div className="modal-form">
              <div className="form-group">
                <label>
                  Red Nedeni: <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  value={refundRejectionForm.reason}
                  onChange={(e) => setRefundRejectionForm({ ...refundRejectionForm, reason: e.target.value })}
                  placeholder="Red nedeni giriniz..."
                  rows={3}
                  required
                />
              </div>
              <div className="form-group">
                <label>Admin Notları:</label>
                <textarea
                  value={refundRejectionForm.adminNotes}
                  onChange={(e) => setRefundRejectionForm({ ...refundRejectionForm, adminNotes: e.target.value })}
                  placeholder="Not ekleyin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsRefundRejectionModalOpen(false)}>
                İptal
              </button>
              <button className="btn btn--danger" onClick={handleSubmitRefundRejection} disabled={isSubmitting}>
                {isSubmitting ? 'İşleniyor...' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fatura Modal */}
      {isInvoiceModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsInvoiceModalOpen(false)}>
          <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
            <h2>Fatura Önizleme - {selectedOrder.orderNumber}</h2>
            {isInvoiceLoading ? (
              <div className="invoice-status">Fatura detayları hazırlanıyor...</div>
            ) : invoiceError ? (
              <div className="invoice-status invoice-status--error">
                <p>{invoiceError}</p>
                {selectedOrder && (
                  <button className="btn btn--primary" onClick={() => loadInvoiceDetails(selectedOrder.id)}>
                    Tekrar Dene
                  </button>
                )}
              </div>
            ) : (
              invoiceSource && (
                <div ref={invoiceRef} className="invoice-preview">
                  <div className="invoice-layout">
                    <header className="invoice-hero">
                      <div className="invoice-brand">
                        <div className="invoice-logo">HIEDRA</div>
                        <p className="invoice-tagline">Ev Koleksiyonu</p>
                        <div className="invoice-address">
                          <span>Atatürk Mah. Gazi Bulvarı No: 12</span>
                          <span>İstanbul / Türkiye</span>
                          <span>support@hiedra.com</span>
                          <span>+90 555 123 45 67</span>
                        </div>
                      </div>
                      <div className="invoice-meta">
                        <div>
                          <p className="invoice-meta__label">Fatura No</p>
                          <p className="invoice-meta__value">{invoiceSource.orderNumber}</p>
                        </div>
                        <div>
                          <p className="invoice-meta__label">Tarih</p>
                          <p className="invoice-meta__value">
                            {new Date(invoiceSource.createdAt).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </header>
                    <div className="invoice-body">
                      <section className="invoice-info">
                        <div className="invoice-card">
                          <p className="invoice-card__label">Fatura Eden</p>
                          <h4>Hiedra İç ve Dış Ticaret Ltd. Şti.</h4>
                          <p>Vergi No: 1234567890</p>
                          <p>Atatürk Mah. Gazi Bulvarı No: 12</p>
                          <p>İstanbul / Türkiye</p>
                          <p>support@hiedra.com</p>
                        </div>
                        <div className="invoice-card">
                          <p className="invoice-card__label">Alıcı Bilgileri</p>
                          <h4>{invoiceSource.customerName}</h4>
                          <p>{invoiceSource.customerEmail}</p>
                          <p>{invoiceSource.customerPhone}</p>
                          {(invoiceOrderDetail ?? invoiceSource).paymentTransactionId && (
                            <p>Ödeme Ref: {(invoiceOrderDetail ?? invoiceSource).paymentTransactionId}</p>
                          )}
                        </div>
                      </section>
                      <section className="invoice-table-wrapper">
                        <table className="invoice-table">
                          <thead>
                            <tr>
                              <th>Açıklama</th>
                              <th>Adet</th>
                              <th>KDV</th>
                              <th>Birim Fiyat</th>
                              <th>Satır Tutarı</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceTableItems.map((item) => {
                              const measurement = getItemMeasurement(item)
                              const quantity = item.quantity ?? 1
                              const unitPrice = getItemUnitPrice(item)
                              const lineTotal = getItemLineTotal(item)
                              return (
                                <tr key={`${item.id}-${item.productName}`}>
                                  <td>
                                    <div className="invoice-table__product">
                                      <span>{item.productName}</span>
                                      {measurement && (
                                        <span className="invoice-table__muted">{measurement}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td>{quantity}</td>
                                  <td>%{invoiceTaxPercent}</td>
                                  <td>{formatCurrency(unitPrice)}</td>
                                  <td>{formatCurrency(lineTotal)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </section>
                      <section className="invoice-summary">
                        <div className="invoice-notes">
                          <p className="invoice-card__label">Notlar</p>
                          <p>
                            {invoiceNotes.trim()
                              ? invoiceNotes
                              : `Sayın ${invoiceSource.customerName}, siparişiniz hazırlandığında tarafınıza bilgilendirme yapılacaktır.`}
                          </p>
                        </div>
                        <div className="invoice-totals">
                          <div className="invoice-totals__row">
                            <span>Ara Toplam</span>
                            <strong>
                              {invoiceAmounts ? formatCurrency(invoiceAmounts.subtotal) : '-'}
                            </strong>
                          </div>
                          <div className="invoice-totals__row">
                            <span>KDV (%{invoiceTaxPercent})</span>
                            <strong>
                              {invoiceAmounts ? formatCurrency(invoiceAmounts.taxAmount) : '-'}
                            </strong>
                          </div>
                          <div className="invoice-totals__row invoice-totals__row--grand">
                            <span>Genel Toplam</span>
                            <strong>
                              {invoiceAmounts ? formatCurrency(invoiceAmounts.total) : '-'}
                            </strong>
                          </div>
                        </div>
                      </section>
                      <section className="invoice-footer">
                        <div>
                          <p className="invoice-card__label">Ödeme Bilgisi</p>
                          <p>Hesap Adı: Hiedra İç ve Dış Ticaret Ltd. Şti.</p>
                          <p>IBAN: TR00 0000 0000 0000 0000 0000 00</p>
                          <p>Ödeme Vadesi: Sipariş tarihinden itibaren 7 gün</p>
                        </div>
                        <p className="invoice-thanks">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
                      </section>
                      <p className="invoice-disclaimer">
                        Bu belge elektronik ortamda oluşturulmuştur, imza gerektirmez.
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
            <div className="modal-form" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Fatura Notları:</label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Opsiyonel açıklamalar ekleyin..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setIsInvoiceModalOpen(false)}>
                Kapat
              </button>
              <button
                className="btn btn--primary"
                onClick={handlePrintInvoice}
                disabled={isInvoiceLoading || !!invoiceError}
              >
                <FaPrint style={{ marginRight: '0.5rem' }} /> Yazdır
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        type="confirm"
        confirmText="Evet, Devam Et"
        cancelText="İptal"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
      />
    </main>
  )
}

export default OrdersPage

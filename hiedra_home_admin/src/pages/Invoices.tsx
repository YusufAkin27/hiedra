import { useEffect, useState, useCallback } from 'react'
import { 
  FaFileInvoice, 
  FaDownload, 
  FaEye, 
  FaSearch, 
  FaSync, 
  FaCalendar,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPercent,
  FaTimes,
  FaPrint,
  FaExternalLinkAlt
} from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { getAdminHeaders } from '../services/authService'
import { useToast } from '../components/Toast'

type InvoicesPageProps = {
  session: AuthResponse
}

type InvoiceItem = {
  productName: string
  width: number | null
  height: number | null
  pleatType: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
}

type Invoice = {
  id: number
  invoiceNumber: string
  orderNumber: string
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerTc: string
  billingAddress: string
  subtotal: number
  taxRate: number
  taxAmount: number
  discountAmount: number
  shippingCost: number
  totalAmount: number
  couponCode: string | null
  invoiceDate: string
  createdAt: string
  pdfGenerated: boolean
  items?: InvoiceItem[]
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function InvoicesPage({ session }: InvoicesPageProps) {
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)

  const formatCurrency = (value: number) =>
    value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fetchInvoices = useCallback(async (showToast = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/invoices`, {
        headers: getAdminHeaders(session.accessToken),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.isSuccess || data.success) {
        setInvoices(data.data || [])
      } else {
        throw new Error(data.message || 'Faturalar yüklenemedi')
      }
    } catch (err) {
      console.error('Fatura yükleme hatası:', err)
      setError(err instanceof Error ? err.message : 'Faturalar yüklenirken bir hata oluştu')
      if (showToast) {
        toast.addToast('Faturalar yüklenirken hata oluştu', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [session.accessToken, toast])

  useEffect(() => {
    fetchInvoices(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      // Fatura detaylarını getir
      const response = await fetch(`${apiBaseUrl}/admin/invoices/${invoice.invoiceNumber}`, {
        headers: getAdminHeaders(session.accessToken),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          setSelectedInvoice(data.data)
          setIsDetailModalOpen(true)
          return
        }
      }
      
      // Fallback: mevcut veriyi kullan
      setSelectedInvoice(invoice)
      setIsDetailModalOpen(true)
    } catch (err) {
      console.error('Fatura detay hatası:', err)
      setSelectedInvoice(invoice)
      setIsDetailModalOpen(true)
    }
  }

  const handleDownloadPdf = async (invoiceNumber: string) => {
    setIsDownloading(invoiceNumber)
    
    try {
      const response = await fetch(`${apiBaseUrl}/admin/invoices/${invoiceNumber}/download`, {
        headers: getAdminHeaders(session.accessToken),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fatura-${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.addToast('Fatura başarıyla indirildi', 'success')
    } catch (err) {
      console.error('PDF indirme hatası:', err)
      toast.addToast('PDF indirirken hata oluştu', 'error')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleViewPdf = async (invoiceNumber: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/invoices/${invoiceNumber}/view`, {
        headers: getAdminHeaders(session.accessToken),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error('PDF görüntüleme hatası:', err)
      toast.addToast('PDF görüntülenirken hata oluştu', 'error')
    }
  }

  const handlePrint = async (invoiceNumber: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/invoices/${invoiceNumber}/download`, {
        headers: getAdminHeaders(session.accessToken),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Yeni pencerede aç ve yazdır
      const printWindow = window.open(url)
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    } catch (err) {
      console.error('Yazdırma hatası:', err)
      toast.addToast('Yazdırma sırasında hata oluştu', 'error')
    }
  }

  // Arama filtresi
  const filteredInvoices = invoices.filter(invoice => {
    const search = searchTerm.toLowerCase()
    return (
      invoice.invoiceNumber.toLowerCase().includes(search) ||
      invoice.orderNumber.toLowerCase().includes(search) ||
      invoice.customerName.toLowerCase().includes(search) ||
      invoice.customerEmail.toLowerCase().includes(search)
    )
  })

  if (isLoading) {
    return (
      <main className="page">
        <div className="page__header">
          <h1 className="page__title">
            <FaFileInvoice style={{ marginRight: '0.5rem' }} />
            Faturalar
          </h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Faturalar yükleniyor...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page__header">
        <h1 className="page__title">
          <FaFileInvoice style={{ marginRight: '0.5rem' }} />
          Faturalar
        </h1>
        <div className="page__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => fetchInvoices(true)}
            disabled={isLoading}
          >
            <FaSync className={isLoading ? 'spin' : ''} />
            Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Arama */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="search-box">
          <FaSearch className="search-box__icon" />
          <input
            type="text"
            className="search-box__input"
            placeholder="Fatura no, sipariş no, müşteri adı veya e-posta ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-box__clear"
              onClick={() => setSearchTerm('')}
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* İstatistikler */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--primary">
            <FaFileInvoice />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">{invoices.length}</span>
            <span className="stat-card__label">Toplam Fatura</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--success">
            <FaMoneyBillWave />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">
              {formatCurrency(invoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
            </span>
            <span className="stat-card__label">Toplam Tutar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--warning">
            <FaPercent />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">
              {formatCurrency(invoices.reduce((sum, inv) => sum + inv.taxAmount, 0))}
            </span>
            <span className="stat-card__label">Toplam KDV</span>
          </div>
        </div>
      </div>

      {/* Fatura Listesi */}
      <div className="card">
        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <FaFileInvoice style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ opacity: 0.7 }}>
              {searchTerm ? 'Arama kriterlerine uygun fatura bulunamadı.' : 'Henüz fatura bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Fatura No</th>
                  <th>Sipariş No</th>
                  <th>Müşteri</th>
                  <th>Tutar</th>
                  <th>KDV</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'center' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span className="badge badge--primary">{invoice.invoiceNumber}</span>
                    </td>
                    <td>
                      <span className="badge badge--secondary">{invoice.orderNumber}</span>
                    </td>
                    <td>
                      <div>
                        <strong>{invoice.customerName}</strong>
                        <br />
                        <small style={{ opacity: 0.7 }}>{invoice.customerEmail}</small>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-success)' }}>
                        {formatCurrency(invoice.totalAmount)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ opacity: 0.8 }}>
                        {formatCurrency(invoice.taxAmount)}
                      </span>
                    </td>
                    <td>
                      <small>{formatDate(invoice.invoiceDate)}</small>
                    </td>
                    <td>
                      <div className="table__actions">
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => handleViewInvoice(invoice)}
                          title="Detay Görüntüle"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => handleViewPdf(invoice.invoiceNumber)}
                          title="PDF Görüntüle"
                        >
                          <FaExternalLinkAlt />
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--primary"
                          onClick={() => handleDownloadPdf(invoice.invoiceNumber)}
                          disabled={isDownloading === invoice.invoiceNumber}
                          title="PDF İndir"
                        >
                          {isDownloading === invoice.invoiceNumber ? (
                            <span className="loading-spinner loading-spinner--sm"></span>
                          ) : (
                            <FaDownload />
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--secondary"
                          onClick={() => handlePrint(invoice.invoiceNumber)}
                          title="Yazdır"
                        >
                          <FaPrint />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fatura Detay Modal */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div 
            className="modal modal--lg" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="modal__header">
              <h2 className="modal__title">
                <FaFileInvoice style={{ marginRight: '0.5rem' }} />
                Fatura Detayı - {selectedInvoice.invoiceNumber}
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setIsDetailModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal__body">
              {/* Firma ve Müşteri Bilgileri */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Firma Bilgileri */}
                <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                    Satıcı Bilgileri
                  </h4>
                  <p><strong>{selectedInvoice.companyName}</strong></p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    <FaMapMarkerAlt style={{ marginRight: '0.25rem' }} />
                    {selectedInvoice.companyAddress}
                  </p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    <FaPhone style={{ marginRight: '0.25rem' }} />
                    {selectedInvoice.companyPhone}
                  </p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    <FaEnvelope style={{ marginRight: '0.25rem' }} />
                    {selectedInvoice.companyEmail}
                  </p>
                </div>

                {/* Müşteri Bilgileri */}
                <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                    Alıcı Bilgileri
                  </h4>
                  <p>
                    <FaUser style={{ marginRight: '0.25rem' }} />
                    <strong>{selectedInvoice.customerName}</strong>
                  </p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    TC: {selectedInvoice.customerTc}
                  </p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    <FaPhone style={{ marginRight: '0.25rem' }} />
                    {selectedInvoice.customerPhone}
                  </p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    <FaEnvelope style={{ marginRight: '0.25rem' }} />
                    {selectedInvoice.customerEmail}
                  </p>
                  <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    <FaMapMarkerAlt style={{ marginRight: '0.25rem' }} />
                    {selectedInvoice.billingAddress}
                  </p>
                </div>
              </div>

              {/* Fatura Bilgileri */}
              <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <small style={{ opacity: 0.7 }}>Fatura No</small>
                    <p><strong>{selectedInvoice.invoiceNumber}</strong></p>
                  </div>
                  <div>
                    <small style={{ opacity: 0.7 }}>Sipariş No</small>
                    <p><strong>{selectedInvoice.orderNumber}</strong></p>
                  </div>
                  <div>
                    <small style={{ opacity: 0.7 }}>Fatura Tarihi</small>
                    <p>
                      <FaCalendar style={{ marginRight: '0.25rem' }} />
                      {formatDate(selectedInvoice.invoiceDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ürün Listesi */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>Ürünler</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ürün</th>
                        <th>Ölçü (En x Boy)</th>
                        <th>Pilaj</th>
                        <th>Adet</th>
                        <th style={{ textAlign: 'right' }}>Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName}</td>
                          <td>
                            {item.width && item.height 
                              ? `${item.width}m x ${item.height}m`
                              : '-'
                            }
                          </td>
                          <td>{item.pleatType || '-'}</td>
                          <td>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tutar Özeti */}
              <div className="card" style={{ padding: '1rem', background: 'var(--bg-tertiary)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Alt Toplam:</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                      <span>
                        İndirim {selectedInvoice.couponCode && `(${selectedInvoice.couponCode})`}:
                      </span>
                      <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Kargo:</span>
                    <span>
                      {selectedInvoice.shippingCost === 0 
                        ? 'Ücretsiz' 
                        : formatCurrency(selectedInvoice.shippingCost)
                      }
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>KDV (%{selectedInvoice.taxRate}):</span>
                    <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                  <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-color)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    <span>Genel Toplam:</span>
                    <span style={{ color: 'var(--color-primary)' }}>
                      {formatCurrency(selectedInvoice.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Kapat
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => handlePrint(selectedInvoice.invoiceNumber)}
              >
                <FaPrint style={{ marginRight: '0.25rem' }} />
                Yazdır
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => handleDownloadPdf(selectedInvoice.invoiceNumber)}
                disabled={isDownloading === selectedInvoice.invoiceNumber}
              >
                {isDownloading === selectedInvoice.invoiceNumber ? (
                  <>
                    <span className="loading-spinner loading-spinner--sm" style={{ marginRight: '0.25rem' }}></span>
                    İndiriliyor...
                  </>
                ) : (
                  <>
                    <FaDownload style={{ marginRight: '0.25rem' }} />
                    PDF İndir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid var(--border-color);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .loading-spinner--sm {
          width: 14px;
          height: 14px;
          border-width: 2px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .search-box__icon {
          position: absolute;
          left: 1rem;
          color: var(--text-secondary);
        }
        
        .search-box__input {
          width: 100%;
          padding: 0.75rem 2.5rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        
        .search-box__input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(176, 141, 73, 0.1);
        }
        
        .search-box__clear {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }
        
        .stat-card__icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        
        .stat-card__icon--primary {
          background: rgba(176, 141, 73, 0.1);
          color: var(--color-primary);
        }
        
        .stat-card__icon--success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        
        .stat-card__icon--warning {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        
        .stat-card__content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-card__value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .stat-card__label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        
        .table__actions {
          display: flex;
          gap: 0.25rem;
          justify-content: center;
        }
        
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .modal {
          background: var(--bg-card);
          border-radius: 20px;
          width: 100%;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          animation: slideUp 0.3s ease-out;
        }
        
        .modal--lg {
          max-width: 800px;
        }
        
        .modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          background: linear-gradient(135deg, rgba(176, 141, 73, 0.1), transparent);
        }
        
        .modal__title {
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          color: var(--text-primary);
        }
        
        .modal__title svg {
          color: #B08D49;
        }
        
        .modal__close {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .modal__close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          transform: rotate(90deg);
        }
        
        .modal__body {
          padding: 1.5rem;
        }
        
        .modal__footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
          border-radius: 0 0 20px 20px;
        }
        
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .modal__body > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  )
}

export default InvoicesPage


import { useEffect, useState } from 'react'
import { FaArrowLeft, FaUser, FaClock, FaSearch } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import type { useToast } from '../components/Toast'

type ContractAcceptancesPageProps = {
  session: AuthResponse
  toast: ReturnType<typeof useToast>
  contractId: number | null
  onBack: () => void
}

type ContractAcceptance = {
  id: number
  status: 'ACCEPTED' | 'REJECTED'
  acceptedVersion: number
  acceptedAt: string
  user?: {
    id: number
    email: string
    fullName?: string
  }
  guestUserId?: string
  ipAddress?: string
  userAgent?: string
  contract?: {
    id: number
    title: string
    type: string
  }
}

type PageResponse<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function ContractAcceptancesPage({ session, toast, contractId, onBack }: ContractAcceptancesPageProps) {
  const [acceptances, setAcceptances] = useState<ContractAcceptance[]>([])
  const [contract, setContract] = useState<{ id: number; title: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [pageSize] = useState(20)

  useEffect(() => {
    if (contractId) {
      fetchAcceptances(contractId, currentPage, searchTerm)
    }
  }, [contractId, currentPage, searchTerm, session.accessToken])

  const fetchAcceptances = async (id: number, page: number, search: string) => {
    try {
      setIsLoading(true)
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
      const response = await fetch(
        `${apiBaseUrl}/admin/contracts/${id}/acceptances?page=${page}&size=${pageSize}${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Onay geçmişi yüklenemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: PageResponse<ContractAcceptance>
      }

      const success = payload.isSuccess ?? payload.success ?? false
      if (success && payload.data) {
        setAcceptances(payload.data.content || [])
        setTotalPages(payload.data.totalPages || 0)
        setTotalElements(payload.data.totalElements || 0)
        
        // İlk yüklemede contract bilgisini al
        if (payload.data.content && payload.data.content.length > 0 && payload.data.content[0].contract) {
          setContract({
            id: payload.data.content[0].contract.id,
            title: payload.data.content[0].contract.title,
          })
        } else if (!contract && id) {
          // Contract bilgisi yoksa ayrı bir istekle al
          fetchContract(id)
        }
      } else {
        // Başarısız response durumunda boş array set et
        setAcceptances([])
        setTotalPages(0)
        setTotalElements(0)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onay geçmişi yüklenirken bir hata oluştu.'
      toast.error(message)
      // Hata durumunda boş array set et
      setAcceptances([])
      setTotalPages(0)
      setTotalElements(0)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchContract = async (id: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/admin/contracts/${id}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: { id: number; title: string }
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setContract(payload.data)
        }
      }
    } catch (err) {
      console.error('Sözleşme bilgisi alınamadı:', err)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(0)
    if (contractId) {
      fetchAcceptances(contractId, 0, searchTerm)
    }
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

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    if (contractId) {
      fetchAcceptances(contractId, newPage, searchTerm)
    }
  }

  if (!contractId) {
    return (
      <main className="page dashboard">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Sözleşme seçilmedi.</p>
          <button onClick={onBack} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Geri Dön
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <button
            onClick={onBack}
            className="btn btn-secondary"
            style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaArrowLeft /> Geri Dön
          </button>
          <p className="dashboard__eyebrow">Sözleşme Onay Geçmişi</p>
          <h1>{contract?.title || 'Onay Geçmişi'}</h1>
          <p>Bu sözleşmeyi onaylayan/reddeden kullanıcıların geçmişi</p>
        </div>
      </section>

      {/* Arama */}
      <section className="dashboard__grid" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="search" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Ara (E-posta, Ad Soyad, IP Adresi)
              </label>
              <div style={{ position: 'relative' }}>
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999',
                  }}
                />
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ara..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                  }}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
              Ara
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setCurrentPage(0)
                  if (contractId) {
                    fetchAcceptances(contractId, 0, '')
                  }
                }}
                className="btn btn-secondary"
              >
                Temizle
              </button>
            )}
          </form>
        </article>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3>İstatistikler</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f0f4f8', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{totalElements}</div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Toplam Kayıt</div>
            </div>
            <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>
                {acceptances?.filter((a) => a.status === 'ACCEPTED').length || 0}
              </div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Onaylanan</div>
            </div>
            <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>
                {acceptances?.filter((a) => a.status === 'REJECTED').length || 0}
              </div>
              <div style={{ color: '#666', marginTop: '0.5rem' }}>Reddedilen</div>
            </div>
          </div>
        </article>
      </section>

      {/* Onay Geçmişi Listesi */}
      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Yükleniyor...</p>
            </div>
          ) : !acceptances || acceptances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <p>
                {searchTerm
                  ? 'Arama kriterlerinize uygun kayıt bulunamadı.'
                  : 'Bu sözleşme için henüz onay kaydı bulunmuyor.'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {acceptances?.map((acceptance) => (
                  <div
                    key={acceptance.id}
                    style={{
                      padding: '1.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      background: acceptance.status === 'ACCEPTED' ? '#e8f5e9' : '#fff3e0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <FaUser style={{ color: '#667eea' }} />
                          <strong>
                            {acceptance.user
                              ? `${acceptance.user.fullName || 'Kullanıcı'} (${acceptance.user.email})`
                              : `Misafir Kullanıcı (${acceptance.guestUserId || 'Bilinmiyor'})`}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                          <FaClock style={{ color: '#999' }} />
                          <span>{formatDate(acceptance.acceptedAt)}</span>
                        </div>
                      </div>
                      <div>
                        {acceptance.status === 'ACCEPTED' ? (
                          <span
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '20px',
                              background: '#4caf50',
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Onaylandı
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '20px',
                              background: '#ff9800',
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Reddedildi
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <div>
                          <strong>Versiyon:</strong> v{acceptance.acceptedVersion}
                        </div>
                        {acceptance.ipAddress && (
                          <div>
                            <strong>IP Adresi:</strong> {acceptance.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '2rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <button
                    onClick={() => handlePageChange(0)}
                    disabled={currentPage === 0}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    İlk
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Önceki
                  </button>
                  <span style={{ padding: '0.5rem 1rem', color: '#666' }}>
                    Sayfa {currentPage + 1} / {totalPages} (Toplam {totalElements} kayıt)
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Sonraki
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Son
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </section>
    </main>
  )
}

export default ContractAcceptancesPage


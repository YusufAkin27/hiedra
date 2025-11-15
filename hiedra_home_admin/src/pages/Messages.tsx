import { useEffect, useState } from 'react'
import { FaCheckCircle, FaCalendar, FaClipboard, FaChartBar, FaEye, FaEnvelope, FaSpinner, FaTable, FaFileAlt, FaUser, FaCalendarAlt } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { useToast } from '../components/Toast'

type MessagesPageProps = {
  session: AuthResponse
}

type Message = {
  id: number
  name: string
  email: string
  phone: string
  subject: string
  message: string
  verified: boolean
  createdAt: string
  adminResponse?: string | null
  respondedAt?: string | null
  respondedBy?: string | null
  isResponded?: boolean
}

type ViewMode = 'table' | 'cards'

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

const ITEMS_PER_PAGE = 20

function MessagesPage({ session }: MessagesPageProps) {
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Mobilde otomatik olarak kart görünümü
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards'
    }
    return 'table'
  })
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [responseText, setResponseText] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'responded' | 'notResponded'>('all')

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        setError(null)

        let url = `${apiBaseUrl}/admin/messages?verified=true`
        if (filter === 'responded') {
          url += '&responded=true'
        } else if (filter === 'notResponded') {
          url += '&responded=false'
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Mesajlar yüklenemedi.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Message[]
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Mesajlar yüklenemedi.')
        }

        setMessages(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [session.accessToken, filter])

  const handleRespond = async (messageId: number) => {
    if (!responseText.trim()) {
      toast.warning('Lütfen bir cevap yazın.')
      return
    }

    try {
      setIsResponding(true)
      setError(null)

      const response = await fetch(`${apiBaseUrl}/admin/messages/${messageId}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response: responseText }),
      })

      if (!response.ok) {
        throw new Error('Cevap gönderilemedi.')
      }

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success) {
        throw new Error(payload.message ?? 'Cevap gönderilemedi.')
      }

      toast.success('Cevap başarıyla gönderildi!')
      setSelectedMessage(null)
      setResponseText('')
      
      // Mesajları yeniden yükle (filter'ı koru)
      const fetchMessages = async () => {
        let url = `${apiBaseUrl}/admin/messages?verified=true`
        if (filter === 'responded') {
          url += '&responded=true'
        } else if (filter === 'notResponded') {
          url += '&responded=false'
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })
        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: Message[]
        }
        const success = payload.isSuccess ?? payload.success ?? false
        if (success && payload.data) {
          setMessages(payload.data)
        }
      }
      fetchMessages()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cevap gönderilirken bir hata oluştu.'
      setError(message)
      toast.error(message)
    } finally {
      setIsResponding(false)
    }
  }

  // Filtreleme ve sayfalama
  const filteredMessages = messages.filter((msg) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        msg.name.toLowerCase().includes(search) ||
        msg.email.toLowerCase().includes(search) ||
        msg.phone.includes(search) ||
        msg.subject.toLowerCase().includes(search) ||
        msg.message.toLowerCase().includes(search) ||
        msg.id.toString().includes(search)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex)

  // İstatistikler
  const stats = {
    total: messages.length,
    responded: messages.filter((m) => m.isResponded).length,
    notResponded: messages.filter((m) => !m.isResponded).length,
    today: messages.filter((m) => {
      const today = new Date()
      const msgDate = new Date(m.createdAt)
      return today.toDateString() === msgDate.toDateString()
    }).length,
    thisWeek: messages.filter((m) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(m.createdAt) >= weekAgo
    }).length,
    verified: messages.filter((m) => m.verified).length,
  }

  // E-posta kopyalama
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Kopyalandı!')
    })
  }

  if (isLoading) {
    return (
      <main className="page dashboard">
        <p>Yükleniyor...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page dashboard">
        <p className="dashboard-card__feedback dashboard-card__feedback--error">{error}</p>
      </main>
    )
  }

  return (
    <main className="page dashboard">
      <section className="dashboard__hero">
        <div className="dashboard__hero-text">
          <p className="dashboard__eyebrow">İletişim Yönetimi</p>
          <h1>Bize Ulaşın Mesajları</h1>
          <p>Gelen tüm mesajları görüntüleyin ve yanıtlayın.</p>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="dashboard__grid messages-stats" style={{ marginBottom: '2rem' }}>
        <article className="dashboard-card">
          <h3 className="messages-stats__title">Genel İstatistikler</h3>
          <div className="messages-stats__grid">
            <div className="messages-stat-card messages-stat-card--primary">
              <div className="messages-stat-card__icon"><FaEnvelope /></div>
              <div className="messages-stat-card__value">{stats.total}</div>
              <div className="messages-stat-card__label">Toplam Mesaj</div>
              <div className="messages-stat-card__subtitle">Tüm mesajlar</div>
            </div>
            <div className="messages-stat-card messages-stat-card--warning">
              <div className="messages-stat-card__icon"><FaSpinner /></div>
              <div className="messages-stat-card__value">{stats.notResponded}</div>
              <div className="messages-stat-card__label">Cevap Bekleyen</div>
              <div className="messages-stat-card__subtitle">Yanıtlanmamış</div>
            </div>
            <div className="messages-stat-card messages-stat-card--success">
              <div className="messages-stat-card__icon"><FaCheckCircle /></div>
              <div className="messages-stat-card__value">{stats.responded}</div>
              <div className="messages-stat-card__label">Cevaplanmış</div>
              <div className="messages-stat-card__subtitle">Yanıtlanmış</div>
            </div>
            <div className="messages-stat-card messages-stat-card--info">
              <div className="messages-stat-card__icon"><FaCalendar /></div>
              <div className="messages-stat-card__value">{stats.today}</div>
              <div className="messages-stat-card__label">Bugün</div>
              <div className="messages-stat-card__subtitle">Bugün gelen</div>
            </div>
            <div className="messages-stat-card messages-stat-card--info">
              <div className="messages-stat-card__icon"><FaCalendarAlt /></div>
              <div className="messages-stat-card__value">{stats.thisWeek}</div>
              <div className="messages-stat-card__label">Bu Hafta</div>
              <div className="messages-stat-card__subtitle">Son 7 gün</div>
            </div>
            <div className="messages-stat-card messages-stat-card--success">
              <div className="messages-stat-card__icon">✓</div>
              <div className="messages-stat-card__value">{stats.verified}</div>
              <div className="messages-stat-card__label">Doğrulanmış</div>
              <div className="messages-stat-card__subtitle">E-posta doğrulandı</div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          {/* Filtreler ve Arama */}
          <div className="messages-filters">
            <div className="messages-filters__row">
              <div className="messages-filters__search">
                <input
                  type="text"
                  className="messages-filters__input"
                  placeholder="Mesaj ara (ad, e-posta, telefon, konu, mesaj...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div className="messages-filters__actions">
                <button
                  type="button"
                  className="btn btn-primary messages-view-toggle messages-view-toggle--desktop"
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
            <div className="messages-filters__tabs">
              <button
                type="button"
                className={`messages-tab ${filter === 'all' ? 'messages-tab--active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Tümü <span className="messages-tab__count">({stats.total})</span>
              </button>
              <button
                type="button"
                className={`messages-tab messages-tab--warning ${filter === 'notResponded' ? 'messages-tab--active' : ''}`}
                onClick={() => setFilter('notResponded')}
              >
                Cevap Bekleyen <span className="messages-tab__count messages-tab__count--warning">({stats.notResponded})</span>
              </button>
              <button
                type="button"
                className={`messages-tab messages-tab--success ${filter === 'responded' ? 'messages-tab--active' : ''}`}
                onClick={() => setFilter('responded')}
              >
                Cevaplanmış <span className="messages-tab__count messages-tab__count--success">({stats.responded})</span>
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="messages-header">
            <div className="messages-header__info">
              <span className="messages-header__count">
                Toplam: <strong>{filteredMessages.length}</strong> mesaj
              </span>
              {filteredMessages.length !== messages.length && (
                <span className="messages-header__filtered">
                  (Filtrelenmiş: {filteredMessages.length} / {messages.length})
                </span>
              )}
            </div>
            <div className="messages-header__pagination">
              Sayfa {currentPage} / {totalPages || 1}
            </div>
          </div>

          {filteredMessages.length === 0 ? (
            <p className="dashboard-card__empty">Henüz mesaj bulunmuyor.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`dashboard-card__table messages-table-desktop ${viewMode === 'table' ? '' : 'messages-table-desktop--hidden'}`}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ad Soyad</th>
                      <th>E-posta</th>
                      <th>Telefon</th>
                      <th>Konu</th>
                      <th>Mesaj</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMessages.map((msg) => (
                      <tr key={msg.id}>
                        <td>
                          <div className="messages-table__id">#{msg.id}</div>
                        </td>
                        <td>
                          <div className="messages-table__name">{msg.name}</div>
                        </td>
                        <td>
                          <div className="messages-table__email">
                            <span>{msg.email}</span>
                            <button
                              className="messages-table__copy-btn"
                              onClick={() => copyToClipboard(msg.email)}
                              title="E-postayı kopyala"
                            >
                              <FaClipboard />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="messages-table__phone">{msg.phone || '-'}</div>
                        </td>
                        <td>
                          <div className="messages-table__subject">{msg.subject}</div>
                        </td>
                        <td>
                          <div className="messages-table__message" title={msg.message}>
                            {msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message}
                          </div>
                        </td>
                        <td>
                          {msg.isResponded ? (
                            <span className="dashboard-card__chip dashboard-card__chip--success">
                              <FaCheckCircle style={{ marginRight: '0.25rem' }} /> Cevaplanmış
                            </span>
                          ) : (
                            <span className="dashboard-card__chip dashboard-card__chip--warning">
                              <FaSpinner style={{ marginRight: '0.25rem' }} /> Cevap Bekliyor
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="messages-table__date">
                            {new Date(msg.createdAt).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`messages-table__btn ${msg.isResponded ? 'messages-table__btn--info' : 'messages-table__btn--primary'}`}
                            onClick={() => setSelectedMessage(msg)}
                            title={msg.isResponded ? 'Cevabı Gör' : 'Cevap Ver'}
                          >
                            {msg.isResponded ? <FaEye /> : <FaEnvelope />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className={`messages-cards ${viewMode === 'cards' ? '' : 'messages-cards--hidden'}`}>
                {paginatedMessages.map((msg) => (
                  <div key={msg.id} className="message-card" onClick={() => setSelectedMessage(msg)}>
                    <div className="message-card__header">
                      <div className="message-card__header-left">
                        <div className="message-card__name"><FaUser style={{ marginRight: '0.25rem' }} /> {msg.name}</div>
                        <div className="message-card__meta">
                          {msg.isResponded ? (
                            <span className="message-card__badge message-card__badge--success">
                              <FaCheckCircle style={{ marginRight: '0.25rem' }} /> Cevaplanmış
                            </span>
                          ) : (
                            <span className="message-card__badge message-card__badge--warning">
                              <FaSpinner style={{ marginRight: '0.25rem' }} /> Cevap Bekliyor
                            </span>
                          )}
                          <span className="message-card__id">#{msg.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="message-card__body">
                      <div className="message-card__row">
                        <div className="message-card__icon"><FaEnvelope /></div>
                        <div className="message-card__content">
                          <div className="message-card__label">E-posta</div>
                          <div className="message-card__value-group">
                            <span className="message-card__value message-card__value--email">{msg.email}</span>
                            <button
                              type="button"
                              className="message-card__copy-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(msg.email)
                              }}
                              title="Kopyala"
                            >
                              <FaClipboard />
                            </button>
                          </div>
                        </div>
                      </div>
                      {msg.phone && (
                        <div className="message-card__row">
                          <div className="message-card__icon">📞</div>
                          <div className="message-card__content">
                            <div className="message-card__label">Telefon</div>
                            <div className="message-card__value">{msg.phone}</div>
                          </div>
                        </div>
                      )}
                      <div className="message-card__row">
                        <div className="message-card__icon"><FaFileAlt /></div>
                        <div className="message-card__content">
                          <div className="message-card__label">Konu</div>
                          <div className="message-card__value message-card__value--subject">{msg.subject}</div>
                        </div>
                      </div>
                      <div className="message-card__row">
                        <div className="message-card__icon">💬</div>
                        <div className="message-card__content">
                          <div className="message-card__label">Mesaj</div>
                          <div className="message-card__value message-card__value--message" title={msg.message}>
                            {msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message}
                          </div>
                        </div>
                      </div>
                      <div className="message-card__row">
                        <div className="message-card__icon"><FaCalendar /></div>
                        <div className="message-card__content">
                          <div className="message-card__label">Tarih</div>
                          <div className="message-card__value message-card__value--date">
                            {new Date(msg.createdAt).toLocaleString('tr-TR', {
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
                    <div className="message-card__footer">
                      <button
                        type="button"
                        className={`message-card__btn ${msg.isResponded ? 'message-card__btn--info' : 'message-card__btn--primary'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedMessage(msg)
                        }}
                      >
                        {msg.isResponded ? <><FaEye style={{ marginRight: '0.25rem' }} /> Cevabı Gör</> : <><FaEnvelope style={{ marginRight: '0.25rem' }} /> Cevap Ver</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="messages-pagination">
                  <button
                    type="button"
                    className="messages-pagination__btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    İlk
                  </button>
                  <button
                    type="button"
                    className="messages-pagination__btn"
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
                        className={`messages-pagination__btn messages-pagination__btn--number ${
                          currentPage === pageNum ? 'messages-pagination__btn--active' : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="messages-pagination__btn"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sonraki
                  </button>
                  <button
                    type="button"
                    className="messages-pagination__btn"
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

      {/* Cevap Verme Modal */}
      {selectedMessage && (
        <div
          className="message-modal-overlay"
          onClick={() => {
            setSelectedMessage(null)
            setResponseText('')
          }}
        >
          <div
            className="message-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="message-modal__header">
              <h2 className="message-modal__title">Mesaj Detayı</h2>
              <button
                type="button"
                className="message-modal__close"
                onClick={() => {
                  setSelectedMessage(null)
                  setResponseText('')
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="message-modal__content">
              <div className="message-modal__info-grid">
                <div className="message-modal__info-item">
                  <div className="message-modal__info-label">Ad Soyad</div>
                  <div className="message-modal__info-value">{selectedMessage.name}</div>
                </div>
                <div className="message-modal__info-item">
                  <div className="message-modal__info-label">E-posta</div>
                  <div className="message-modal__info-value-group">
                    <span className="message-modal__info-value message-modal__info-value--email">{selectedMessage.email}</span>
                    <button
                      type="button"
                      className="message-modal__copy-btn"
                      onClick={() => copyToClipboard(selectedMessage.email)}
                      title="Kopyala"
                    >
                      <FaClipboard />
                    </button>
                  </div>
                </div>
                <div className="message-modal__info-item">
                  <div className="message-modal__info-label">Telefon</div>
                  <div className="message-modal__info-value">{selectedMessage.phone || '-'}</div>
                </div>
                <div className="message-modal__info-item">
                  <div className="message-modal__info-label">Tarih</div>
                  <div className="message-modal__info-value message-modal__info-value--date">
                    {new Date(selectedMessage.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className="message-modal__section">
                <div className="message-modal__section-label">KONU</div>
                <div className="message-modal__subject">
                  {selectedMessage.subject}
                </div>
              </div>

              <div className="message-modal__section">
                <div className="message-modal__section-label">MESAJ</div>
                <div className="message-modal__message">
                  {selectedMessage.message}
                </div>
              </div>

              {selectedMessage.isResponded && selectedMessage.adminResponse && (
                <div className="message-modal__response">
                  <div className="message-modal__response-header">
                    ✓ ÖNCEKİ CEVAP
                  </div>
                  <div className="message-modal__response-content">
                    {selectedMessage.adminResponse}
                  </div>
                  {selectedMessage.respondedAt && (
                    <div className="message-modal__response-footer">
                      <div>Cevap Tarihi: {new Date(selectedMessage.respondedAt).toLocaleString('tr-TR')}</div>
                      {selectedMessage.respondedBy && (
                        <div>Cevap Veren: {selectedMessage.respondedBy}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!selectedMessage.isResponded && (
                <>
                  <div className="message-modal__form-group">
                    <label htmlFor="response" className="message-modal__form-label">
                      Cevabınız (Bu cevap kullanıcıya e-posta olarak gönderilecektir):
                    </label>
                    <textarea
                      id="response"
                      className="message-modal__form-textarea"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={10}
                      placeholder="Kullanıcıya göndermek istediğiniz cevabı yazın. Bu cevap profesyonel bir e-posta şablonu ile kullanıcıya gönderilecektir..."
                    />
                    <div className="message-modal__form-hint">
                      İpucu: Detaylı ve samimi bir cevap yazın. Kullanıcı bu cevabı e-posta olarak alacaktır.
                    </div>
                  </div>
                  <div className="message-modal__actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSelectedMessage(null)
                        setResponseText('')
                      }}
                      disabled={isResponding}
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleRespond(selectedMessage.id)}
                      disabled={isResponding || !responseText.trim()}
                    >
                      {isResponding ? 'Gönderiliyor...' : <><FaEnvelope style={{ marginRight: '0.25rem' }} /> Cevabı Gönder</>}
                    </button>
                  </div>
                </>
              )}

              {selectedMessage.isResponded && (
                <div className="message-modal__actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedMessage(null)
                      setResponseText('')
                    }}
                  >
                    Kapat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default MessagesPage


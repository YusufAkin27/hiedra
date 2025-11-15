import { useEffect, useState } from 'react'
import { FaCalendar, FaUser } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'

type UsersPageProps = {
  session: AuthResponse
  onViewUser?: (userId: number) => void
}

type User = {
  id: number
  email: string
  role: string
  emailVerified: boolean
  active: boolean
  lastLoginAt?: string | null
  createdAt: string
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function UsersPage({ session, onViewUser }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${apiBaseUrl}/admin/users`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Kullanıcılar yüklenemedi.')
        }

        const payload = (await response.json()) as {
          isSuccess?: boolean
          success?: boolean
          data?: User[]
          message?: string
        }

        const success = payload.isSuccess ?? payload.success ?? false

        if (!success || !payload.data) {
          throw new Error(payload.message ?? 'Kullanıcılar yüklenemedi.')
        }

        setUsers(payload.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [session.accessToken])

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
          <p className="dashboard__eyebrow">Kullanıcı Yönetimi</p>
          <h1>Kullanıcılar</h1>
          <p>Sistemdeki tüm kullanıcıları görüntüleyin ve yönetin.</p>
        </div>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-card dashboard-card--wide">
          <h2>Kullanıcı Listesi</h2>
          {users.length === 0 ? (
            <p className="dashboard-card__empty">Henüz kullanıcı bulunmuyor.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="dashboard-card__table users-table-desktop">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>E-posta</th>
                      <th>Rol</th>
                      <th>Durum</th>
                      <th>E-posta Doğrulandı</th>
                      <th>Son Giriş</th>
                      <th>Kayıt Tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr 
                        key={user.id}
                        style={{ cursor: onViewUser ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (onViewUser) {
                            onViewUser(user.id)
                          }
                        }}
                      >
                        <td>{user.id}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className="dashboard-card__chip">{user.role}</span>
                        </td>
                        <td>
                          <span
                            className={`dashboard-card__chip ${
                              user.active ? 'dashboard-card__chip--success' : 'dashboard-card__chip--error'
                            }`}
                          >
                            {user.active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`dashboard-card__chip ${
                              user.emailVerified
                                ? 'dashboard-card__chip--success'
                                : 'dashboard-card__chip--warning'
                            }`}
                          >
                            {user.emailVerified ? 'Evet' : 'Hayır'}
                          </span>
                        </td>
                        <td>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString('tr-TR')
                            : 'Hiç giriş yapmamış'}
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="users-cards-mobile">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="user-card-mobile"
                    style={{ cursor: onViewUser ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (onViewUser) {
                        onViewUser(user.id)
                      }
                    }}
                  >
                    <div className="user-card-mobile__header">
                      <div className="user-card-mobile__avatar">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-card-mobile__info">
                        <div className="user-card-mobile__email">{user.email}</div>
                        <div className="user-card-mobile__meta">
                          <span className="user-card-mobile__id">#{user.id}</span>
                          <span className={`user-card-mobile__status-badge ${
                            user.active ? 'user-card-mobile__status-badge--active' : 'user-card-mobile__status-badge--inactive'
                          }`}>
                            {user.active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="user-card-mobile__body">
                      <div className="user-card-mobile__row">
                        <div className="user-card-mobile__icon"><FaUser /></div>
                        <div className="user-card-mobile__content">
                          <span className="user-card-mobile__label">Rol</span>
                          <span className="dashboard-card__chip user-card-mobile__chip">{user.role}</span>
                        </div>
                      </div>
                      <div className="user-card-mobile__row">
                        <div className="user-card-mobile__icon">✓</div>
                        <div className="user-card-mobile__content">
                          <span className="user-card-mobile__label">E-posta Doğrulama</span>
                          <span
                            className={`dashboard-card__chip user-card-mobile__chip ${
                              user.emailVerified
                                ? 'dashboard-card__chip--success'
                                : 'dashboard-card__chip--warning'
                            }`}
                          >
                            {user.emailVerified ? 'Doğrulanmış' : 'Doğrulanmamış'}
                          </span>
                        </div>
                      </div>
                      {user.lastLoginAt && (
                        <div className="user-card-mobile__row">
                          <div className="user-card-mobile__icon">🕐</div>
                          <div className="user-card-mobile__content">
                            <span className="user-card-mobile__label">Son Giriş</span>
                            <span className="user-card-mobile__value">
                              {new Date(user.lastLoginAt).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="user-card-mobile__row">
                        <div className="user-card-mobile__icon"><FaCalendar /></div>
                        <div className="user-card-mobile__content">
                          <span className="user-card-mobile__label">Kayıt Tarihi</span>
                          <span className="user-card-mobile__value">
                            {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>
    </main>
  )
}

export default UsersPage


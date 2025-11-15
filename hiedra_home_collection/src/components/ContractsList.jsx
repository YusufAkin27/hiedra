import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SEO from './SEO'
import './LegalPages.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const ContractsList = () => {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(`${API_BASE_URL}/contracts`)
        
        if (!response.ok) {
          setError('Sözleşmeler yüklenirken bir hata oluştu')
          setIsLoading(false)
          return
        }

        const data = await response.json()
        if (data.isSuccess || data.success) {
          setContracts(data.data || [])
        } else {
          setError(data.message || 'Sözleşmeler yüklenemedi')
        }
      } catch (err) {
        console.error('Sözleşmeler yüklenirken hata:', err)
        setError('Sözleşmeler yüklenirken bir hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContracts()
  }, [])

  if (isLoading) {
    return (
      <div className="legal-page">
        <div className="legal-container">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="legal-page">
        <div className="legal-container">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h1>Hata</h1>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title="Sözleşmeler - Hiedra Home"
        description="Tüm sözleşmeleri görüntüleyin ve onaylayın"
      />
      <div className="legal-page">
        <div className="legal-container">
          <div className="legal-header">
            <h1>Sözleşmeler</h1>
            <p>Lütfen aşağıdaki sözleşmeleri okuyun ve onaylayın</p>
          </div>

          {contracts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Henüz sözleşme bulunmamaktadır.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/sozlesme/${contract.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                    {contract.title}
                  </h2>
                  {contract.type && (
                    <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      Tür: {contract.type}
                    </p>
                  )}
                  {contract.version && (
                    <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      Versiyon: {contract.version}
                    </p>
                  )}
                  {contract.updatedAt && (
                    <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      Son Güncelleme: {new Date(contract.updatedAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/sozlesme/${contract.id}`)
                      }}
                    >
                      Sözleşmeyi Görüntüle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="legal-footer">
            <button onClick={() => navigate('/')} className="btn btn-secondary">
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ContractsList


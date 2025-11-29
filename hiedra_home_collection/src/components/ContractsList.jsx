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
          <div className="legal-loading">
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
          <div className="legal-error">
            <h1>Hata</h1>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">
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
            <div className="contracts-empty">
              <p>Henüz sözleşme bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="contracts-list">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="contract-card"
                  onClick={() => navigate(`/sozlesme/${contract.id}`)}
                >
                  <h2 className="contract-title">{contract.title}</h2>
                  <div className="contract-meta">
                    {contract.type && (
                      <p className="contract-meta-item">
                        <span className="contract-meta-label">Tür:</span> {contract.type}
                      </p>
                    )}
                  
                    {contract.updatedAt && (
                      <p className="contract-meta-item">
                        <span className="contract-meta-label">Son Güncelleme:</span> {new Date(contract.updatedAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                  <div className="contract-actions">
                    <button
                      className="btn btn-primary contract-view-btn"
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


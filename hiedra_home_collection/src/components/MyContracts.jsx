import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import SEO from './SEO'
import './LegalPages.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const MyContracts = () => {
  const navigate = useNavigate()
  const { accessToken, isAuthenticated } = useAuth()
  const toast = useToast()
  const [contracts, setContracts] = useState([])
  const [acceptances, setAcceptances] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/giris')
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError('')

        // Tüm sözleşmeleri ve onay durumlarını çek
        const [contractsResponse, historyResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/contracts`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_BASE_URL}/contracts/my-history`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }),
        ])

        if (!contractsResponse.ok || !historyResponse.ok) {
          setError('Sözleşmeler yüklenirken bir hata oluştu')
          setIsLoading(false)
          return
        }

        const contractsData = await contractsResponse.json()
        const historyData = await historyResponse.json()

        if (contractsData.isSuccess || contractsData.success) {
          setContracts(contractsData.data || [])
        }

        if (historyData.isSuccess || historyData.success) {
          setAcceptances(historyData.data || [])
        }
      } catch (err) {
        console.error('Sözleşmeler yüklenirken hata:', err)
        setError('Sözleşmeler yüklenirken bir hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [accessToken, isAuthenticated, navigate])

  // Sözleşme onay durumunu kontrol et
  const getContractStatus = (contractId, contractVersion) => {
    const acceptance = acceptances.find(
      (acc) => acc.contract?.id === contractId && acc.acceptedVersion === contractVersion
    )
    
    if (!acceptance) {
      return { status: 'pending', acceptance: null }
    }

    return {
      status: acceptance.status === 'ACCEPTED' ? 'accepted' : 'rejected',
      acceptance: acceptance,
    }
  }

  // Zorunlu sözleşme türlerini kontrol et
  const isRequiredContract = (contractType) => {
    const requiredTypes = ['KULLANIM', 'GIZLILIK', 'KVKK', 'SATIS']
    return requiredTypes.includes(contractType)
  }

  // Sözleşmeyi feshet
  const handleRejectContract = async (contractId, contractTitle) => {
    if (!window.confirm(`"${contractTitle}" sözleşmesini feshetmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.message || 'Sözleşme feshedilemedi'
        toast.error(errorMsg)
        return
      }

      const data = await response.json()
      if (data.isSuccess || data.success) {
        toast.success('Sözleşme başarıyla feshedildi')
        // Sayfayı yenile
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const errorMsg = data.message || 'Sözleşme feshedilemedi'
        toast.error(errorMsg)
      }
    } catch (err) {
      console.error('Sözleşme feshedilirken hata:', err)
      toast.error('Sözleşme feshedilirken bir hata oluştu')
    }
  }

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
        title="Onayladığım Sözleşmeler - Hiedra Home"
        description="Onayladığınız sözleşmeleri görüntüleyin"
      />
      <div className="legal-page">
        <div className="legal-container">
          <div className="legal-header">
            <h1>Onayladığım Sözleşmeler</h1>
            <p>Onayladığınız tüm sözleşmeleri buradan görüntüleyebilirsiniz</p>
          </div>

          {(() => {
            // Sadece onaylanmış sözleşmeleri filtrele
            const acceptedContracts = contracts.filter((contract) => {
              const { status } = getContractStatus(contract.id, contract.version)
              return status === 'accepted'
            })

            if (acceptedContracts.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Henüz onaylanmış sözleşme bulunmamaktadır.</p>
                </div>
              )
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {acceptedContracts.map((contract) => {
                  const { status, acceptance } = getContractStatus(contract.id, contract.version)
                  return (
                    <div
                      key={contract.id}
                      style={{
                        padding: '1.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
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
                          {acceptance && acceptance.acceptedAt && (
                            <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                              Onay Tarihi: {new Date(acceptance.acceptedAt).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                        <div style={{ marginLeft: '1rem' }}>
                          <span style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--success)',
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                          }}>
                            ✓ Onaylandı
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/sozlesme/${contract.id}`)}
                        >
                          Sözleşmeyi Görüntüle
                        </button>
                        {!isRequiredContract(contract.type) && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleRejectContract(contract.id, contract.title)}
                            style={{
                              backgroundColor: 'var(--danger)',
                              color: 'white',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc2626'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--danger)'
                            }}
                          >
                            Sözleşmeyi Feshet
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          <div className="legal-footer">
            <button onClick={() => navigate('/profil')} className="btn btn-secondary">
              Profilime Dön
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default MyContracts


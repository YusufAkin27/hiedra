import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SEO from './SEO'
import './LegalPages.css'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

/**
 * ContractType'a göre sözleşme gösteren genel component
 * @param {string} contractType - ContractType enum değeri (GIZLILIK, KULLANIM, KVKK, vb.)
 * @param {string} seoTitle - SEO başlığı
 * @param {string} seoDescription - SEO açıklaması
 * @param {string} seoUrl - SEO URL'i
 */
const ContractByType = ({ contractType, seoTitle, seoDescription, seoUrl }) => {
  const navigate = useNavigate()
  const { accessToken, isAuthenticated } = useAuth()
  const toast = useToast()
  const [contract, setContract] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAccepted, setIsAccepted] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(`${API_BASE_URL}/contracts/type/${contractType}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(isAuthenticated && accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        })
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Sözleşme bulunamadı')
          } else {
            setError('Sözleşme yüklenirken bir hata oluştu')
          }
          setIsLoading(false)
          return
        }

        const data = await response.json()
        if (data.isSuccess || data.success) {
          setContract(data.data)
          // Onay durumunu kontrol et
          if (isAuthenticated && data.data) {
            checkAcceptanceStatus(data.data.id)
          }
        } else {
          setError(data.message || 'Sözleşme yüklenemedi')
        }
      } catch (err) {
        console.error('Sözleşme yüklenirken hata:', err)
        setError('Sözleşme yüklenirken bir hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }

    if (contractType) {
      fetchContract()
    }
  }, [contractType, accessToken, isAuthenticated])

  const checkAcceptanceStatus = async (contractId) => {
    if (!isAuthenticated || !accessToken) {
      setIsAccepted(false)
      return
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/status`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          setIsAccepted(data.data?.accepted || false)
        }
      }
    } catch (err) {
      console.error('Onay durumu kontrol edilirken hata:', err)
    }
  }

  const handleAcceptContract = async () => {
    if (!isAuthenticated || !contract || !accessToken) {
      return
    }
    
    setIsAccepting(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/${contract.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Sözleşme onaylanamadı')
      }

      const data = await response.json()
      if (data.isSuccess || data.success) {
        setIsAccepted(true)
        toast.success('Sözleşme başarıyla onaylandı!')
      } else {
        const errorMsg = data.message || 'Sözleşme onaylanamadı'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (err) {
      console.error('Sözleşme onaylama hatası:', err)
      const errorMsg = err.message || 'Sözleşme onaylanırken bir hata oluştu'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="legal-page">
        <SEO title={seoTitle} description={seoDescription} url={seoUrl} />
        <div className="legal-container">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="legal-page">
        <SEO title={seoTitle} description={seoDescription} url={seoUrl} />
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

  if (!contract) {
    return (
      <div className="legal-page">
        <SEO title={seoTitle} description={seoDescription} url={seoUrl} />
        <div className="legal-container">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <h1>Sözleşme Bulunamadı</h1>
            <p>Aradığınız sözleşme mevcut değil veya aktif değil.</p>
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
      <SEO title={seoTitle} description={seoDescription} url={seoUrl} />
      <div className="legal-page">
        <div className="legal-container">
          <div className="legal-header">
            <h1>{contract.title}</h1>
            <p className="legal-version">Versiyon: {contract.version}</p>
            <p className="legal-date">
              Son Güncelleme: {new Date(contract.updatedAt).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="legal-content" dangerouslySetInnerHTML={{ __html: contract.content }} />

          <div className="legal-actions">
            {isAuthenticated && isAccepted ? (
              <p className="legal-accepted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Bu sözleşmeyi {new Date(contract.updatedAt).toLocaleDateString('tr-TR')} tarihinde onayladınız.
              </p>
            ) : (
              isAuthenticated && (
                <button
                  onClick={handleAcceptContract}
                  className="btn btn-primary"
                  disabled={isAccepting}
                >
                  {isAccepting ? 'Onaylanıyor...' : 'Sözleşmeyi Oku ve Onayla'}
                </button>
              )
            )}
            {!isAuthenticated && (
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                Sözleşmeyi onaylamak için giriş yapmalısınız.
              </p>
            )}
          </div>
          <div className="legal-footer">
            <button onClick={() => navigate(-1)} className="btn btn-secondary">
              Geri Dön
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ContractByType


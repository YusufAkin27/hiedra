import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SEO from './SEO'
import './LegalPages.css'
import { useToast } from './Toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Contract = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [contract, setContract] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(`${API_BASE_URL}/contracts/${id}`)
        
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
          checkAcceptanceStatus(data.data.id)
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

    if (id) {
      fetchContract()
    }
  }, [id])

  const checkAcceptanceStatus = async (contractId) => {
    try {
      const guestUserId = localStorage.getItem('guestUserId')
      const accessToken = localStorage.getItem('accessToken')
      
      const headers = {
        'Content-Type': 'application/json',
      }
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }
      
      const url = `${API_BASE_URL}/contracts/${contractId}/status${guestUserId ? `?guestUserId=${encodeURIComponent(guestUserId)}` : ''}`
      const response = await fetch(url, { headers })
      
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

  const handleAccept = async () => {
    try {
      setIsAccepting(true)
      
      const guestUserId = localStorage.getItem('guestUserId')
      const accessToken = localStorage.getItem('accessToken')
      
      const headers = {
        'Content-Type': 'application/json',
      }
      
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }
      
      const url = `${API_BASE_URL}/contracts/${id}/accept${guestUserId ? `?guestUserId=${encodeURIComponent(guestUserId)}` : ''}`
      const response = await fetch(url, {
        method: 'POST',
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isSuccess || data.success) {
          setIsAccepted(true)
          toast.success('Sözleşme başarıyla onaylandı!')
        } else {
          const errorMsg = data.message || 'Sözleşme onaylanamadı'
          toast.error(errorMsg)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.message || 'Sözleşme onaylanamadı'
        toast.error(errorMsg)
      }
    } catch (err) {
      console.error('Sözleşme onaylanırken hata:', err)
      toast.error('Sözleşme onaylanırken bir hata oluştu')
    } finally {
      setIsAccepting(false)
    }
  }

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

  if (error || !contract) {
    return (
      <div className="legal-page">
        <div className="legal-container">
          <div className="legal-error">
            <h1>Hata</h1>
            <p>{error || 'Sözleşme bulunamadı'}</p>
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
        title={`${contract.title} - Hiedra Home`}
        description={contract.content.substring(0, 160)}
      />
      <div className="legal-page">
        <div className="legal-container">
          <div className="legal-header">
            <h1>{contract.title}</h1>
            {contract.version && (
              <p className="legal-version">Versiyon: {contract.version}</p>
            )}
            {contract.updatedAt && (
              <p className="legal-date">
                Son Güncelleme: {new Date(contract.updatedAt).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          <div 
            className="legal-content"
            dangerouslySetInnerHTML={{ __html: contract.content }}
          />

          {contract.requiredApproval && (
            <div className="legal-actions">
              {isAccepted ? (
                <div className="legal-accepted">
                  <p>✓ Bu sözleşmeyi onayladınız</p>
                </div>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="btn btn-primary"
                >
                  {isAccepting ? 'Onaylanıyor...' : 'Sözleşmeyi Onayla'}
                </button>
              )}
            </div>
          )}

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

export default Contract


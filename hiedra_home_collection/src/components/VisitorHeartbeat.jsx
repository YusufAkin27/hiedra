import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const STORAGE_KEY = 'hiedra_active_session_id'

function VisitorHeartbeat() {
  const location = useLocation()
  const { isAuthenticated, accessToken } = useAuth()
  const sessionRef = useRef(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null)
  const isBrowser = typeof window !== 'undefined'

  const currentPath = useMemo(() => {
    const path = location.pathname || '/'
    const search = location.search || ''
    return `${path}${search}`
  }, [location.pathname, location.search])

  const sendHeartbeat = useCallback(async () => {
    if (!isBrowser) {
      return
    }

    try {
      const payload = {
        sessionId: sessionRef.current,
        currentPage: currentPath,
        visitorType: isAuthenticated ? 'USER' : 'GUEST',
      }

      const headers = {
        'Content-Type': 'application/json',
      }

      if (isAuthenticated && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE_URL}/visitors/heartbeat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch((fetchError) => {
        // Backend bağlantı hatası - sessizce ignore et (backend çalışmıyor olabilir)
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          return null
        }
        throw fetchError
      })

      if (!response || !response.ok) {
        return
      }

      const result = await response.json().catch(() => null)
      const returnedSessionId = result?.data?.sessionId
      if (returnedSessionId && returnedSessionId !== sessionRef.current) {
        sessionRef.current = returnedSessionId
        localStorage.setItem(STORAGE_KEY, returnedSessionId)
      }
    } catch (error) {
      console.error('Ziyaretçi heartbeat hatası:', error)
    }
  }, [accessToken, currentPath, isAuthenticated, isBrowser])

  useEffect(() => {
    sendHeartbeat()
  }, [sendHeartbeat])

  useEffect(() => {
    if (!isBrowser) {
      return
    }
    const interval = window.setInterval(sendHeartbeat, 300_000) // 5 dakika
    return () => window.clearInterval(interval)
  }, [sendHeartbeat, isBrowser])

  useEffect(() => {
    if (!isBrowser) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [sendHeartbeat, isBrowser])

  return null
}

export default VisitorHeartbeat



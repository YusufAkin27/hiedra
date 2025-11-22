import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AuthResponse } from '../services/authService'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
const STORAGE_KEY = 'hiedra_admin_session_id'

type SessionHeartbeatProps = {
  session: AuthResponse | null
  currentPage: string
  selectedProductId?: number | null
  selectedOrderId?: number | null
  selectedUserId?: number | null
}

function SessionHeartbeat({
  session,
  currentPage,
  selectedOrderId,
  selectedProductId,
  selectedUserId,
}: SessionHeartbeatProps) {
  const sessionRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  )
  const accessToken = session?.accessToken ?? null
  const visitorType = session ? 'ADMIN' : 'GUEST'
  const isBrowser = typeof window !== 'undefined'

  const currentView = useMemo(() => {
    let suffix = ''
    if (selectedProductId) {
      suffix = `#product=${selectedProductId}`
    } else if (selectedOrderId) {
      suffix = `#order=${selectedOrderId}`
    } else if (selectedUserId) {
      suffix = `#user=${selectedUserId}`
    }
    return `/admin/${currentPage}${suffix}`
  }, [currentPage, selectedOrderId, selectedProductId, selectedUserId])

  const sendHeartbeat = useCallback(async () => {
    if (!isBrowser) {
      return
    }
    try {
      const payload = {
        sessionId: sessionRef.current,
        currentPage: currentView,
        visitorType,
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE_URL}/visitors/heartbeat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return
      }

      const data = await response.json().catch(() => null)
      const returnedSessionId: string | undefined = data?.data?.sessionId
      if (returnedSessionId && returnedSessionId !== sessionRef.current) {
        sessionRef.current = returnedSessionId
        localStorage.setItem(STORAGE_KEY, returnedSessionId)
      }
    } catch (error) {
      console.error('Admin heartbeat hatası:', error)
    }
  }, [accessToken, currentView, isBrowser, visitorType])

  useEffect(() => {
    sendHeartbeat()
  }, [sendHeartbeat])

  useEffect(() => {
    if (!isBrowser) {
      return
    }
    const interval = window.setInterval(sendHeartbeat, 300_000)
    return () => window.clearInterval(interval)
  }, [sendHeartbeat, isBrowser])

  useEffect(() => {
    if (!isBrowser || typeof document === 'undefined') {
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

export default SessionHeartbeat



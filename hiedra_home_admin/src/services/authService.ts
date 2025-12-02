export type AuthUser = {
  id: number
  email: string
  role: string
  emailVerified: boolean
  active: boolean
  lastLoginAt?: string | null
}

export type AuthResponse = {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

type ApiResponse<T> = {
  message?: string
  isSuccess?: boolean
  success?: boolean
  data?: T
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const SESSION_STORAGE_KEY = 'hiedra_admin_session'
const CLIENT_IP_STORAGE_KEY = 'hiedra_client_ip'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // Client IP'yi header olarak gönder
  const clientIp = sessionStorage.getItem(CLIENT_IP_STORAGE_KEY)
  if (clientIp) {
    headers['X-Client-IP'] = clientIp
  }

  return headers
}

// Admin panel API çağrıları için header'ları al (Authorization + X-Client-IP)
export function getAdminHeaders(accessToken: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  }

  // Client IP'yi header olarak gönder
  const clientIp = sessionStorage.getItem(CLIENT_IP_STORAGE_KEY)
  if (clientIp) {
    headers['X-Client-IP'] = clientIp
    console.debug('X-Client-IP header gönderiliyor:', clientIp)
  } else {
    console.warn('X-Client-IP header gönderilemedi: sessionStorage\'da IP bulunamadı')
  }

  return headers
}

// IP adresini al ve sessionStorage'a kaydet
async function fetchAndStoreClientIp(): Promise<void> {
  try {
    // Önce local network IP'sini al (WebRTC ile)
    const localIp = await getLocalNetworkIp()
    
    // Local network IP'sini kullan (10.x.x.x, 192.168.x.x gibi) - localhost değilse
    if (localIp && localIp !== '127.0.0.1' && localIp !== '::1' && localIp !== '0:0:0:0:0:0:0:1') {
      console.log('IP adresi alındı (local network):', localIp)
      sessionStorage.setItem(CLIENT_IP_STORAGE_KEY, localIp)
      return
    }
    
    // Local IP yoksa veya localhost ise, public IP'yi al
    const publicIp = await getClientIpAddress()
    if (publicIp) {
      console.log('IP adresi alındı (public):', publicIp)
      sessionStorage.setItem(CLIENT_IP_STORAGE_KEY, publicIp)
      return
    }
    
    console.warn('IP adresi alınamadı, backend kendi IP tespitini kullanacak')
  } catch (error) {
    console.warn('IP adresi alınamadı:', error)
  }
}

export function saveSession(session: AuthResponse): void {
  try {
    const encrypted = btoa(JSON.stringify(session))
    sessionStorage.setItem(SESSION_STORAGE_KEY, encrypted)
  } catch (error) {
    console.error('Session kaydedilemedi:', error)
  }
}

export function loadSession(): AuthResponse | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const decrypted = JSON.parse(atob(stored)) as AuthResponse

    if (!decrypted.accessToken || !decrypted.user) {
      clearSession()
      return null
    }

    return decrypted
  } catch (error) {
    console.error('Session yüklenemedi:', error)
    clearSession()
    return null
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch (error) {
    console.error('Session temizlenemedi:', error)
  }
}

export async function checkAdminEmail(email: string): Promise<string> {
  // IP adresini al ve kaydet
  await fetchAndStoreClientIp()
  
  const response = await fetch(`${apiBaseUrl}/auth/admin/check-email`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  })

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<boolean>

  const success = payload.isSuccess ?? payload.success ?? false

  if (!response.ok || !success || payload.data !== true) {
    const message = payload.message ?? 'Bu e-posta için yönetici yetkisi bulunmuyor.'
    throw new Error(message)
  }

  return payload.message ?? 'Yönetici e-postası doğrulandı.'
}

export async function requestLoginCode(email: string): Promise<string> {
  // IP adresini al ve kaydet
  await fetchAndStoreClientIp()
  
  const response = await fetch(`${apiBaseUrl}/auth/admin/request-code`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  })

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<null>

  const success = payload.isSuccess ?? payload.success ?? false

  if (!response.ok || !success) {
    const message = payload.message ?? 'Doğrulama kodu gönderilemedi.'
    throw new Error(message)
  }

  return payload.message ?? 'Doğrulama kodu gönderildi.'
}

export async function resendLoginCode(email: string): Promise<string> {
  // IP adresini al ve kaydet
  await fetchAndStoreClientIp()
  
  const response = await fetch(`${apiBaseUrl}/auth/admin/resend-code`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  })

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<null>

  const success = payload.isSuccess ?? payload.success ?? false

  if (!response.ok || !success) {
    const message = payload.message ?? 'Yeni doğrulama kodu gönderilemedi.'
    throw new Error(message)
  }

  return payload.message ?? 'Yeni doğrulama kodu gönderildi.'
}

export async function verifyLoginCode(email: string, code: string): Promise<AuthResponse> {
  // IP adresini al ve kaydet
  await fetchAndStoreClientIp()
  
  const response = await fetch(`${apiBaseUrl}/auth/admin/verify-code`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email, code }),
  })

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<AuthResponse>

  const success = payload.isSuccess ?? payload.success ?? false

  if (!response.ok || !success || !payload.data) {
    const message = payload.message ?? 'Doğrulama kodu geçersiz.'
    throw new Error(message)
  }

  return payload.data
}

// IP adresini almak için yardımcı fonksiyon
async function getClientIpAddress(): Promise<string | null> {
  try {
    // Timeout ile IP servisi çağrısı
    const fetchWithTimeout = (url: string, timeout = 3000): Promise<Response> => {
      return Promise.race([
        fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ])
    }
    
    // Önce bir IP servisi ile gerçek IP'yi al (ipify.org)
    try {
      const ipResponse = await fetchWithTimeout('https://api.ipify.org?format=json', 3000)
      
      if (ipResponse.ok) {
        const ipData = await ipResponse.json() as { ip: string }
        if (ipData.ip && ipData.ip.trim() !== '' && ipData.ip !== '127.0.0.1' && ipData.ip !== '::1') {
          console.log('IP adresi alındı (ipify):', ipData.ip)
          return ipData.ip.trim()
        }
      }
    } catch (error) {
      console.warn('ipify servisi ile IP alınamadı, alternatif deneniyor:', error)
    }
    
    // Alternatif IP servisi (text format)
    try {
      const altResponse = await fetchWithTimeout('https://api.ipify.org?format=text', 3000)
      
      if (altResponse.ok) {
        const ipText = await altResponse.text()
        if (ipText && ipText.trim() !== '' && ipText.trim() !== '127.0.0.1' && ipText.trim() !== '::1') {
          console.log('IP adresi alındı (ipify text):', ipText.trim())
          return ipText.trim()
        }
      }
    } catch (error) {
      console.warn('Alternatif IP servisi ile IP alınamadı:', error)
    }
  } catch (error) {
    console.warn('IP servisi ile IP alınamadı:', error)
  }
  
  // Fallback: Eğer IP servisi çalışmazsa, backend'in kendi IP tespitini kullanması için null döndür
  return null
}

async function getLocalNetworkIp(): Promise<string | null> {
  return new Promise((resolve) => {
    const RTCPeerConnection = window.RTCPeerConnection || (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection
    if (!RTCPeerConnection) {
      console.warn('WebRTC desteklenmiyor, local network IP alınamadı')
      resolve(null)
      return
    }

    const pc = new RTCPeerConnection({ 
      iceServers: [],
      iceCandidatePoolSize: 10
    })
    const ips: string[] = []
    let resolved = false

    const finish = () => {
      if (resolved) return
      resolved = true
      pc.close()
      
      // Öncelik sırası: 10.x.x.x > 192.168.x.x > diğerleri
      const preferredIp = ips.find(ip => ip.startsWith('10.')) || 
                          ips.find(ip => ip.startsWith('192.168.')) || 
                          ips[0]
      
      resolve(preferredIp || null)
    }

    pc.createDataChannel('')
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate
        // IPv4 IP'lerini al
        const match = candidate.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/)
        if (match) {
          const ip = match[1]
          // Localhost ve multicast IP'lerini hariç tut
          if (!ips.includes(ip) && 
              !ip.startsWith('127.') && 
              !ip.startsWith('169.254.') && 
              !ip.startsWith('224.') &&
              !ip.startsWith('239.')) {
            ips.push(ip)
            console.debug('Local network IP bulundu:', ip)
          }
        }
      } else {
        // Tüm candidate'ler geldi
        finish()
      }
    }

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        finish()
      }
    }

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch((error) => {
        console.warn('WebRTC offer oluşturulamadı:', error)
        finish()
      })

    // Timeout: 3 saniye
    setTimeout(() => {
      finish()
    }, 3000)
  })
}



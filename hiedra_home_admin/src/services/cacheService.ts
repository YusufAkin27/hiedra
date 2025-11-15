/**
 * Cache Service - API isteklerini cache'ler ve HTTP caching header'larını kullanır
 */

type CacheEntry<T> = {
  data: T
  timestamp: number
  etag?: string
  expiresAt: number
}

type CacheOptions = {
  ttl?: number // Time to live in milliseconds (default: 5 minutes)
  useHttpCache?: boolean // Use HTTP caching headers (ETag, Last-Modified)
}

const DEFAULT_TTL = 5 * 60 * 1000 // 5 dakika
const CACHE_PREFIX = 'admin_cache_'

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private maxMemorySize = 50 // Maximum number of entries in memory

  /**
   * Cache'den veri getir
   */
  get<T>(key: string): T | null {
    // Önce memory cache'den kontrol et
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data as T
    }

    // Memory cache'den sil
    if (memoryEntry) {
      this.memoryCache.delete(key)
    }

    // LocalStorage'dan kontrol et
    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored)
        if (entry.expiresAt > Date.now()) {
          // Memory cache'e de ekle
          this.setMemoryCache(key, entry)
          return entry.data
        } else {
          // Expired, sil
          localStorage.removeItem(`${CACHE_PREFIX}${key}`)
        }
      }
    } catch (err) {
      console.error('Cache read error:', err)
    }

    return null
  }

  /**
   * Cache'e veri kaydet
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? DEFAULT_TTL
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    }

    // Memory cache'e ekle
    this.setMemoryCache(key, entry)

    // LocalStorage'a kaydet
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry))
    } catch (err) {
      console.error('Cache write error:', err)
      // LocalStorage doluysa, en eski entry'leri sil
      this.cleanupLocalStorage()
    }
  }

  /**
   * ETag ile cache'e kaydet
   */
  setWithEtag<T>(key: string, data: T, etag: string, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? DEFAULT_TTL
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      etag,
      expiresAt: Date.now() + ttl,
    }

    this.setMemoryCache(key, entry)

    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry))
    } catch (err) {
      console.error('Cache write error:', err)
      this.cleanupLocalStorage()
    }
  }

  /**
   * Cache'den ETag getir
   */
  getEtag(key: string): string | undefined {
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry) {
      return memoryEntry.etag
    }

    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (stored) {
        const entry: CacheEntry<any> = JSON.parse(stored)
        return entry.etag
      }
    } catch (err) {
      console.error('Cache ETag read error:', err)
    }

    return undefined
  }

  /**
   * Cache'i temizle
   */
  clear(key?: string): void {
    if (key) {
      this.memoryCache.delete(key)
      localStorage.removeItem(`${CACHE_PREFIX}${key}`)
    } else {
      this.memoryCache.clear()
      // Tüm cache key'lerini temizle
      const keys = Object.keys(localStorage)
      keys.forEach((k) => {
        if (k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k)
        }
      })
    }
  }

  /**
   * Cache'lenmiş fetch isteği yap
   */
  async fetch<T>(
    url: string,
    options: RequestInit & { cacheKey?: string; cacheOptions?: CacheOptions } = {}
  ): Promise<{ data: T; fromCache: boolean; etag?: string }> {
    const { cacheKey, cacheOptions, ...fetchOptions } = options
    const key = cacheKey || url

    // Cache'den kontrol et
    const cached = this.get<T>(key)
    if (cached) {
      return { data: cached, fromCache: true }
    }

    // ETag varsa header'a ekle
    const etag = this.getEtag(key)
    const headers = new Headers(fetchOptions.headers)
    if (etag) {
      headers.set('If-None-Match', etag)
    }

    // Fetch isteği yap
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // 304 Not Modified - Cache'den döndür
    if (response.status === 304) {
      const cachedData = this.get<T>(key)
      if (cachedData) {
        return { data: cachedData, fromCache: true, etag }
      }
      // Cache'de yoksa (nadir durum), yeni istek yap
    }

    // Yeni veri geldi
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = (await response.json()) as T
    const responseEtag = response.headers.get('ETag')

    // Cache'e kaydet
    if (responseEtag) {
      this.setWithEtag(key, data, responseEtag, cacheOptions)
    } else {
      this.set(key, data, cacheOptions)
    }

    return { data, fromCache: false, etag: responseEtag || undefined }
  }

  /**
   * Memory cache'e ekle (size limit kontrolü ile)
   */
  private setMemoryCache(key: string, entry: CacheEntry<any>): void {
    // Size limit kontrolü
    if (this.memoryCache.size >= this.maxMemorySize) {
      // En eski entry'yi bul ve sil
      let oldestKey: string | null = null
      let oldestTime = Infinity

      this.memoryCache.forEach((value, k) => {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp
          oldestKey = k
        }
      })

      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
      }
    }

    this.memoryCache.set(key, entry)
  }

  /**
   * LocalStorage temizleme (dolu olduğunda)
   */
  private cleanupLocalStorage(): void {
    try {
      const entries: Array<{ key: string; timestamp: number }> = []
      const keys = Object.keys(localStorage)

      keys.forEach((k) => {
        if (k.startsWith(CACHE_PREFIX)) {
          try {
            const stored = localStorage.getItem(k)
            if (stored) {
              const entry: CacheEntry<any> = JSON.parse(stored)
              entries.push({ key: k, timestamp: entry.timestamp })
            }
          } catch {
            // Invalid entry, skip
          }
        }
      })

      // En eski %20'sini sil
      entries.sort((a, b) => a.timestamp - b.timestamp)
      const toDelete = Math.ceil(entries.length * 0.2)

      for (let i = 0; i < toDelete; i++) {
        localStorage.removeItem(entries[i].key)
      }
    } catch (err) {
      console.error('LocalStorage cleanup error:', err)
    }
  }

  /**
   * Expired cache'leri temizle
   */
  cleanup(): void {
    const now = Date.now()

    // Memory cache temizle
    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key)
      }
    })

    // LocalStorage temizle
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((k) => {
        if (k.startsWith(CACHE_PREFIX)) {
          try {
            const stored = localStorage.getItem(k)
            if (stored) {
              const entry: CacheEntry<any> = JSON.parse(stored)
              if (entry.expiresAt <= now) {
                localStorage.removeItem(k)
              }
            }
          } catch {
            // Invalid entry, sil
            localStorage.removeItem(k)
          }
        }
      })
    } catch (err) {
      console.error('Cache cleanup error:', err)
    }
  }
}

// Singleton instance
export const cacheService = new CacheService()

// Her 10 dakikada bir expired cache'leri temizle
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheService.cleanup()
  }, 10 * 60 * 1000)
}


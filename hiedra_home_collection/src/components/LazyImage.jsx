import React, { useState, useRef, useEffect } from 'react'
import Loading from './Loading'
import './LazyImage.css'

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  onLoad = null,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // 50px önceden yükle
        threshold: 0.01
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
      observer.disconnect()
    }
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    if (onLoad) {
      onLoad()
    }
  }

  const handleError = () => {
    setError(true)
  }

  // Blur placeholder oluştur
  const blurPlaceholder = placeholder || (
    <div className="lazy-image-placeholder">
      <Loading size="small" variant="image" />
    </div>
  )

  return (
    <div ref={imgRef} className={`lazy-image-wrapper ${className}`} {...props}>
      {/* Loading placeholder */}
      {!isLoaded && !error && blurPlaceholder}
      
      {/* Ana görsel */}
      {isInView && (
        <>
          {!error ? (
            <img
              src={src}
              alt={alt}
              className={`lazy-image ${isLoaded ? 'lazy-image-loaded' : 'lazy-image-loading'}`}
              onLoad={handleLoad}
              onError={handleError}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="lazy-image-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span>Görsel yüklenemedi</span>
            </div>
          )}
        </>
      )}
      
      {/* Eğer henüz görünür değilse, sadece placeholder göster */}
      {!isInView && blurPlaceholder}
    </div>
  )
}

export default LazyImage


import React, { useState, useRef, useEffect } from 'react'
import Loading from './Loading'
import './LazyImage.css'

// Görsel URL'ini optimize et - WebP formatına çevir ve boyutlandır
const optimizeImageUrl = (url, width = null) => {
  if (!url) return url
  
  // Cloudinary URL'i ise transformation ekle
  if (url.includes('res.cloudinary.com')) {
    const transformations = []
    if (width) {
      transformations.push(`w_${width}`)
    }
    transformations.push('q_auto', 'f_webp', 'c_limit')
    
    // URL'de zaten transformation var mı kontrol et
    if (url.includes('/image/upload/')) {
      const parts = url.split('/image/upload/')
      if (parts.length === 2) {
        return `${parts[0]}/image/upload/${transformations.join(',')}/${parts[1]}`
      }
    }
    // Transformation yoksa ekle
    if (url.includes('/image/upload')) {
      return url.replace('/image/upload', `/image/upload/${transformations.join(',')}`)
    }
  }
  
  return url
}

// Responsive srcset oluştur
const generateSrcSet = (src, sizes = [400, 800, 1200, 1920]) => {
  if (!src) return ''
  
  // Cloudinary URL'i ise srcset oluştur
  if (src.includes('res.cloudinary.com')) {
    return sizes.map(size => `${optimizeImageUrl(src, size)} ${size}w`).join(', ')
  }
  
  // Normal URL ise sadece orijinali döndür
  return src
}

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  onLoad = null,
  sizes = null, // sizes attribute için
  srcSet = null, // Manuel srcset
  isLCP = false, // LCP element'i mi?
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    // LCP için hemen yükle
    if (isLCP) {
      setIsInView(true)
      return
    }

    // IntersectionObserver'ı optimize et - performans için
    let observer = null
    const currentRef = imgRef.current
    
    if (currentRef && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true)
              // Görüntü görünür hale geldikten sonra observer'ı kapat
              if (currentRef && observer) {
                observer.unobserve(currentRef)
              }
            }
          })
        },
        {
          rootMargin: '50px', // Optimize edilmiş rootMargin
          threshold: 0.01
        }
      )
      observer.observe(currentRef)
    } else {
      // IntersectionObserver desteklenmiyorsa hemen yükle
      setIsInView(true)
    }

    return () => {
      if (currentRef && observer) {
        observer.unobserve(currentRef)
      }
      if (observer) {
        observer.disconnect()
      }
    }
  }, [isLCP])

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

  // Layout shift önlemek için aspect ratio container
  const aspectRatioStyle = props.width && props.height 
    ? { aspectRatio: `${props.width} / ${props.height}` }
    : {}

  // Optimize edilmiş görsel URL'i
  const optimizedSrc = optimizeImageUrl(src, props.width)
  
  // Srcset oluştur (manuel srcset yoksa otomatik oluştur)
  const imageSrcSet = srcSet || (src ? generateSrcSet(src) : '')
  
  // Sizes attribute (responsive images için)
  const imageSizes = sizes || (props.width ? `${props.width}px` : '100vw')
  
  // LCP için öncelik
  const fetchPriority = isLCP ? 'high' : (props.fetchPriority || 'auto')
  const loadingAttr = isLCP ? 'eager' : 'lazy'

  return (
    <div 
      ref={imgRef} 
      className={`lazy-image-wrapper ${className}`} 
      style={aspectRatioStyle}
      {...props}
    >
      {/* Loading placeholder */}
      {!isLoaded && !error && blurPlaceholder}
      
      {/* Ana görsel */}
      {isInView || isLCP ? (
        <>
          {!error ? (
            <img
              src={optimizedSrc}
              srcSet={imageSrcSet || undefined}
              sizes={imageSizes || undefined}
              alt={alt}
              className={`lazy-image ${isLoaded ? 'lazy-image-loaded' : 'lazy-image-loading'}`}
              onLoad={handleLoad}
              onError={handleError}
              loading={loadingAttr}
              decoding="async"
              fetchpriority={fetchPriority}
              width={props.width}
              height={props.height}
              style={{
                width: props.width ? `${props.width}px` : '100%',
                height: props.height ? `${props.height}px` : 'auto',
                objectFit: props.objectFit || 'cover',
              }}
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
      ) : (
        // LCP değilse ve görünür değilse placeholder göster
        blurPlaceholder
      )}
    </div>
  )
}

export default LazyImage


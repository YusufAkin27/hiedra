import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    // Sayfa değiştiğinde veya refresh edildiğinde scroll'u en üste al
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Anında scroll, smooth değil
    })
  }, [pathname])

  // Sayfa ilk yüklendiğinde de scroll'u en üste al
  useEffect(() => {
    // Sayfa refresh edildiğinde scroll position'u sıfırla
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual'
    }
    
    // İlk yüklemede scroll'u en üste al
    window.scrollTo(0, 0)
  }, [])

  return null
}

export default ScrollToTop


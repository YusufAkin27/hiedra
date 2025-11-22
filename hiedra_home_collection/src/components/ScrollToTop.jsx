import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const { pathname } = useLocation()

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto'
      })
      // Bazı tarayıcılar için fallback
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    })
  }

  useEffect(() => {
    scrollToTop()
  }, [pathname])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.history && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    scrollToTop()
  }, [])

  return null
}

export default ScrollToTop


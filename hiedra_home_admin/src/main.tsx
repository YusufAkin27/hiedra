import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Root element'i bul ve render et
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

// Loading indicator'ı kaldır
const loader = rootElement.querySelector('.page-loader')
if (loader) {
  loader.remove()
}

// RequestIdleCallback ile render'ı optimize et (varsa)
const renderApp = () => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Browser idle olduğunda render et - main thread work optimizasyonu
if ('requestIdleCallback' in window) {
  requestIdleCallback(renderApp, { timeout: 200 })
} else {
  // Fallback: next tick'te render et
  setTimeout(renderApp, 0)
}

// Back/forward cache için - pagehide event'i kullan (beforeunload yerine)
window.addEventListener('pagehide', () => {
  // Cache'i temizleme - back/forward cache'i engellemez
}, { passive: true })


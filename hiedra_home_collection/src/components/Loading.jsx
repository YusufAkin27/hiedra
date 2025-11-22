import React from 'react'
import './Loading.css'

const Loading = ({ 
  size = 'medium', 
  text = null, 
  fullScreen = false,
  variant = 'default' // 'default', 'image', 'page'
}) => {
  const sizeClass = `loading-${size}`
  const variantClass = `loading-${variant}`
  const containerClass = fullScreen ? 'loading-fullscreen' : 'loading-container'

  return (
    <div className={`${containerClass} ${variantClass}`}>
      <div className={`loading-spinner ${sizeClass}`}>
        <div className="loading-ring loading-ring-1"></div>
        <div className="loading-ring loading-ring-2"></div>
        <div className="loading-ring loading-ring-3"></div>
        <div className="loading-center"></div>
      </div>
      {text && (
        <p className="loading-text">{text}</p>
      )}
    </div>
  )
}

export default Loading


import React, { memo } from 'react'
import './CategoryHeader.css'

/**
 * CategoryHeader Component
 * Kategori başlıkları için tutarlı bir tasarım sağlar
 * 
 * @param {string} title - Kategori başlığı
 * @param {string} subtitle - Alt başlık (örn: "5 ürün")
 * @param {string} className - Ek CSS class'ları
 */
const CategoryHeader = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`category-header-home ${className}`}>
      <h2 className="category-title-home">{title}</h2>
      {subtitle && (
        <p className="category-subtitle-home">{subtitle}</p>
      )}
    </div>
  )
}

// React.memo ile gereksiz re-render'ları önle
export default memo(CategoryHeader)


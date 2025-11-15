import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LazyImage from './LazyImage'
import SEO from './SEO'
import './Categories.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const Categories = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        // Backend'den kategorileri çek
        const response = await fetch(`${API_BASE_URL}/categories`)
        if (response.ok) {
          const data = await response.json()
          if (data.isSuccess || data.success) {
            const categoriesData = data.data || []
            
            // Her kategori için ürün sayısını ve görseli almak için ürünleri de çek
            const productsResponse = await fetch(`${API_BASE_URL}/products?page=0&size=1000`)
            if (productsResponse.ok) {
              const productsData = await productsResponse.json()
              let productsList = []
              if (productsData.isSuccess || productsData.success) {
                if (productsData.data) {
                  if (productsData.data.content && Array.isArray(productsData.data.content)) {
                    productsList = productsData.data.content
                  } else if (Array.isArray(productsData.data)) {
                    productsList = productsData.data
                  }
                }
              }
              
              // Kategorilere ürün sayısı ve görsel ekle
              const categoriesWithProducts = categoriesData.map(category => {
                const categoryProducts = productsList.filter(
                  product => product.category && product.category.id === category.id
                )
                
                return {
                  id: category.id,
                  name: category.name,
                  description: category.description || '',
                  productCount: categoryProducts.length,
                  image: categoryProducts.length > 0 && categoryProducts[0].coverImageUrl 
                    ? categoryProducts[0].coverImageUrl 
                    : null
                }
              })
              
              setCategories(categoriesWithProducts)
            } else {
              // Ürünler yüklenemezse sadece kategorileri göster
              const categoriesList = categoriesData.map(category => ({
                id: category.id,
                name: category.name,
                description: category.description || '',
                productCount: 0,
                image: null
              }))
              setCategories(categoriesList)
            }
          } else {
            setError(data.message || 'Kategoriler yüklenemedi')
          }
        } else {
          setError('Kategoriler yüklenirken bir hata oluştu')
        }
      } catch (err) {
        console.error('Kategoriler yükleme hatası:', err)
        setError('Kategoriler yüklenirken bir hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleCategoryClick = (categoryId, categoryName) => {
    // Kategori adını URL-friendly hale getir
    const slug = categoryName.toLowerCase().replace(/\s+/g, '-')
    navigate(`/kategori/${categoryId}/${slug}`)
  }

  if (isLoading) {
    return (
      <div className="categories-page">
        <div className="categories-container">
          <div className="loading-state">
            <p>Kategoriler yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="categories-page">
        <div className="categories-container">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-btn">
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title="Kategorilerimiz - Hiedra Home Collection"
        description="Hiedra Home Collection'daki tüm perde kategorilerini keşfedin. Tül perde, zebra perde, klasik perde ve daha fazlası."
      />
      <div className="categories-page">
        <div className="categories-container">
          <header className="categories-header">
            <h1>Kategorilerimiz</h1>
            <p>Geniş ürün yelpazemizdeki kategorileri keşfedin</p>
          </header>

          {categories.length === 0 ? (
            <div className="no-categories">
              <p>Henüz kategori bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="categories-grid">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="category-card"
                  onClick={() => handleCategoryClick(category.id, category.name)}
                >
                  <div className="category-image-wrapper">
                    <LazyImage
                      src={category.image || ''}
                      alt={category.name}
                      className="category-image"
                    />
                    <div className="category-overlay">
                      <span className="category-product-count">
                        {category.productCount} Ürün
                      </span>
                    </div>
                  </div>
                  <div className="category-info">
                    <h2 className="category-name">{category.name}</h2>
                    {category.description && (
                      <p className="category-description">{category.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Categories


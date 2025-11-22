# SEO Optimizasyonu - Hiedra Perde

## Yapılan SEO İyileştirmeleri

### 1. Meta Tag'ler
- ✅ Her sayfa için dinamik title, description, keywords
- ✅ Open Graph tag'leri (Facebook, LinkedIn paylaşımları için)
- ✅ Twitter Card tag'leri
- ✅ Canonical URL'ler
- ✅ Theme color ve mobile optimizasyonları

### 2. Structured Data (Schema.org)
- ✅ Product Schema (ürün sayfaları için)
- ✅ CollectionPage Schema (ana sayfa için)
- ✅ AboutPage Schema (hakkımızda için)
- ✅ ContactPage Schema (iletişim için)
- ✅ Organization Schema (şirket bilgileri)

### 3. Semantic HTML
- ✅ `<header>` tag'leri
- ✅ `<nav>` tag'leri (role ve aria-label ile)
- ✅ `<article>` tag'leri (ürün detayları için)
- ✅ `<section>` tag'leri
- ✅ `<aside>` tag'leri (sipariş özeti için)
- ✅ Doğru heading hierarchy (H1, H2, H3)

### 4. Görsel Optimizasyonları
- ✅ Descriptive alt text'ler
- ✅ Lazy loading (ilk görsel hariç)
- ✅ Eager loading ana görseller için

### 5. Sitemap ve Robots.txt
- ✅ XML Sitemap oluşturuldu
- ✅ Robots.txt dosyası eklendi
- ✅ Sitemap URL'leri robots.txt'de belirtildi

### 6. Performance
- ✅ Preconnect ve DNS-prefetch tag'leri
- ✅ Lazy loading görseller
- ✅ Optimize edilmiş meta tag'ler

## Kullanım

SEO component'i tüm sayfalara entegre edildi:
- ProductList.jsx
- ProductDetail.jsx
- About.jsx
- Contact.jsx
- Checkout.jsx
- OrderLookup.jsx

Her sayfa için özel meta tag'ler ve structured data otomatik olarak ekleniyor.

## Google Search Console

Production'a geçmeden önce:
1. Google Search Console'a siteyi ekleyin
2. Sitemap'i Google'a gönderin: `https://hiedra.com/sitemap.xml`
3. robots.txt'i kontrol edin: `https://hiedra.com/robots.txt`

## Önemli Notlar

- Production URL'i SEO.jsx dosyasında `siteUrl` değişkenini güncellemeyi unutmayın
- Her ürün için otomatik sitemap güncellemesi yapılmalı (şu an statik)
- OG image'ları eklemek için public/images/ klasörüne og-image.jpg eklenebilir


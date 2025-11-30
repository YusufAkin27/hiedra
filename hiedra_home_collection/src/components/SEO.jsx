import { Helmet } from 'react-helmet-async'

const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  structuredData,
  noindex = false
}) => {
  const siteName = 'Hiedra Perde'
  const defaultTitle = 'Perde Satış - Tül Perde, Zebra Perde Fiyatları | Hiedra Perde'
  const defaultDescription = 'Perde satış ve tül perde fiyatları için Hiedra Perde. Zebra perde, Klasik perde, Stor perde, Jaluzi perde ve tül perde modelleri. Uygun perde fiyatı, kaliteli perde kumaşı, hızlı perde teslimat. Perde satış için doğru adres!'
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hiedra.com'
  
  // "Perde Satış" keyword'ünü vurgulayalım
  const optimizedTitle = title 
    ? title.includes('perde satış') || title.includes('Perde Satış')
      ? `${title} | ${siteName}`
      : `${title} - Perde Satış | ${siteName}`
    : defaultTitle
    
  const optimizedDescription = description 
    ? description.includes('perde satış') || description.includes('Perde Satış')
      ? description
      : `${description} Perde satış için Hiedra'yı ziyaret edin.`
    : defaultDescription

  const pageUrl = url ? `${siteUrl}${url}` : siteUrl
  const pageImage = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : `${siteUrl}/logo.png`
  
  // Genişletilmiş keywords (SEO optimizasyonu için kapsamlı anahtar kelimeler)
  const defaultKeywords = 'perde satış, online perde satış, perde satın al, perdeler, perde tül, tül perde, perde fiyatı, perde fiyatları, zebra perde, zebra perde satış, klasik perde, klasik perde satış, stor perde, stor perde satış, jaluzi perde, jaluzi perde satış, tül perde satış, tül perde fiyatı, perde tül fiyatı, uygun perde, uygun perde fiyatları, kaliteli perde, kaliteli perde satış, perde modelleri, perde çeşitleri, perde koleksiyonu, perde kumaşı, perde kumaşları, perde ölçüsü, özel ölçü perde, perde sipariş, perde teslimat, türkiye perde satış, bingöl perde, bingöl perde satışı, bingöl tül perde, erzurum perde, erzurum perde satışı, erzurum tül perde, perde dekorasyon, ev dekorasyonu, pencere perdesi, salon perdesi, yatak odası perdesi, mutfak perdesi, banyo perdesi, ofis perdesi, işyeri perdesi, toptan perde, perakende perde, perde montaj, perde kurulum, perde bakım, perde temizlik, perde yıkama, perde onarım, perde değişim, perde iade, perde değiştirme, perde yenileme, modern perde, şık perde, lüks perde, ekonomik perde, indirimli perde, kampanyalı perde, perde kampanya, perde indirim, perde fırsat, perde özel fiyat, perde toptan fiyat, perde perakende fiyat, metre perde fiyatı, m2 perde fiyatı, perde m2 fiyat, perde metre fiyat'
  const pageKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords

  // LocalBusiness Schema (Yerel SEO için)
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}#business`,
    name: 'Hiedra Perde',
    alternateName: 'Hiedra Perde Satış',
    image: `${siteUrl}/logo.png`,
    logo: `${siteUrl}/logo.png`,
    description: 'Bingöl ve Türkiye genelinde perde satış ve tül perde fiyatları sunan güvenilir firma. Zebra perde, Klasik perde, Stor perde, Jaluzi perde ve tül perde modelleri. Uygun perde fiyatı ile kaliteli perde satış.',
    telephone: '+905113233289',
    email: 'ysufakin23@gmail.com',
    priceRange: '₺₺',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Kültür Mahallesi, Örnek Sokak No:123',
      addressLocality: 'Bingöl',
      addressRegion: 'Bingöl',
      postalCode: '12000',
      addressCountry: 'TR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '38.8847',
      longitude: '40.4986'
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00'
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '10:00',
        closes: '16:00'
      }
    ],
    areaServed: [
      {
        '@type': 'City',
        name: 'Bingöl'
      },
      {
        '@type': 'State',
        name: 'Bingöl'
      },
      {
        '@type': 'Country',
        name: 'Türkiye'
      }
    ],
    serviceType: 'Perde Satış ve Dekorasyon',
    url: siteUrl,
    sameAs: [
      // Sosyal medya linkleri buraya eklenebilir
    ]
  }

  // Organization Schema (her sayfada)
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Müşteri Hizmetleri',
      telephone: '+905113233289',
      email: 'ysufakin23@gmail.com',
      areaServed: 'TR',
      availableLanguage: 'Turkish'
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Kültür Mahallesi, Örnek Sokak No:123',
      addressLocality: 'Bingöl',
      addressRegion: 'Bingöl',
      postalCode: '12000',
      addressCountry: 'TR'
    },
    sameAs: [
      // Sosyal medya linkleri buraya eklenebilir
    ]
  }

  // Breadcrumb Schema
  const breadcrumbSchema = url && url !== '/' ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: siteUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: title || 'Sayfa',
        item: pageUrl
      }
    ]
  } : null

  // Tüm structured data'yı birleştir
  // structuredData array veya tek obje olabilir
  const structuredDataArray = Array.isArray(structuredData) ? structuredData : (structuredData ? [structuredData] : [])
  const allStructuredData = [
    localBusinessSchema, // Yerel SEO için LocalBusiness schema
    organizationSchema,
    ...structuredDataArray,
    breadcrumbSchema
  ].filter(Boolean)

  return (
    <Helmet>
      {/* Temel Meta Tag'ler */}
      <title>{optimizedTitle}</title>
      <meta name="description" content={optimizedDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="author" content="Hiedra Perde" />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"} />
      <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={pageUrl} />

      {/* Language */}
      <html lang="tr" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={optimizedTitle} />
      <meta property="og:description" content={optimizedDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || siteName} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:locale:alternate" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={optimizedTitle} />
      <meta name="twitter:description" content={optimizedDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:image:alt" content={title || siteName} />

      {/* Mobile Optimizations */}
      <meta name="theme-color" content="#667eea" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      {/* Geo Location (Türkiye) */}
      <meta name="geo.region" content="TR" />
      <meta name="geo.placename" content="Türkiye" />

      {/* Structured Data */}
      {allStructuredData.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  )
}

export default SEO


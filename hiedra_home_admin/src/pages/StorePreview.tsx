import { useMemo, useState } from 'react'
import {
  FaDesktop,
  FaMobileAlt,
  FaExternalLinkAlt,
  FaPalette,
  FaShieldAlt,
  FaClock,
  FaCheckCircle,
  FaCompass,
} from 'react-icons/fa'

const DEFAULT_STORE_URL = 'http://localhost:3000'
const storePreviewUrl = import.meta.env.VITE_STORE_URL ?? DEFAULT_STORE_URL

const highlightRoutes = [
  { path: '/', label: 'Ana Sayfa' },
  { path: '/koleksiyon', label: 'Koleksiyon' },
  { path: '/siparis-sorgula', label: 'Sipariş Sorgula' },
  { path: '/iletisim', label: 'İletişim' },
]

const StorePreviewPage = () => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const storeHostname = useMemo(() => {
    try {
      const url = new URL(storePreviewUrl)
      return url.hostname.replace('www.', '')
    } catch {
      return storePreviewUrl
    }
  }, [])

  const frameWidth = viewMode === 'desktop' ? '100%' : '420px'
  const frameHeight = viewMode === 'desktop' ? '680px' : '760px'

  return (
    <main className="page store-preview-page">
      <section className="store-preview-hero">
        <div>
          <p className="eyebrow">Mağaza Önizlemesi</p>
          <h1>Hiedra Home Vitrini</h1>
          <p>
            Canlı mağaza arayüzünü farklı cihazlarda test edebilir, öne çıkan sayfalara hızlıca erişebilir ve mağazayı
            yeni sekmede açabilirsiniz.
          </p>
        </div>
        <div className="store-preview-actions">
          <button
            type="button"
            className="store-btn store-btn--outline"
            onClick={() => window.open(storePreviewUrl, '_blank', 'noopener,noreferrer')}
          >
            <FaExternalLinkAlt /> Mağazayı Yeni Sekmede Aç
          </button>
        </div>
      </section>

      <section className="store-preview-metrics">
        <article>
          <FaCheckCircle />
          <div>
            <span>Canlı Durum</span>
            <strong>Aktif</strong>
          </div>
        </article>
        <article>
          <FaClock />
          <div>
            <span>Son Kontrol</span>
            <strong>{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
        </article>
        <article>
          <FaShieldAlt />
          <div>
            <span>SSL / Güvenlik</span>
            <strong>Koruma Etkin</strong>
          </div>
        </article>
        <article>
          <FaPalette />
          <div>
            <span>Tema Varyasyonu</span>
            <strong>Hiedra Modern</strong>
          </div>
        </article>
      </section>

      <section className="store-preview-frame">
        <header>
          <div>
            <h2>{storeHostname}</h2>
            <p>Farklı cihaz boyutlarında deneyerek vitrin detaylarını kontrol edin.</p>
          </div>
          <div className="view-toggle">
            <button
              type="button"
              className={viewMode === 'desktop' ? 'active' : ''}
              onClick={() => setViewMode('desktop')}
            >
              <FaDesktop /> Masaüstü
            </button>
            <button
              type="button"
              className={viewMode === 'mobile' ? 'active' : ''}
              onClick={() => setViewMode('mobile')}
            >
              <FaMobileAlt /> Mobil
            </button>
          </div>
        </header>
        <div className={`preview-shell preview-shell--${viewMode}`}>
          <iframe
            src={storePreviewUrl}
            title="Hiedra Home Store Preview"
            style={{ width: frameWidth, height: frameHeight }}
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </section>

      <section className="store-preview-routes">
        <header>
          <div>
            <p className="eyebrow">Hızlı Geçişler</p>
            <h3>Öne Çıkan Sayfalar</h3>
          </div>
        </header>
        <div className="route-grid">
          {highlightRoutes.map((route) => (
            <article
              key={route.path}
              onClick={() => window.open(`${storePreviewUrl}${route.path}`, '_blank', 'noopener,noreferrer')}
            >
              <FaCompass />
              <div>
                <span>{route.label}</span>
                <small>{route.path || '/'}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <style>{`
        .store-preview-page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .store-preview-hero {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          background: linear-gradient(135deg, #0f172a, #312e81);
          color: #fff;
          padding: 32px;
          border-radius: 18px;
        }

        .store-preview-hero h1 {
          margin: 6px 0;
          font-size: 32px;
        }

        .eyebrow {
          text-transform: uppercase;
          font-size: 13px;
          letter-spacing: 0.2em;
          color: #cbd5f5;
        }

        .store-preview-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .store-btn {
          border: none;
          border-radius: 999px;
          padding: 12px 20px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .store-btn--outline {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.4);
          color: #fff;
        }

        .store-btn--outline:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
        }

        .store-preview-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .store-preview-metrics article {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          gap: 12px;
          align-items: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .store-preview-metrics svg {
          font-size: 24px;
          color: #4338ca;
        }

        .store-preview-metrics span {
          color: #6b7280;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .store-preview-metrics strong {
          display: block;
          font-size: 20px;
          color: #111827;
        }

        .store-preview-frame {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 20px 45px rgba(15,23,42,0.08);
        }

        .store-preview-frame header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .store-preview-frame h2 {
          margin: 0;
          font-size: 24px;
          color: #0f172a;
        }

        .store-preview-frame p {
          margin: 4px 0 0;
          color: #6b7280;
        }

        .view-toggle {
          display: inline-flex;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          overflow: hidden;
        }

        .view-toggle button {
          border: none;
          background: transparent;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          color: #4b5563;
        }

        .view-toggle button.active {
          background: #111827;
          color: #fff;
        }

        .preview-shell {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 24px;
          background: repeating-linear-gradient(
            45deg,
            #f3f4f6,
            #f3f4f6 10px,
            #e5e7eb 10px,
            #e5e7eb 20px
          );
          border-radius: 18px;
        }

        .preview-shell iframe {
          border: 12px solid #111827;
          border-radius: 18px;
          background: #fff;
        }

        .preview-shell--mobile iframe {
          border-radius: 32px;
          border-width: 16px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
        }

        .store-preview-routes {
          background: #0f172a;
          border-radius: 18px;
          padding: 24px;
          color: #fff;
        }

        .store-preview-routes header {
          margin-bottom: 18px;
        }

        .store-preview-routes h3 {
          margin: 6px 0 0;
          font-size: 22px;
        }

        .route-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .route-grid article {
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
          background: rgba(15, 23, 42, 0.35);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .route-grid article:hover {
          border-color: #818cf8;
          transform: translateY(-2px);
        }

        .route-grid span {
          font-weight: 600;
        }

        .route-grid small {
          display: block;
          color: #cbd5f5;
        }

        @media (max-width: 768px) {
          .store-preview-hero {
            padding: 24px;
          }

          .store-preview-frame {
            padding: 18px;
          }

          .store-preview-frame header {
            flex-direction: column;
            align-items: flex-start;
          }

          .view-toggle {
            width: 100%;
          }

          .view-toggle button {
            flex: 1;
            justify-content: center;
          }

          .preview-shell {
            padding: 12px;
          }

          .preview-shell iframe {
            width: 100% !important;
          }
        }
      `}</style>
    </main>
  )
}

export default StorePreviewPage



import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    // Minification ve optimization - daha agresif
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Console.log'ları kaldır
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2, // Birden fazla geçiş ile daha iyi sıkıştırma
        unsafe: true, // Daha agresif optimizasyon
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        dead_code: true, // Ölü kod kaldırma
        unused: true, // Kullanılmayan kod kaldırma
      },
      format: {
        comments: false, // Yorumları kaldır
      },
    },
    // Chunk size uyarıları
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Daha iyi code splitting - unused JavaScript'i azaltmak için
        manualChunks: (id) => {
          // Vendor chunks - daha granular splitting (unused code azaltma)
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            if (id.includes('react-router')) {
              return 'router-vendor'
            }
            if (id.includes('react-helmet')) {
              return 'helmet-vendor'
            }
            // Diğer vendor'ları da ayır (daha küçük chunk'lar = daha az unused code)
            if (id.includes('node_modules')) {
              // Her vendor'ı ayrı chunk yap (tree shaking için)
              const vendorMatch = id.match(/node_modules\/([^/]+)/)
              if (vendorMatch && vendorMatch[1]) {
                const vendorName = vendorMatch[1]
                // Büyük vendor'ları ayrı tut
                if (vendorName.length > 20) {
                  return 'vendor-large'
                }
                return `vendor-${vendorName}`
              }
            }
            return 'vendor'
          }
          // Component chunks - daha fazla component'i ayır (lazy loading için)
          if (id.includes('/components/')) {
            const componentName = id.split('/components/')[1]?.split('/')[0]
            // Tüm component'leri ayrı chunk yap (sadece kullanılanlar yüklensin)
            if (componentName && !componentName.includes('.')) {
              return `component-${componentName}`
            }
          }
          // Context'leri ayrı tut
          if (id.includes('/context/')) {
            return 'context'
          }
        },
        // Asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Görseller için cache - daha küçük limit (base64 inline'dan kaçın)
    assetsInlineLimit: 1024, // 1KB'den küçük görseller base64 (daha küçük limit)
    // Source maps sadece production'da kapalı
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // CSS minification
    cssMinify: true,
    // Target modern browsers - daha modern target ile daha küçük bundle
    target: 'es2020',
    // Tree shaking için
    treeshake: {
      moduleSideEffects: false,
    },
  },
  // Optimize dependencies - daha agresif
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
    exclude: [],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  // Preview için cache headers
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
})


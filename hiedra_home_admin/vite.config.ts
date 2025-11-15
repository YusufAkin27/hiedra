import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // React Fast Refresh optimizasyonları
      fastRefresh: true,
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    // Code splitting optimizasyonları
    rollupOptions: {
      output: {
        // Vendor chunk'ları ayır - daha agresif splitting
        manualChunks: (id) => {
          // Node modules
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            if (id.includes('react-icons')) {
              return 'icons'
            }
            if (id.includes('recharts')) {
              return 'charts'
            }
            // Her vendor paketini ayrı chunk'a ayır (daha küçük chunk'lar)
            const match = id.match(/node_modules\/([^/]+)/)
            if (match) {
              return `vendor-${match[1]}`
            }
            // Diğer vendor'ları da ayır
            return 'vendor'
          }
          // Sayfa bazlı chunk'lar - daha küçük parçalar
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/([^/]+)/)
            if (match) {
              return `page-${match[1]}`
            }
          }
        },
        // Chunk dosya adlandırma
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Minification - daha agresif
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3, // 3 pass ile daha iyi minification
        unsafe: true, // Daha agresif optimizasyonlar
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        dead_code: true,
        unused: true,
      },
      mangle: {
        safari10: true,
        properties: false, // Property mangling'i kapat (React için güvenli)
      },
      format: {
        comments: false, // Tüm yorumları kaldır
      },
    },
    // Chunk size uyarıları
    chunkSizeWarningLimit: 500, // Daha küçük chunk'lar için uyarı
    // Source maps (production'da kapalı)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // CSS minification
    cssMinify: true,
    // Target modern browsers için daha küçük bundle
    target: 'es2015',
    // Tree shaking
    treeshake: {
      moduleSideEffects: false,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-icons'],
    exclude: [],
    // Esbuild optimizasyonları
    esbuildOptions: {
      target: 'es2015',
    },
  },
  // CSS optimizasyonları
  css: {
    devSourcemap: false,
    // CSS minification ve optimizasyon
    postcss: undefined, // Vite otomatik olarak CSS'i optimize eder
  },
})


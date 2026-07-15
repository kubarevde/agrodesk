import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // Prod Docker/nginx: '/' | Yandex subfolder deploy: set VITE_BASE_PATH=/agrodesk-prod/
    base: mode === 'production' ? (env.VITE_BASE_PATH || '/') : '/',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/superadmin/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    plugins: [
    tanstackRouter({
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache' },
          },
          // Do NOT cache authenticated data APIs (/api/shifts etc.) —
          // NetworkFirst previously served stale/error responses and broke org isolation.
          {
            urlPattern: /\/api\/(locations|work-types|equipment)(\?|$)/,
            handler: 'NetworkOnly',
            options: { cacheName: 'api-references-bypass' },
          },
        ],
      },
      manifest: {
        name: 'АгроДеск',
        short_name: 'АгроДеск',
        description: 'Управление крестьянско-фермерским хозяйством',
        theme_color: '#01696F',
        background_color: '#F7F6F2',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
          },
          {
            src: '/screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react-dom') || /[\\/]react[\\/]/.test(id)) {
            return 'vendor'
          }
          if (id.includes('@tanstack/react-router') || id.includes('@tanstack/react-query')) {
            return 'router'
          }
          if (
            id.includes('leaflet') ||
            id.includes('react-leaflet') ||
            id.includes('@turf/turf') ||
            id.includes('@turf/')
          ) {
            return 'maps'
          }
          if (id.includes('recharts')) {
            return 'charts'
          }
          if (
            id.includes('@base-ui/react') ||
            id.includes('@radix-ui/react-dialog') ||
            id.includes('@radix-ui/react-select') ||
            id.includes('sonner')
          ) {
            return 'ui'
          }
        },
      },
    },
  },
  }
})

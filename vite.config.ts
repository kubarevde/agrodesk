import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = mode === 'production' ? env.VITE_BASE_PATH || '/' : '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const apiProxyTarget =
    process.env.VITE_API_PROXY_TARGET ||
    process.env.VITE_API_URL ||
    env.VITE_API_URL ||
    'http://localhost:8000'

  return {
    // Prod Docker/nginx: '/' | Yandex subfolder deploy: set VITE_BASE_PATH=/agrodesk-prod/
    base: normalizedBase,
    // Keep Vite proxy aligned with the API used by Playwright when VITE_API_URL is empty.
    // When VITE_API_URL is set, the browser talks to that origin directly (CORS).
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          // Keep SSE (/api/messenger/events) streaming through the Vite proxy.
          timeout: 0,
          proxyTimeout: 0,
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/superadmin/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/health': {
          target: apiProxyTarget,
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
        includeAssets: ['favicon.svg', 'icons/*.png', 'icons.svg', 'screenshots/*'],
        // Enable SW in Vite dev when Playwright (or manual) sets VITE_PWA_DEV=1 —
        // required for offline cold-reload e2e; default stays off for faster local UX.
        devOptions: {
          enabled: (process.env.VITE_PWA_DEV || env.VITE_PWA_DEV) === '1',
          navigateFallback: 'index.html',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
          // SPA shell: any navigation without network gets cached index.html
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/health/, /^\/superadmin\/api/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache' },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-webfonts' },
            },
            // Do NOT cache authenticated data APIs — NetworkFirst previously
            // served stale/error responses and broke org isolation.
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkOnly',
              options: { cacheName: 'api-network-only' },
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
          // Relative to base — works for root and subfolder deploys
          start_url: './',
          scope: './',
          id: './',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: 'screenshots/desktop.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
            },
            {
              src: 'screenshots/mobile.png',
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

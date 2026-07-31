import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      // Prefer same-origin /api via Vite proxy (avoids CORS flakes in e2e).
      // Point the proxy at the live API with VITE_API_URL / VITE_API_PROXY_TARGET.
      VITE_API_URL: '',
      VITE_API_PROXY_TARGET:
        process.env.VITE_API_PROXY_TARGET ||
        process.env.VITE_API_URL ||
        'http://127.0.0.1:8000',
    },
  },
})

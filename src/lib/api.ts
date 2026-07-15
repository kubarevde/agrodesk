import axios from 'axios'
import { TOKEN_KEY } from '@/features/auth/utils'

/**
 * Dev: empty/undefined VITE_API_URL → same-origin `/api` via Vite proxy (no CORS).
 * Prod: set VITE_API_URL to the public API origin if frontend and API differ.
 */
const rawBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
export const api = axios.create({
  baseURL: rawBase && rawBase.length > 0 ? rawBase.replace(/\/$/, '') : '',
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url ?? ''
    const status = error.response?.status
    const detail = error.response?.data?.detail
    // Help diagnose load failures (visible in DevTools console).
    console.error('[api]', error.config?.method, requestUrl, status, detail ?? error.message)

    if (status === 401 && !requestUrl.includes('/api/auth/login')) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

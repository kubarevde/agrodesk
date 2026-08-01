import axios from 'axios'

/**
 * Anonymous marketplace HTTP client — never attaches JWT and never redirects to /login.
 * Do not use `@/lib/api` here: its 401 interceptor clears auth and forces login.
 */
const rawBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim()

export const publicMarketplaceApi = axios.create({
  baseURL: rawBase && rawBase.length > 0 ? rawBase.replace(/\/$/, '') : '',
  timeout: 30_000,
})

publicMarketplaceApi.interceptors.request.use((config) => {
  if (config.headers) {
    delete config.headers.Authorization
    delete (config.headers as Record<string, unknown>).authorization
  }
  return config
})

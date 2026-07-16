import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import 'leaflet/dist/leaflet.css'
import './lib/leafletConfig'
import './index.css'
import { db } from './lib/db'
import { queryClient } from './lib/queryClient'
import { flushSyncQueue } from './lib/sync'
import { router } from './router'

void db.open()

registerSW({
  immediate: true,
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.info('[pwa] App shell ready for offline use')
    }
  },
  onRegisteredSW(_swUrl, registration) {
    if (import.meta.env.DEV && registration) {
      console.info('[pwa] Service worker registered', registration.scope)
    }
  },
})

async function runSyncFlush(reason: string): Promise<void> {
  if (!navigator.onLine) return
  const result = await flushSyncQueue()
  if (result.synced > 0 || result.failed > 0) {
    await queryClient.invalidateQueries()
  }
  if (result.synced > 0) {
    toast.success(`Синхронизировано: ${result.synced}`)
  }
  if (result.failed > 0) {
    toast.error(`Не удалось синхронизировать: ${result.failed}. Нажмите «Повторить» в шапке.`)
  }
  if (import.meta.env.DEV && (result.synced > 0 || result.failed > 0)) {
    console.info('[sync]', reason, result)
  }
}

window.addEventListener('online', () => {
  void runSyncFlush('online-event')
})

// Cold start already online with pending queue (missed online event)
void runSyncFlush('startup')

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} context={{ queryClient }} />
  </StrictMode>,
)

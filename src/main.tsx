import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { db } from './lib/db'
import { queryClient } from './lib/queryClient'
import { flushSyncQueue } from './lib/sync'
import { router } from './router'

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

void db.open()

registerSW({ immediate: true })

enableMocking().then(() => {
  window.addEventListener('online', () => {
    void (async () => {
      const result = await flushSyncQueue()
      await queryClient.invalidateQueries()
      if (result.synced > 0) {
        toast.success(`🔄 Данные синхронизированы (${result.synced} записей)`)
      }
    })()
  })

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <RouterProvider router={router} context={{ queryClient }} />
    </StrictMode>,
  )
})

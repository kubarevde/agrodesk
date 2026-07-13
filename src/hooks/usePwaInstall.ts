import { useCallback, useEffect, useState } from 'react'

export function useIsBrowserDisplayMode() {
  const [isBrowser, setIsBrowser] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: browser)')
    const update = () => setIsBrowser(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isBrowser
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const isBrowserMode = useIsBrowserDisplayMode()

  useEffect(() => {
    const handler = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const canInstall = isBrowserMode && deferredPrompt !== null

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return { canInstall, install }
}

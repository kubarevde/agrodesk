import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolvePwaInstallUi, type PwaInstallUi } from '@/lib/pwaInstall'
import { usePwaInstallStore } from '@/stores/pwaInstallStore'

/** Capture beforeinstallprompt once at app shell (must mount early). */
export function PwaInstallCapture() {
  const setDeferredPrompt = usePwaInstallStore((s) => s.setDeferredPrompt)

  useEffect(() => {
    const handler = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [setDeferredPrompt])

  return null
}

function readDisplayFlags() {
  if (typeof window === 'undefined') {
    return { displayModeStandalone: false, iosNavigatorStandalone: false }
  }
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosNavigatorStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  )
  return { displayModeStandalone, iosNavigatorStandalone }
}

export function usePwaInstall() {
  const deferredPrompt = usePwaInstallStore((s) => s.deferredPrompt)
  const setDeferredPrompt = usePwaInstallStore((s) => s.setDeferredPrompt)
  const [flags, setFlags] = useState(readDisplayFlags)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const update = () => setFlags(readDisplayFlags())
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const ui: PwaInstallUi = useMemo(
    () =>
      resolvePwaInstallUi({
        hasDeferredPrompt: deferredPrompt !== null,
        displayModeStandalone: flags.displayModeStandalone,
        iosNavigatorStandalone: flags.iosNavigatorStandalone,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
      }),
    [deferredPrompt, flags.displayModeStandalone, flags.iosNavigatorStandalone],
  )

  /** Header shortcut: only when native prompt is available. */
  const canInstall = ui.showNativeInstallButton

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt, setDeferredPrompt])

  return { canInstall, install, ui }
}

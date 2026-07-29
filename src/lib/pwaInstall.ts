/** Pure helpers for PWA install UI (testable without DOM). */

export type PwaInstallMode =
  | 'prompt'
  | 'ios-manual'
  | 'already-installed'
  | 'pending'
  | 'unsupported'

export type PwaInstallUi = {
  mode: PwaInstallMode
  /** Native install via beforeinstallprompt */
  showNativeInstallButton: boolean
  /** Show «how to add to Home Screen» for iOS */
  showIosGuideButton: boolean
  /** App already running as installed PWA */
  isStandalone: boolean
}

/** iPhone/iPad (incl. iPadOS desktop UA) with touch. */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  const ua = userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS 13+ may report as MacIntel with touch
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return true
  return false
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  iosNavigatorStandalone: boolean,
): boolean {
  return displayModeStandalone || iosNavigatorStandalone
}

/** Browsers that may fire beforeinstallprompt later (Chrome/Edge/Opera/Samsung). */
export function maySupportBeforeInstallPrompt(userAgent: string): boolean {
  const ua = userAgent
  if (/Firefox\//i.test(ua) && !/Seamonkey/i.test(ua)) return false
  if (/Edg\//i.test(ua) || /OPR\//i.test(ua) || /SamsungBrowser\//i.test(ua)) return true
  if (/Chrome\//i.test(ua) || /Chromium\//i.test(ua)) return true
  return false
}

/**
 * Decide which install UI to show.
 * - prompt: Chrome/Edge/Android with deferred beforeinstallprompt
 * - ios-manual: iOS Safari — Share → Add to Home Screen
 * - already-installed: display-mode standalone / iOS standalone
 * - pending: Chromium-family, waiting for beforeinstallprompt
 * - unsupported: no programmatic install (e.g. desktop Firefox)
 */
export function resolvePwaInstallUi(input: {
  hasDeferredPrompt: boolean
  displayModeStandalone: boolean
  iosNavigatorStandalone: boolean
  userAgent: string
  maxTouchPoints: number
}): PwaInstallUi {
  const isStandalone = isStandaloneDisplay(
    input.displayModeStandalone,
    input.iosNavigatorStandalone,
  )
  if (isStandalone) {
    return {
      mode: 'already-installed',
      showNativeInstallButton: false,
      showIosGuideButton: false,
      isStandalone: true,
    }
  }

  if (input.hasDeferredPrompt) {
    return {
      mode: 'prompt',
      showNativeInstallButton: true,
      showIosGuideButton: false,
      isStandalone: false,
    }
  }

  if (isIosDevice(input.userAgent, input.maxTouchPoints)) {
    return {
      mode: 'ios-manual',
      showNativeInstallButton: false,
      showIosGuideButton: true,
      isStandalone: false,
    }
  }

  if (maySupportBeforeInstallPrompt(input.userAgent)) {
    return {
      mode: 'pending',
      showNativeInstallButton: false,
      showIosGuideButton: false,
      isStandalone: false,
    }
  }

  return {
    mode: 'unsupported',
    showNativeInstallButton: false,
    showIosGuideButton: false,
    isStandalone: false,
  }
}

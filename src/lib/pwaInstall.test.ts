import { describe, expect, it } from 'vitest'
import { isIosDevice, resolvePwaInstallUi } from './pwaInstall'

describe('isIosDevice', () => {
  it('detects classic iPhone / iPad UA', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)')).toBe(true)
  })

  it('detects iPadOS desktop UA via touch points', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
  })

  it('rejects Android / desktop Chrome', () => {
    expect(
      isIosDevice(
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe(false)
    expect(
      isIosDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'),
    ).toBe(false)
  })
})

describe('resolvePwaInstallUi', () => {
  const base = {
    hasDeferredPrompt: false,
    displayModeStandalone: false,
    iosNavigatorStandalone: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    maxTouchPoints: 0,
  }

  it('shows native install when beforeinstallprompt was captured', () => {
    const ui = resolvePwaInstallUi({ ...base, hasDeferredPrompt: true })
    expect(ui.mode).toBe('prompt')
    expect(ui.showNativeInstallButton).toBe(true)
    expect(ui.showIosGuideButton).toBe(false)
  })

  it('shows iOS guide when no prompt and iPhone UA', () => {
    const ui = resolvePwaInstallUi({
      ...base,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
    })
    expect(ui.mode).toBe('ios-manual')
    expect(ui.showNativeInstallButton).toBe(false)
    expect(ui.showIosGuideButton).toBe(true)
  })

  it('hides install when already standalone', () => {
    const ui = resolvePwaInstallUi({
      ...base,
      hasDeferredPrompt: true,
      displayModeStandalone: true,
    })
    expect(ui.mode).toBe('already-installed')
    expect(ui.showNativeInstallButton).toBe(false)
    expect(ui.isStandalone).toBe(true)
  })

  it('marks pending for Chrome without deferred prompt yet', () => {
    const ui = resolvePwaInstallUi(base)
    expect(ui.mode).toBe('pending')
    expect(ui.showNativeInstallButton).toBe(false)
  })

  it('marks unsupported when no prompt and not iOS', () => {
    const ui = resolvePwaInstallUi({
      ...base,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    })
    expect(ui.mode).toBe('unsupported')
    expect(ui.showNativeInstallButton).toBe(false)
    expect(ui.showIosGuideButton).toBe(false)
  })
})

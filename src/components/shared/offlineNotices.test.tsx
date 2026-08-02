import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const onlineState = vi.hoisted(() => ({ isOnline: false }))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => onlineState.isOnline,
}))

vi.mock('@/lib/sync', () => ({
  useSyncQueue: () => ({ pendingCount: 2, failedCount: 0, conflictCount: 0 }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children?: unknown; to?: string; className?: string }) =>
    createElement('a', { href: props.to, className: props.className }, props.children as never),
}))

vi.mock('lucide-react', () => ({
  WifiOff: () => createElement('span'),
  HardDrive: () => createElement('span'),
}))

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => 'btn',
}))

import { OfflineBanner } from './OfflineBanner'
import { OnlineOnlyNotice } from './OnlineOnlyNotice'
import { StaleCacheNotice } from './StaleCacheNotice'

describe('offline honesty notices', () => {
  beforeEach(() => {
    onlineState.isOnline = false
  })

  it('OfflineBanner explains shifts+warehouse write and online-only modules', () => {
    const html = renderToStaticMarkup(createElement(OfflineBanner))
    expect(html).toContain('data-testid="offline-banner"')
    expect(html).toContain('смены и операции склада')
    expect(html).toContain('Мессенджер')
    expect(html).toContain('только онлайн')
  })

  it('OfflineBanner hides when online', () => {
    onlineState.isOnline = true
    const html = renderToStaticMarkup(createElement(OfflineBanner))
    expect(html).toBe('')
  })

  it('OnlineOnlyNotice renders when offline', () => {
    const html = renderToStaticMarkup(
      createElement(OnlineOnlyNotice, {
        title: 'Только онлайн',
        description: 'Нужен интернет',
      }),
    )
    expect(html).toContain('data-testid="online-only-notice"')
    expect(html).toContain('Только онлайн')
    expect(html).toContain('Открыть смены')
  })

  it('StaleCacheNotice shows cache disclaimer offline only', () => {
    const html = renderToStaticMarkup(
      createElement(StaleCacheNotice, { detail: 'Кэш смен' }),
    )
    expect(html).toContain('data-testid="stale-cache-notice"')
    expect(html).toContain('Кэш смен')

    onlineState.isOnline = true
    expect(renderToStaticMarkup(createElement(StaleCacheNotice))).toBe('')
  })
})

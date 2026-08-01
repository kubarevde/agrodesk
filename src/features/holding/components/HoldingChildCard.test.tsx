import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { HoldingChildCard } from './HoldingChildCard'
import type { HoldingChildSummary } from '@/features/holding/types'

vi.mock('@/features/holding/hooks', () => ({
  useHoldingSwitch: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: (props: {
    children?: unknown
    disabled?: boolean
    title?: string
    'data-testid'?: string
  }) =>
    createElement(
      'button',
      {
        disabled: props.disabled,
        title: props.title,
        'data-testid': props['data-testid'],
      },
      props.children as never,
    ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: (props: { children?: unknown; 'data-testid'?: string }) =>
    createElement('div', { 'data-testid': props['data-testid'] }, props.children as never),
  CardHeader: (props: { children?: unknown }) => createElement('div', null, props.children as never),
  CardTitle: (props: { children?: unknown }) => createElement('h3', null, props.children as never),
  CardContent: (props: { children?: unknown }) => createElement('div', null, props.children as never),
}))

vi.mock('lucide-react', () => ({
  Building2: () => createElement('span'),
  Lock: () => createElement('span'),
  Loader2: () => createElement('span'),
}))

const child: HoldingChildSummary = {
  orgId: 'c1',
  name: 'КФХ Юг',
  slug: 'south',
  isActive: true,
  employeesCount: 5,
  activeShiftsCount: 2,
  monthShiftsCount: 12,
  monthHours: 40,
  monthShipmentsKg: 1000,
  monthShipmentsSum: 50000,
  monthExpensesSum: 10000,
  criticalInventoryCount: 1,
  shipmentRequestsActive: 0,
}

describe('HoldingChildCard', () => {
  it('enables open CTA when canSwitch', () => {
    const html = renderToStaticMarkup(
      createElement(HoldingChildCard, { child, canSwitch: true }),
    )
    expect(html).toContain('КФХ Юг')
    expect(html).toContain('Открыть КФХ')
    expect(html).toContain('data-testid="holding-open-child"')
    expect(html).not.toContain('disabled=""')
  })

  it('disables open CTA without permission', () => {
    const html = renderToStaticMarkup(
      createElement(HoldingChildCard, { child, canSwitch: false }),
    )
    expect(html).toContain('disabled')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ShipmentRequestsSummarySection } from './ShipmentRequestsSummarySection'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...rest
  }: {
    to: string
    search?: { focus?: string }
    children: React.ReactNode
    className?: string
    'data-testid'?: string
  }) =>
    createElement(
      'a',
      {
        href: `${to}${search?.focus ? `?focus=${search.focus}` : ''}`,
        ...rest,
      },
      children,
    ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: (props: { children?: unknown }) =>
    createElement('span', null, props.children as never),
}))

vi.mock('@/components/ui/card', () => ({
  Card: (props: { children?: unknown; 'data-testid'?: string }) =>
    createElement('div', { 'data-testid': props['data-testid'] }, props.children as never),
  CardHeader: (props: { children?: unknown }) => createElement('div', null, props.children as never),
  CardTitle: (props: { children?: unknown }) => createElement('h2', null, props.children as never),
  CardContent: (props: { children?: unknown }) => createElement('div', null, props.children as never),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => createElement('div', { 'data-skeleton': '1' }),
}))

describe('ShipmentRequestsSummarySection', () => {
  it('renders summary counts from mock data', () => {
    const html = renderToStaticMarkup(
      createElement(ShipmentRequestsSummarySection, {
        summary: { today: 2, upcoming: 3, overdue: 1, urgent: 4 },
        isLoading: false,
      }),
    )
    expect(html).toContain('Заявки на отгрузку')
    expect(html).toContain('>2<')
    expect(html).toContain('>3<')
    expect(html).toContain('>1<')
    expect(html).toContain('>4<')
  })

  it('links to shipment-requests with active focus', () => {
    const html = renderToStaticMarkup(
      createElement(ShipmentRequestsSummarySection, {
        summary: { today: 0, upcoming: 0, overdue: 0, urgent: 0 },
        isLoading: false,
      }),
    )
    expect(html).toContain('data-testid="dashboard-shipment-requests-link"')
    expect(html).toContain('href="/shipment-requests?focus=active"')
  })
})

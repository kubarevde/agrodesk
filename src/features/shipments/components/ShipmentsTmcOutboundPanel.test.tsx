import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children?: unknown; to?: string }) =>
    createElement('a', { href: props.to }, props.children as never),
}))

vi.mock('@/features/auth/hooks', () => ({
  useCurrentUser: () => ({ data: { role: 'admin' } }),
}))

vi.mock('@/features/settings/permissionsHooks', () => ({
  useUserPermissions: () => ({
    data: { actions: ['shipment_requests.manage'] },
  }),
}))

vi.mock('@/features/settings/hooks', () => ({
  useOrganizationSettings: () => ({
    data: { shipmentRequestsEnabled: true },
  }),
}))

vi.mock('@/features/shipment-requests/hooks', () => ({
  useShipmentRequests: (_filters?: { kind?: string }) => ({
    data: [
      {
        id: 'r1',
        inventoryItemName: 'Дизель',
        inventoryItemUnit: 'л',
        customerName: 'ООО Агро',
        quantity: 5,
        completedAt: '2026-07-15T10:00:00Z',
        shiftId: 'shift-uuid-1',
        status: 'done',
        kind: 'inventory',
        isHarvest: false,
      },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: (props: { children?: unknown }) =>
    createElement('span', null, props.children as never),
}))

vi.mock('@/components/ui/card', () => ({
  Card: (props: {
    children?: unknown
    'data-testid'?: string
    'data-domain'?: string
    className?: string
  }) =>
    createElement(
      'div',
      {
        'data-testid': props['data-testid'],
        'data-domain': props['data-domain'],
      },
      props.children as never,
    ),
  CardHeader: (props: { children?: unknown }) => createElement('div', null, props.children as never),
  CardTitle: (props: { children?: unknown }) => createElement('h2', null, props.children as never),
  CardContent: (props: { children?: unknown }) => createElement('div', null, props.children as never),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => createElement('div', { 'data-skeleton': '1' }),
}))

import { ShipmentsTmcOutboundPanel } from './ShipmentsTmcOutboundPanel'

describe('ShipmentsTmcOutboundPanel', () => {
  it('renders warehouse-only block for inventory kind requests', () => {
    const html = renderToStaticMarkup(
      createElement(ShipmentsTmcOutboundPanel, {
        from: '01.07.2026',
        to: '31.07.2026',
      }),
    )
    expect(html).toContain('data-testid="shipments-tmc-outbound"')
    expect(html).toContain('data-domain="warehouse-only"')
    expect(html).toContain('Дизель')
    expect(html).toContain('источник: заявка')
    expect(html).toContain('data-source="shipment_request"')
    expect(html).toContain('data-kind="inventory"')
    expect(html).toContain('/shipment-requests')
    expect(html).not.toContain('Пшеница')
  })
})

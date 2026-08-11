import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
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
  useShipmentRequests: () => ({
    data: [
      {
        id: 'r1',
        inventoryItemName: 'Дизель',
        inventoryItemUnit: 'л',
        customerName: 'ООО Агро',
        quantity: 5,
        price: 62.8,
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

vi.mock('@/components/shared/CardActionsMenu', () => ({
  CardActionsMenu: () => createElement('button', { type: 'button' }, '…'),
}))

vi.mock('@/components/shared/SkeletonTable', () => ({
  SkeletonTable: () => createElement('div', { 'data-skeleton': '1' }),
}))

vi.mock('@/components/shared/EmptyState', () => ({
  EmptyState: (props: { title?: string }) =>
    createElement('div', { 'data-empty': props.title }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: (props: { children?: unknown; onClick?: () => void }) =>
    createElement('button', { type: 'button', onClick: props.onClick }, props.children as never),
}))

vi.mock('@/components/ui/table', () => ({
  Table: (props: { children?: unknown }) => createElement('table', null, props.children as never),
  TableHeader: (props: { children?: unknown }) =>
    createElement('thead', null, props.children as never),
  TableBody: (props: { children?: unknown }) =>
    createElement('tbody', null, props.children as never),
  TableRow: (props: { children?: unknown; 'data-testid'?: string }) =>
    createElement('tr', { 'data-testid': props['data-testid'] }, props.children as never),
  TableHead: (props: { children?: unknown }) =>
    createElement('th', null, props.children as never),
  TableCell: (props: { children?: unknown }) =>
    createElement('td', null, props.children as never),
}))

import { ShipmentsTmcOutboundPanel } from './ShipmentsTmcOutboundPanel'

describe('ShipmentsTmcOutboundPanel', () => {
  it('renders warehouse-only list for inventory requests without tech jargon', () => {
    const html = renderToStaticMarkup(
      createElement(ShipmentsTmcOutboundPanel, {
        from: '01.07.2026',
        to: '31.07.2026',
      }),
    )
    expect(html).toContain('data-testid="shipments-tmc-outbound"')
    expect(html).toContain('data-domain="warehouse-only"')
    expect(html).toContain('Дизель')
    expect(html).toContain('ООО Агро')
    expect(html).toContain('data-source="shipment_request"')
    expect(html).toContain('data-kind="inventory"')
    expect(html).toContain('К заявкам')
    expect(html).not.toContain('kind=inventory')
    expect(html).not.toContain('Пшеница')
  })
})

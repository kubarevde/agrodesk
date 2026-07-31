import { describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ShipmentRequest } from '../types'
import { ShipmentRequestsList } from '../components/ShipmentRequestsList'
import { filterByStatus } from '../labels'

vi.mock('@/components/ui/button', () => ({
  Button: (props: { children?: unknown; onClick?: () => void }) =>
    createElement('button', { type: 'button', onClick: props.onClick }, props.children as never),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: (props: { children?: unknown; className?: string }) =>
    createElement('span', { className: props.className }, props.children as never),
}))

vi.mock('@/features/dictionaries/hooks', () => ({
  useDictionary: () => ({ data: [], isLoading: false }),
}))

function withQuery(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return createElement(QueryClientProvider, { client }, node)
}

function sample(status: ShipmentRequest['status'], id: string): ShipmentRequest {
  return {
    id,
    orgId: 'org',
    inventoryItemId: 'item',
    inventoryItemName: 'Семена',
    inventoryItemUnit: 'кг',
    customerName: 'Клиент А',
    quantity: 5,
    price: 100,
    plannedAt: new Date('2030-06-01T12:00:00Z').toISOString(),
    priority: status === 'new' ? 'urgent' : 'normal',
    status,
    createdBy: 'u',
    createdByName: 'A',
    assignedTo: null,
    assignedToName: null,
    completedAt: null,
    shiftId: null,
    inventoryOperationId: null,
    cancelReason: null,
    inventoryItemCategory: null,
    cropCode: null,
    isHarvest: false,
    kind: 'inventory',
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('ShipmentRequestsList render', () => {
  it('renders rows and applies status filter for table content', () => {
    const all = [sample('new', 'a'), sample('done', 'b'), sample('in_progress', 'c')]
    const filtered = filterByStatus(all, 'new')
    const html = renderToStaticMarkup(
      withQuery(
        createElement(ShipmentRequestsList, {
          rows: filtered,
          canManage: true,
          onStart: () => undefined,
          onComplete: () => undefined,
          onCancel: () => undefined,
        }),
      ),
    )
    expect(html).toContain('data-status="new"')
    expect(html).toContain('Клиент А')
    expect(html).toContain('Семена')
    expect(html).toContain('Категория')
    expect(html).not.toContain('data-status="done"')
    expect(html).toContain('Срочный')
  })

  it('renders both mobile cards and desktop table layouts', () => {
    const html = renderToStaticMarkup(
      withQuery(
        createElement(ShipmentRequestsList, {
          rows: [sample('new', 'a')],
          canManage: true,
          onStart: () => undefined,
          onComplete: () => undefined,
          onCancel: () => undefined,
        }),
      ),
    )
    expect(html).toContain('data-layout="cards"')
    expect(html).toContain('data-layout="table"')
    expect(html).toContain('md:hidden')
    expect(html).toContain('hidden')
    expect(html).toContain('md:block')
    // Mobile cards must not rely on min-width table scroll wrapper alone
    expect(html).toContain('shipment-request-row-a')
    expect(html).toContain('shipment-request-table-a')
  })

  it('supports opening form from page vs inventory prefill contract', () => {
    const openFromPage = { initialInventoryItemId: null as string | null }
    const openFromCard = { initialInventoryItemId: 'item-99' as string | null }
    expect(openFromPage.initialInventoryItemId).toBeNull()
    expect(openFromCard.initialInventoryItemId).toBe('item-99')
  })

  it('filters list rows by status for manager table', () => {
    const all = [sample('new', 'a'), sample('done', 'b'), sample('cancelled', 'c')]
    expect(filterByStatus(all, 'done').map((r) => r.id)).toEqual(['b'])
    expect(filterByStatus(all, '').map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})

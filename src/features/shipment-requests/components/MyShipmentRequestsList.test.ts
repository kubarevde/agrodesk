import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ShipmentRequest } from '../types'
import {
  canCompleteRequest,
  canStartRequest,
  filterForExecutor,
} from '../labels'
import { MyShipmentRequestsList } from './MyShipmentRequestsList'

vi.mock('@/components/ui/button', () => ({
  Button: (props: { children?: unknown; onClick?: () => void; className?: string }) =>
    createElement(
      'button',
      { type: 'button', onClick: props.onClick, className: props.className },
      props.children as never,
    ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: (props: { children?: unknown; className?: string }) =>
    createElement('span', { className: props.className }, props.children as never),
}))

function sample(
  status: ShipmentRequest['status'],
  id: string,
  assignedTo: string | null = null,
): ShipmentRequest {
  return {
    id,
    orgId: 'org',
    inventoryItemId: 'item',
    inventoryItemName: 'Дизель',
    inventoryItemUnit: 'л',
    customerName: 'Клиент Б',
    quantity: 20,
    price: 50,
    plannedAt: new Date('2030-06-01T12:00:00Z').toISOString(),
    priority: 'normal',
    status,
    createdBy: 'u',
    createdByName: 'A',
    assignedTo,
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

describe('MyShipmentRequestsList for executor', () => {
  it('renders executor rows', () => {
    const html = renderToStaticMarkup(
      createElement(MyShipmentRequestsList, {
        rows: [sample('new', 'a'), sample('in_progress', 'b')],
        onStart: () => undefined,
        onComplete: () => undefined,
      }),
    )
    expect(html).toContain('data-layout="cards"')
    expect(html).not.toContain('<table')
    expect(html).toContain('Дизель')
    expect(html).toContain('Клиент Б')
    expect(html).toContain('Взять в работу')
    expect(html).toContain('Выполнено')
    expect(html).toContain('min-h-11')
  })

  it('hides complete button unless status is in_progress', () => {
    expect(canCompleteRequest(sample('new', 'n'))).toBe(false)
    expect(canCompleteRequest(sample('done', 'd'))).toBe(false)
    expect(canCompleteRequest(sample('in_progress', 'i'))).toBe(true)
    expect(canStartRequest(sample('new', 'n'))).toBe(true)
    expect(canStartRequest(sample('in_progress', 'i'))).toBe(false)

    const htmlNew = renderToStaticMarkup(
      createElement(MyShipmentRequestsList, {
        rows: [sample('new', 'n1')],
        onStart: () => undefined,
        onComplete: () => undefined,
      }),
    )
    expect(htmlNew).toContain('Взять в работу')
    expect(htmlNew).not.toContain('>Выполнено</button>')

    const htmlDone = renderToStaticMarkup(
      createElement(MyShipmentRequestsList, {
        rows: [sample('done', 'd1')],
        onStart: () => undefined,
        onComplete: () => undefined,
      }),
    )
    expect(htmlDone).not.toContain('Взять в работу')
    expect(htmlDone).not.toContain('>Выполнено</button>')
    expect(htmlDone).toContain('data-status="done"')
  })

  it('excludes foreign assigned requests from executor access set', () => {
    const rows = [
      sample('new', 'mine', 'emp-1'),
      sample('new', 'open', null),
      sample('new', 'foreign', 'emp-2'),
    ]
    expect(filterForExecutor(rows, 'emp-1').map((r) => r.id)).toEqual(['mine', 'open'])
  })
})

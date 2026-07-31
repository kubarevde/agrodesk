import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ChatMessage } from '../types'
import { MessageBubble, MessageDeliveryTicks } from './MessageBubble'

vi.mock('lucide-react', () => ({
  Check: (props: Record<string, unknown>) =>
    createElement('span', { 'data-icon': 'check', ...props }),
  CheckCheck: (props: Record<string, unknown>) =>
    createElement('span', { 'data-icon': 'check-check', ...props }),
}))

function sampleMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm1',
    chatId: 'c1',
    senderId: 'u1',
    senderName: 'Я',
    body: 'Привет',
    attachmentUrl: null,
    createdAt: '2026-07-30T12:00:00Z',
    editedAt: null,
    deletedAt: null,
    deliveryStatus: 'delivered',
    ...overrides,
  }
}

describe('MessageDeliveryTicks', () => {
  it('renders one check for delivered', () => {
    const html = renderToStaticMarkup(
      createElement(MessageDeliveryTicks, { status: 'delivered' }),
    )
    expect(html).toContain('data-status="delivered"')
    expect(html).toContain('data-icon="check"')
    expect(html).toContain('Доставлено')
  })

  it('renders double check for read', () => {
    const html = renderToStaticMarkup(createElement(MessageDeliveryTicks, { status: 'read' }))
    expect(html).toContain('data-status="read"')
    expect(html).toContain('data-icon="check-check"')
    expect(html).toContain('Прочитано')
  })
})

describe('MessageBubble delivery ticks', () => {
  it('shows ticks only on outgoing messages', () => {
    const mine = renderToStaticMarkup(
      createElement(MessageBubble, {
        message: sampleMessage({ deliveryStatus: 'delivered' }),
        mine: true,
      }),
    )
    expect(mine).toContain('data-testid="delivery-ticks"')

    const theirs = renderToStaticMarkup(
      createElement(MessageBubble, {
        message: sampleMessage({ senderId: 'u2', senderName: 'Коллега' }),
        mine: false,
      }),
    )
    expect(theirs).not.toContain('data-testid="delivery-ticks"')
  })

  it('shows read ticks for deliveryStatus=read', () => {
    const html = renderToStaticMarkup(
      createElement(MessageBubble, {
        message: sampleMessage({ deliveryStatus: 'read' }),
        mine: true,
      }),
    )
    expect(html).toContain('data-status="read"')
  })
})

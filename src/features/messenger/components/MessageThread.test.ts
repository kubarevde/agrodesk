import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ChatMessage } from '../types'
import { MessageThread } from './MessageThread'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(opts.count, 8) }, (_, index) => ({
        index,
        start: index * 72,
        key: index,
        size: 72,
      })),
    getTotalSize: () => opts.count * 72,
    scrollToIndex: () => undefined,
    measureElement: () => undefined,
  }),
}))

function makeMessages(n: number): ChatMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m-${i}`,
    chatId: 'c1',
    senderId: i % 2 === 0 ? 'u1' : 'u2',
    senderName: i % 2 === 0 ? 'A' : 'B',
    body: `Message ${i}`,
    attachmentUrl: null,
    createdAt: new Date(2026, 0, 1, 12, i).toISOString(),
    editedAt: null,
    deletedAt: null,
  }))
}

describe('MessageThread virtualization', () => {
  it('marks virtualized thread and renders a window of rows for large histories', () => {
    const html = renderToStaticMarkup(
      createElement(MessageThread, {
        messages: makeMessages(200),
        currentUserId: 'u1',
        hasMore: false,
        isFetchingMore: false,
        onLoadMore: () => undefined,
        chatId: 'c1',
      }),
    )
    expect(html).toContain('data-virtualized="true"')
    expect(html).toContain('data-message-count="200"')
    expect(html).toContain('data-rendered-count="8"')
    expect(html).toContain('Message 0')
    expect(html).not.toContain('Message 50')
  })
})

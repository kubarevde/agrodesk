import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import type { ChatMessage, ChatMessagesPage } from '../types'

/**
 * Mirrors useSendMessage optimistic cache update without mounting React.
 */
function applyOptimisticSend(
  qc: QueryClient,
  chatId: string,
  optimistic: ChatMessage,
) {
  const key = ['messenger', 'messages', chatId] as const
  qc.setQueryData<InfiniteData<ChatMessagesPage>>(key, (old) => {
    if (!old || old.pages.length === 0) {
      return {
        pages: [{ items: [optimistic], nextBefore: null, nextBeforeId: null }],
        pageParams: [undefined],
      }
    }
    const [first, ...rest] = old.pages
    return {
      ...old,
      pages: [{ ...first, items: [optimistic, ...first.items] }, ...rest],
    }
  })
}

describe('optimistic send message cache', () => {
  it('prepends pending message to the newest page', () => {
    const qc = new QueryClient()
    const chatId = 'chat-1'
    const existing: ChatMessage = {
      id: 'm-old',
      chatId,
      senderId: 'u2',
      senderName: 'Коллега',
      body: 'Старое',
      attachmentUrl: null,
      createdAt: '2026-07-30T10:00:00Z',
      editedAt: null,
      deletedAt: null,
      deliveryStatus: 'delivered',
    }
    qc.setQueryData<InfiniteData<ChatMessagesPage>>(['messenger', 'messages', chatId], {
      pages: [{ items: [existing], nextBefore: null, nextBeforeId: null }],
      pageParams: [undefined],
    })

    const optimistic: ChatMessage = {
      id: 'temp-1',
      chatId,
      senderId: 'u1',
      senderName: 'Я',
      body: 'Новое',
      attachmentUrl: null,
      createdAt: '2026-07-30T11:00:00Z',
      editedAt: null,
      deletedAt: null,
      pending: true,
      deliveryStatus: 'pending',
    }
    applyOptimisticSend(qc, chatId, optimistic)

    const data = qc.getQueryData<InfiniteData<ChatMessagesPage>>([
      'messenger',
      'messages',
      chatId,
    ])
    expect(data?.pages[0]?.items[0]?.id).toBe('temp-1')
    expect(data?.pages[0]?.items[0]?.pending).toBe(true)
    expect(data?.pages[0]?.items[0]?.deliveryStatus).toBe('pending')
    expect(data?.pages[0]?.items[0]?.body).toBe('Новое')
    expect(data?.pages[0]?.items[1]?.id).toBe('m-old')
  })
})

vi.stubGlobal('navigator', { onLine: true })

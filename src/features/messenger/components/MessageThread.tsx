import { useEffect, useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ChatMessage } from '../types'
import { MessageBubble } from './MessageBubble'

interface MessageThreadProps {
  messages: ChatMessage[]
  currentUserId: string
  hasMore: boolean
  isFetchingMore: boolean
  onLoadMore: () => void
  chatId?: string
}

const ESTIMATE_ROW = 72
const WINDOW_THRESHOLD = 80

export function MessageThread({
  messages,
  currentUserId,
  hasMore,
  isFetchingMore,
  onLoadMore,
  chatId,
}: MessageThreadProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)
  const prevChatId = useRef(chatId)
  const stickBottom = useRef(true)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATE_ROW,
    overscan: 12,
  })

  function scrollToLatest() {
    if (messages.length === 0) return
    virtualizer.scrollToIndex(messages.length - 1, {
      align: 'end',
      behavior: 'auto',
    })
    const el = parentRef.current
    if (el && el.clientHeight > 0) {
      el.scrollTop = el.scrollHeight
    }
  }

  useLayoutEffect(() => {
    const chatChanged = prevChatId.current !== chatId
    prevChatId.current = chatId
    if (chatChanged) {
      prevLen.current = 0
      stickBottom.current = true
    }
    if (messages.length === 0) return

    if (chatChanged || messages.length > prevLen.current) {
      stickBottom.current = true
    }
    prevLen.current = messages.length
    if (stickBottom.current) scrollToLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- length/chat drive stick-to-bottom
  }, [messages.length, chatId])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (stickBottom.current) scrollToLatest()
    })
    ro.observe(el)
    const t1 = window.setTimeout(() => stickBottom.current && scrollToLatest(), 50)
    const t2 = window.setTimeout(() => stickBottom.current && scrollToLatest(), 250)
    return () => {
      ro.disconnect()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, chatId])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Напишите первое сообщение
      </div>
    )
  }

  const loadMore = hasMore ? (
    <div className="mb-3 flex justify-center">
      <button
        type="button"
        className="min-h-11 px-3 text-xs text-primary hover:underline disabled:opacity-50"
        onClick={onLoadMore}
        disabled={isFetchingMore}
      >
        {isFetchingMore ? 'Загрузка…' : 'Загрузить ранее'}
      </button>
    </div>
  ) : null

  // Light chats: render all rows — avoids first-paint scroll races.
  if (messages.length <= WINDOW_THRESHOLD) {
    return (
      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4"
        data-testid="message-thread"
        data-virtualized="false"
        data-message-count={messages.length}
        data-rendered-count={messages.length}
      >
        {loadMore}
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-message-id={msg.id}
            data-pending={msg.pending ? 'true' : 'false'}
            className="pb-3"
          >
            <MessageBubble message={msg} mine={msg.senderId === currentUserId} />
          </div>
        ))}
      </div>
    )
  }

  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4"
      data-testid="message-thread"
      data-virtualized="true"
      data-message-count={messages.length}
      data-rendered-count={items.length}
    >
      {loadMore}
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {items.map((virtualRow) => {
          const msg = messages[virtualRow.index]
          if (!msg) return null
          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              data-message-id={msg.id}
              data-pending={msg.pending ? 'true' : 'false'}
              className="absolute top-0 left-0 w-full pb-3"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <MessageBubble message={msg} mine={msg.senderId === currentUserId} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

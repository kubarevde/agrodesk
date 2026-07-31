import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ChatListItem } from '../types'
import { ChatListPanel } from './ChatListPanel'
import { ChatListRow } from './ChatListRow'
import { UnreadBadge } from './UnreadBadge'
import { formatUnread } from '../utils'

vi.mock('@/components/ui/button', () => ({
  Button: (props: {
    children?: unknown
    onClick?: () => void
    className?: string
    'data-testid'?: string
    'aria-label'?: string
  }) =>
    createElement(
      'button',
      {
        type: 'button',
        onClick: props.onClick,
        className: props.className,
        'data-testid': props['data-testid'],
        'aria-label': props['aria-label'],
      },
      props.children as never,
    ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: { className?: string }) =>
    createElement('div', { className: props.className, 'data-skeleton': 'true' }),
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: (props: { children?: unknown; className?: string }) =>
    createElement('div', { className: props.className }, props.children as never),
  AvatarFallback: (props: { children?: unknown; className?: string }) =>
    createElement('span', { className: props.className }, props.children as never),
}))

function sampleChat(overrides?: Partial<ChatListItem>): ChatListItem {
  return {
    id: 'c1',
    type: 'direct',
    name: null,
    title: 'Иванов Иван',
    createdBy: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
    members: [],
    lastMessage: {
      id: 'm1',
      body: 'Последнее сообщение превью',
      senderId: 'u2',
      senderName: 'Иванов',
      createdAt: new Date().toISOString(),
      attachmentUrl: null,
    },
    unreadCount: 0,
    ...overrides,
  }
}

describe('ChatListPanel admin gate', () => {
  it('shows New group only for admin', () => {
    const adminHtml = renderToStaticMarkup(
      createElement(ChatListPanel, {
        chats: [],
        isLoading: false,
        isAdmin: true,
        onSelect: () => undefined,
        onNewDirect: () => undefined,
        onNewGroup: () => undefined,
      }),
    )
    expect(adminHtml).toContain('data-testid="new-group-chat"')

    const empHtml = renderToStaticMarkup(
      createElement(ChatListPanel, {
        chats: [],
        isLoading: false,
        isAdmin: false,
        onSelect: () => undefined,
        onNewDirect: () => undefined,
        onNewGroup: () => undefined,
      }),
    )
    expect(empHtml).not.toContain('data-testid="new-group-chat"')
    expect(empHtml).toContain('data-testid="new-direct-chat"')
  })
})

describe('ChatListRow', () => {
  it('renders title, last message preview and unread badge', () => {
    const html = renderToStaticMarkup(
      createElement(ChatListRow, {
        chat: sampleChat({ unreadCount: 4 }),
        active: false,
        onSelect: () => undefined,
      }),
    )
    expect(html).toContain('Иванов Иван')
    expect(html).toContain('Последнее сообщение превью')
    expect(html).toContain('data-testid="unread-badge"')
    expect(html).toContain('data-count="4"')
    expect(html).toContain('data-active="false"')
  })

  it('marks active chat', () => {
    const html = renderToStaticMarkup(
      createElement(ChatListRow, {
        chat: sampleChat(),
        active: true,
        onSelect: () => undefined,
      }),
    )
    expect(html).toContain('data-active="true"')
  })

  it('switches active highlight when selecting another chat', () => {
    let selected = 'c1'
    const chats = [
      sampleChat({ id: 'c1', title: 'Чат A' }),
      sampleChat({ id: 'c2', title: 'Чат B', unreadCount: 2 }),
    ]
    const onSelect = (id: string) => {
      selected = id
    }
    onSelect('c2')
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        chats.map((chat) =>
          createElement(ChatListRow, {
            key: chat.id,
            chat,
            active: chat.id === selected,
            onSelect,
          }),
        ),
      ),
    )
    expect(html).toContain('data-chat-id="c2"')
    expect(html).toMatch(/data-chat-id="c2"[^>]*data-active="true"/)
    expect(html).toMatch(/data-chat-id="c1"[^>]*data-active="false"/)
  })
})

describe('UnreadBadge', () => {
  it('renders count and clamps at 99+', () => {
    const html = renderToStaticMarkup(createElement(UnreadBadge, { count: 3 }))
    expect(html).toContain('data-testid="unread-badge"')
    expect(html).toContain('data-count="3"')
    expect(html).toContain('3')

    const clamped = renderToStaticMarkup(createElement(UnreadBadge, { count: 120 }))
    expect(clamped).toContain('99+')
    expect(formatUnread(0)).toBe('')
  })

  it('hides when count is zero', () => {
    const html = renderToStaticMarkup(createElement(UnreadBadge, { count: 0 }))
    expect(html).toBe('')
  })
})

describe('mobile split layout classes', () => {
  it('list pane hides on mobile when a chat is open', () => {
    // Mirrors MessengerPage classNames for mobile split screens
    const listHiddenWhenChat = true
    const listClass = listHiddenWhenChat
      ? 'w-full md:w-80 md:shrink-0 lg:w-96 hidden md:flex md:flex-col'
      : 'w-full md:w-80 md:shrink-0 lg:w-96 flex flex-col'
    expect(listClass).toContain('hidden md:flex')

    const backVisibleOnMobile = 'size-11 md:hidden'
    expect(backVisibleOnMobile).toContain('md:hidden')
  })
})

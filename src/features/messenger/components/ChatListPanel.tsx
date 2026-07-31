import { MessageSquarePlus, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChatListItem } from '../types'
import { ChatListRow } from './ChatListRow'

interface ChatListPanelProps {
  chats: ChatListItem[]
  activeChatId?: string
  isLoading: boolean
  isAdmin: boolean
  onSelect: (chatId: string) => void
  onNewDirect: () => void
  onNewGroup: () => void
}

export function ChatListPanel({
  chats,
  activeChatId,
  isLoading,
  isAdmin,
  onSelect,
  onNewDirect,
  onNewGroup,
}: ChatListPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <h1 className="min-w-0 flex-1 text-base font-semibold text-foreground">Мессенджер</h1>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onNewDirect}
          data-testid="new-direct-chat"
          aria-label="Новый чат"
        >
          <MessageSquarePlus className="size-4" />
          <span className="hidden sm:inline">Новый чат</span>
        </Button>
        {isAdmin ? (
          <Button
            type="button"
            size="sm"
            onClick={onNewGroup}
            data-testid="new-group-chat"
            aria-label="Новая группа"
          >
            <UsersRound className="size-4" />
            <span className="hidden sm:inline">Новая группа</span>
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Чатов пока нет. Начните переписку с коллегой.
          </div>
        ) : (
          chats.map((chat) => (
            <ChatListRow
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

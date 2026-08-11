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
      <div className="space-y-3 border-b border-border p-3">
        <h1 className="text-base font-semibold text-foreground">Мессенджер</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            className="min-h-11 w-full justify-center sm:min-h-10 sm:w-auto"
            variant="outline"
            onClick={onNewDirect}
            data-testid="new-direct-chat"
            aria-label="Создать чат"
          >
            <MessageSquarePlus className="size-4 shrink-0" />
            Создать чат
          </Button>
          {isAdmin ? (
            <Button
              type="button"
              className="min-h-11 w-full justify-center sm:min-h-10 sm:w-auto"
              onClick={onNewGroup}
              data-testid="new-group-chat"
              aria-label="Создать группу"
            >
              <UsersRound className="size-4 shrink-0" />
              Создать группу
            </Button>
          ) : null}
        </div>
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

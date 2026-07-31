import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ChatListItem } from '../types'
import { formatChatTime, initialsFromName } from '../utils'
import { UnreadBadge } from './UnreadBadge'

interface ChatListRowProps {
  chat: ChatListItem
  active: boolean
  onSelect: (chatId: string) => void
}

export function ChatListRow({ chat, active, onSelect }: ChatListRowProps) {
  const preview = chat.lastMessage?.body || 'Нет сообщений'
  const time = chat.lastMessage?.createdAt ?? chat.updatedAt

  return (
    <button
      type="button"
      onClick={() => onSelect(chat.id)}
      data-chat-id={chat.id}
      data-active={active ? 'true' : 'false'}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors',
        'hover:bg-muted/50',
        active && 'bg-primary/10',
      )}
    >
      <Avatar className="mt-0.5">
        <AvatarFallback className="bg-primary/15 text-primary">
          {initialsFromName(chat.title)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{chat.title}</p>
          <time className="shrink-0 text-xs text-muted-foreground">{formatChatTime(time)}</time>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{preview}</p>
          <UnreadBadge count={chat.unreadCount} />
        </div>
      </div>
    </button>
  )
}

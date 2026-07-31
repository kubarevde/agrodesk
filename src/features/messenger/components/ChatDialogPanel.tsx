import { useEffect } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  flattenMessagesChronological,
  useChatMessages,
  useMarkChatRead,
  useSendMessage,
} from '../hooks'
import type { ChatListItem } from '../types'
import { MessageComposer } from './MessageComposer'
import { MessageThread } from './MessageThread'

interface ChatDialogPanelProps {
  chat: ChatListItem
  currentUserId: string
  currentUserName: string
  isAdmin: boolean
  onBack: () => void
  onOpenSettings: () => void
}

export function ChatDialogPanel({
  chat,
  currentUserId,
  currentUserName,
  isAdmin,
  onBack,
  onOpenSettings,
}: ChatDialogPanelProps) {
  const isMember = chat.members.some((m) => m.employeeId === currentUserId)
  const messagesQuery = useChatMessages(isMember ? chat.id : undefined)
  const send = useSendMessage(chat.id, currentUserId, currentUserName)
  const markRead = useMarkChatRead(chat.id)
  const messages = flattenMessagesChronological(messagesQuery.data)

  useEffect(() => {
    if (!isMember) return
    const newest = messagesQuery.data?.pages[0]?.items[0]
    if (!newest || newest.senderId === currentUserId) return
    if (chat.unreadCount <= 0) return
    markRead.mutate(newest.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark once per chat/newest
  }, [chat.id, chat.unreadCount, isMember, messagesQuery.data?.pages[0]?.items[0]?.id])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden bg-background" data-testid="chat-dialog">
      <div className="flex items-center gap-2 border-b border-border px-2 py-2 sm:px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:hidden"
          onClick={onBack}
          aria-label="К списку чатов"
          data-testid="messenger-back"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{chat.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {chat.type === 'group'
              ? `${chat.members.length} участников`
              : chat.members.find((m) => m.employeeId !== currentUserId)?.fullName ?? ''}
          </p>
        </div>
        {isAdmin && chat.type === 'group' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={onOpenSettings}
            aria-label="Настройки группы"
            data-testid="group-settings"
          >
            <Settings className="size-5" />
          </Button>
        ) : null}
      </div>

      {!isMember ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Вы не участник этого чата. История сообщений недоступна.
          </p>
          {isAdmin && chat.type === 'group' ? (
            <Button type="button" variant="outline" onClick={onOpenSettings}>
              Управление группой
            </Button>
          ) : null}
        </div>
      ) : messagesQuery.isLoading ? (
        <div className="flex-1 space-y-2 p-4" aria-busy="true">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="ml-auto h-16 w-1/2" />
        </div>
      ) : messagesQuery.isError ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-destructive">
          Не удалось загрузить сообщения
        </div>
      ) : (
        <MessageThread
          chatId={chat.id}
          messages={messages}
          currentUserId={currentUserId}
          hasMore={Boolean(messagesQuery.hasNextPage)}
          isFetchingMore={messagesQuery.isFetchingNextPage}
          onLoadMore={() => void messagesQuery.fetchNextPage()}
        />
      )}

      {isMember ? (
        <MessageComposer
          sending={send.isPending}
          onSend={(body) => send.mutate(body)}
        />
      ) : null}
    </div>
  )
}

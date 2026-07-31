import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { useCurrentUser } from '@/features/auth/hooks'
import { messengerHelp } from '@/features/help/content'
import { cn } from '@/lib/utils'
import { setMessengerPollInterval, useChats, useCreateDirectChat, useCreateGroupChat, useUpdateGroupChat } from '../hooks'
import type { ChatListItem } from '../types'
import { useMessengerRealtime } from '../useMessengerRealtime'
import { ChatDialogPanel } from './ChatDialogPanel'
import { ChatListPanel } from './ChatListPanel'
import { MessengerDialogs } from './MessengerDialogs'

interface MessengerPageProps {
  chatId?: string
}

export function MessengerPage({ chatId }: MessengerPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const { data: chats = [], isLoading } = useChats()
  const createDirect = useCreateDirectChat()
  const createGroup = useCreateGroupChat()

  const [directOpen, setDirectOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { realtimeEnabled, pollIntervalMs } = useMessengerRealtime(chatId)
  useEffect(() => {
    setMessengerPollInterval(pollIntervalMs)
    return () => setMessengerPollInterval(30_000)
  }, [pollIntervalMs])

  const activeChat: ChatListItem | undefined = useMemo(
    () => chats.find((c) => c.id === chatId),
    [chats, chatId],
  )

  const updateGroup = useUpdateGroupChat(activeChat?.id ?? '')

  function selectChat(id: string) {
    void navigate({ to: '/messenger/$chatId', params: { chatId: id } })
  }

  function clearChat() {
    void navigate({ to: '/messenger' })
  }

  if (!user) {
    return (
      <div className="p-6 text-sm text-muted-foreground" aria-busy="true">
        Загрузка…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <SectionHelp section="мессенджер" items={messengerHelp} />
      <div
        className="flex h-[calc(100dvh-7rem)] min-h-[28rem] overflow-hidden rounded-lg border border-border bg-background"
        data-testid="messenger-page"
        data-has-chat={chatId ? 'true' : 'false'}
        data-realtime={realtimeEnabled ? 'true' : 'false'}
      >
      <div
        className={cn(
          'w-full md:w-80 md:shrink-0 lg:w-96',
          chatId ? 'hidden md:flex md:flex-col' : 'flex flex-col',
        )}
        data-testid="messenger-chat-list"
      >
        <ChatListPanel
          chats={chats}
          activeChatId={chatId}
          isLoading={isLoading}
          isAdmin={isAdmin}
          onSelect={selectChat}
          onNewDirect={() => setDirectOpen(true)}
          onNewGroup={() => setGroupOpen(true)}
        />
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 overflow-x-hidden',
          chatId ? 'flex flex-col' : 'hidden md:flex md:flex-col',
        )}
        data-testid="messenger-dialog-pane"
      >
        {activeChat ? (
          <ChatDialogPanel
            chat={activeChat}
            currentUserId={user.id}
            currentUserName={user.fullName}
            isAdmin={isAdmin}
            onBack={clearChat}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : chatId && isLoading ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Загрузка чата…
          </div>
        ) : chatId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Чат не найден или недоступен</p>
            <button
              type="button"
              className="text-sm text-primary hover:underline md:hidden"
              onClick={clearChat}
            >
              К списку чатов
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Выберите чат или создайте новый
          </div>
        )}
      </div>

      <MessengerDialogs
        userId={user.id}
        isAdmin={isAdmin}
        activeChat={activeChat}
        directOpen={directOpen}
        groupOpen={groupOpen}
        settingsOpen={settingsOpen}
        setDirectOpen={setDirectOpen}
        setGroupOpen={setGroupOpen}
        setSettingsOpen={setSettingsOpen}
        onCreated={selectChat}
        createDirect={(peerId) => createDirect.mutateAsync(peerId)}
        createGroup={(payload) => createGroup.mutateAsync(payload)}
        updateGroup={(payload) => updateGroup.mutateAsync(payload)}
      />
      </div>
    </div>
  )
}

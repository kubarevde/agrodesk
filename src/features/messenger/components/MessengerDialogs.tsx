import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/apiError'
import type { ChatListItem } from '../types'
import { GroupSettingsDialog } from './GroupSettingsDialog'
import { NewDirectChatDialog } from './NewDirectChatDialog'
import { NewGroupChatDialog } from './NewGroupChatDialog'

interface MessengerDialogsProps {
  userId: string
  isAdmin: boolean
  activeChat?: ChatListItem
  directOpen: boolean
  groupOpen: boolean
  settingsOpen: boolean
  setDirectOpen: (open: boolean) => void
  setGroupOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  onCreated: (chatId: string) => void
  createDirect: (peerId: string) => Promise<{ id: string }>
  createGroup: (payload: { name: string; memberIds: string[] }) => Promise<{ id: string }>
  updateGroup: (payload: {
    name?: string
    addMemberIds?: string[]
    removeMemberIds?: string[]
  }) => Promise<unknown>
}

export function MessengerDialogs({
  userId,
  isAdmin,
  activeChat,
  directOpen,
  groupOpen,
  settingsOpen,
  setDirectOpen,
  setGroupOpen,
  setSettingsOpen,
  onCreated,
  createDirect,
  createGroup,
  updateGroup,
}: MessengerDialogsProps) {
  return (
    <>
      <NewDirectChatDialog
        open={directOpen}
        onOpenChange={setDirectOpen}
        currentUserId={userId}
        onSubmit={async (peerId) => {
          try {
            const chat = await createDirect(peerId)
            onCreated(chat.id)
          } catch (error) {
            toast.error(apiErrorMessage(error, 'Не удалось открыть чат'))
            throw error
          }
        }}
      />

      {isAdmin ? (
        <NewGroupChatDialog
          open={groupOpen}
          onOpenChange={setGroupOpen}
          currentUserId={userId}
          onSubmit={async (payload) => {
            try {
              const chat = await createGroup(payload)
              onCreated(chat.id)
            } catch (error) {
              toast.error(apiErrorMessage(error, 'Не удалось создать группу'))
              throw error
            }
          }}
        />
      ) : null}

      {isAdmin && activeChat?.type === 'group' ? (
        <GroupSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          chat={activeChat}
          currentUserId={userId}
          onSave={async (payload) => {
            try {
              await updateGroup(payload)
            } catch (error) {
              toast.error(apiErrorMessage(error, 'Не удалось сохранить группу'))
              throw error
            }
          }}
        />
      ) : null}
    </>
  )
}

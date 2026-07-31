import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import {
  createDirectChat,
  createGroupChat,
  fetchChatMessages,
  fetchChats,
  fetchMessengerPeers,
  markChatRead,
  sendChatMessage,
  totalUnread,
  updateGroupChat,
} from './api'
import type { ChatListItem, ChatMessage, ChatMessagesPage } from './types'
import { POLL_MS } from './useMessengerRealtime'

/** Shared poll interval; MessengerPage overrides via realtime when SSE is live. */
let activePollIntervalMs: number | false = POLL_MS

export function setMessengerPollInterval(ms: number | false) {
  activePollIntervalMs = ms
}

export function getMessengerPollInterval(): number | false {
  return activePollIntervalMs
}

export function useChats() {
  return useQuery({
    queryKey: ['messenger', 'chats'],
    queryFn: fetchChats,
    refetchInterval: () => getMessengerPollInterval(),
  })
}

export function useMessengerUnreadCount() {
  const { data: chats = [] } = useChats()
  return totalUnread(chats)
}

export function useMessengerPeers(enabled = true) {
  return useQuery({
    queryKey: ['messenger', 'peers'],
    queryFn: fetchMessengerPeers,
    enabled,
  })
}

export function useChatMessages(chatId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['messenger', 'messages', chatId],
    queryFn: ({ pageParam }) => {
      if (!chatId) throw new Error('chatId required')
      return fetchChatMessages(chatId, {
        limit: 50,
        before: pageParam?.before,
        beforeId: pageParam?.beforeId,
      })
    },
    initialPageParam: undefined as { before?: string; beforeId?: string } | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.nextBefore || !lastPage.nextBeforeId) return undefined
      return { before: lastPage.nextBefore, beforeId: lastPage.nextBeforeId }
    },
    enabled: Boolean(chatId),
    refetchInterval: () => getMessengerPollInterval(),
  })
}

export function useCreateDirectChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (peerEmployeeId: string) => createDirectChat(peerEmployeeId),
    onSuccess: async (chat) => {
      qc.setQueryData<ChatListItem[]>(['messenger', 'chats'], (old) => {
        if (!old) return [chat]
        if (old.some((c) => c.id === chat.id)) return old
        return [chat, ...old]
      })
      await qc.invalidateQueries({ queryKey: ['messenger', 'chats'] })
    },
  })
}

export function useCreateGroupChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; memberIds: string[] }) => createGroupChat(payload),
    onSuccess: async (chat) => {
      qc.setQueryData<ChatListItem[]>(['messenger', 'chats'], (old) => {
        if (!old) return [chat]
        if (old.some((c) => c.id === chat.id)) return old
        return [chat, ...old]
      })
      await qc.invalidateQueries({ queryKey: ['messenger', 'chats'] })
    },
  })
}

export function useUpdateGroupChat(chatId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      name?: string
      addMemberIds?: string[]
      removeMemberIds?: string[]
    }) => updateGroupChat(chatId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['messenger'] })
    },
  })
}

export function useMarkChatRead(chatId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lastReadMessageId: string | null) => {
      if (!chatId) throw new Error('chatId required')
      return markChatRead(chatId, lastReadMessageId)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['messenger', 'chats'] })
    },
  })
}

export function useSendMessage(chatId: string, currentUserId: string, currentUserName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => sendChatMessage(chatId, { body }),
    onMutate: async (body) => {
      const key = ['messenger', 'messages', chatId] as const
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<InfiniteData<ChatMessagesPage>>(key)
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        senderId: currentUserId,
        senderName: currentUserName,
        body,
        attachmentUrl: null,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        pending: true,
        deliveryStatus: 'pending',
      }
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
      return { previous }
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['messenger', 'messages', chatId], ctx.previous)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['messenger', 'messages', chatId] }),
        qc.invalidateQueries({ queryKey: ['messenger', 'chats'] }),
      ])
    },
  })
}

/** Flatten infinite pages into chronological order (oldest → newest). */
export function flattenMessagesChronological(
  data: InfiniteData<ChatMessagesPage> | undefined,
): ChatMessage[] {
  if (!data) return []
  const newestFirst = data.pages.flatMap((page) => page.items)
  return [...newestFirst].reverse()
}

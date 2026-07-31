/** Messenger realtime event types and pure handlers (unit-tested). */

export type MessengerRealtimeEventType =
  | 'connected'
  | 'new_message'
  | 'message_read'
  | 'new_chat'
  | 'chat_updated'

export type MessengerRealtimeEvent = {
  type: MessengerRealtimeEventType | string
  chat_id?: string
  message_id?: string
  sender_id?: string
  body?: string
  employee_id?: string
  last_read_message_id?: string | null
  chat_type?: string
}

export type MessengerInvalidateAction =
  | { kind: 'chats' }
  | { kind: 'messages'; chatId: string }
  | { kind: 'none' }

/** Map a realtime event to TanStack Query invalidation intents. */
export function actionsForRealtimeEvent(
  event: MessengerRealtimeEvent,
  activeChatId?: string,
): MessengerInvalidateAction[] {
  switch (event.type) {
    case 'connected':
      return [{ kind: 'none' }]
    case 'new_message': {
      const actions: MessengerInvalidateAction[] = [{ kind: 'chats' }]
      if (event.chat_id && activeChatId === event.chat_id) {
        actions.push({ kind: 'messages', chatId: event.chat_id })
      }
      return actions
    }
    case 'message_read': {
      const actions: MessengerInvalidateAction[] = [{ kind: 'chats' }]
      if (event.chat_id && activeChatId === event.chat_id) {
        actions.push({ kind: 'messages', chatId: event.chat_id })
      }
      return actions
    }
    case 'new_chat':
    case 'chat_updated':
      return [{ kind: 'chats' }]
    default:
      return [{ kind: 'chats' }]
  }
}

export function parseRealtimePayload(raw: string): MessengerRealtimeEvent | null {
  try {
    const data = JSON.parse(raw) as MessengerRealtimeEvent
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return null
    return data
  } catch {
    return null
  }
}

export function messengerEventsUrl(apiBase: string, token: string): string {
  const base = apiBase.replace(/\/$/, '')
  const path = `${base}/api/messenger/events`
  const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  url.searchParams.set('token', token)
  return url.toString()
}

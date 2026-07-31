import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TOKEN_KEY } from '@/features/auth/storage'
import {
  actionsForRealtimeEvent,
  messengerEventsUrl,
  parseRealtimePayload,
} from './realtime'

const POLL_MS = 30_000
/** Keep poll as a real safety net even while SSE is connected (multi-worker / proxy gaps). */
const POLL_WHEN_LIVE_MS = 30_000

/**
 * Connects to messenger SSE. Poll stays active as fallback (same interval when live).
 * On any failure → realtimeEnabled=false; poll remains the source of truth.
 */
export function useMessengerRealtime(activeChatId?: string) {
  const qc = useQueryClient()
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)
  const activeChatRef = useRef(activeChatId)
  activeChatRef.current = activeChatId

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setRealtimeEnabled(false)
      return
    }

    const rawBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
    const apiBase = rawBase && rawBase.length > 0 ? rawBase.replace(/\/$/, '') : ''
    const url = messengerEventsUrl(apiBase, token)

    let closed = false
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined

    function applyEvent(raw: string) {
      const event = parseRealtimePayload(raw)
      if (!event) return
      const actions = actionsForRealtimeEvent(event, activeChatRef.current)
      for (const action of actions) {
        if (action.kind === 'chats') {
          void qc.invalidateQueries({ queryKey: ['messenger', 'chats'] })
        } else if (action.kind === 'messages') {
          void qc.invalidateQueries({ queryKey: ['messenger', 'messages', action.chatId] })
        }
      }
    }

    function connect() {
      if (closed) return
      try {
        source = new EventSource(url)
      } catch {
        setRealtimeEnabled(false)
        return
      }

      source.addEventListener('connected', () => {
        setRealtimeEnabled(true)
      })

      const eventTypes = ['new_message', 'message_read', 'new_chat', 'chat_updated'] as const
      for (const type of eventTypes) {
        source.addEventListener(type, (ev) => {
          applyEvent((ev as MessageEvent).data)
        })
      }

      source.onmessage = (ev) => {
        applyEvent(ev.data)
      }

      source.onerror = () => {
        setRealtimeEnabled(false)
        source?.close()
        source = null
        if (!closed) {
          reconnectTimer = setTimeout(connect, 5_000)
        }
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      source?.close()
      setRealtimeEnabled(false)
    }
  }, [qc])

  return {
    realtimeEnabled,
    /** Interval for TanStack Query poll — slowed when SSE is live. */
    pollIntervalMs: realtimeEnabled ? POLL_WHEN_LIVE_MS : POLL_MS,
  }
}

export { POLL_MS, POLL_WHEN_LIVE_MS }

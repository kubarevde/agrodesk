import { describe, expect, it } from 'vitest'
import {
  actionsForRealtimeEvent,
  messengerEventsUrl,
  parseRealtimePayload,
} from './realtime'

describe('parseRealtimePayload', () => {
  it('parses valid JSON events', () => {
    const event = parseRealtimePayload(
      JSON.stringify({ type: 'new_message', chat_id: 'c1', body: 'hi' }),
    )
    expect(event?.type).toBe('new_message')
    expect(event?.chat_id).toBe('c1')
  })

  it('returns null for invalid payloads', () => {
    expect(parseRealtimePayload('not-json')).toBeNull()
    expect(parseRealtimePayload('{}')).toBeNull()
  })
})

describe('actionsForRealtimeEvent', () => {
  it('invalidates chats and open thread on new_message', () => {
    expect(actionsForRealtimeEvent({ type: 'new_message', chat_id: 'c1' }, 'c1')).toEqual([
      { kind: 'chats' },
      { kind: 'messages', chatId: 'c1' },
    ])
  })

  it('only invalidates chats when another thread is open', () => {
    expect(actionsForRealtimeEvent({ type: 'new_message', chat_id: 'c1' }, 'c2')).toEqual([
      { kind: 'chats' },
    ])
  })

  it('ignores connected heartbeat for cache', () => {
    expect(actionsForRealtimeEvent({ type: 'connected' })).toEqual([{ kind: 'none' }])
  })

  it('handles message_read and new_chat', () => {
    expect(actionsForRealtimeEvent({ type: 'message_read', chat_id: 'c1' }, 'c1')).toEqual([
      { kind: 'chats' },
      { kind: 'messages', chatId: 'c1' },
    ])
    expect(actionsForRealtimeEvent({ type: 'message_read', chat_id: 'c1' }, 'other')).toEqual([
      { kind: 'chats' },
    ])
    expect(actionsForRealtimeEvent({ type: 'new_chat', chat_id: 'c9' })).toEqual([
      { kind: 'chats' },
    ])
  })
})

describe('messengerEventsUrl', () => {
  it('appends token query param', () => {
    const url = messengerEventsUrl('http://127.0.0.1:8000', 'abc.def')
    expect(url).toContain('/api/messenger/events')
    expect(url).toContain('token=abc.def')
  })
})

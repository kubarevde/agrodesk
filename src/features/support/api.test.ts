import { describe, expect, it, vi, beforeEach } from 'vitest'
import { api } from '@/lib/api'
import { createTicket, ticketFromApi } from './api'

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('ticketFromApi', () => {
  it('maps snake_case API payload to camelCase ticket', () => {
    const ticket = ticketFromApi({
      id: 't1',
      org_id: 'o1',
      org_name: 'Демо',
      author_id: 'a1',
      author_role: 'employee',
      author_name: 'Иван',
      category: 'bug',
      subject: 'Карта',
      status: 'new',
      priority: 'high',
      assignee_superadmin_id: null,
      assignee_email: null,
      unread_for_user: false,
      unread_for_staff: true,
      created_at: '2026-07-01T10:00:00Z',
      updated_at: '2026-07-01T10:00:00Z',
      closed_at: null,
      last_message_at: '2026-07-01T10:00:00Z',
      last_message_preview: 'Не открывается',
      messages: [
        {
          id: 'm1',
          author_type: 'employee',
          author_name: 'Иван',
          body: 'Не открывается',
          created_at: '2026-07-01T10:00:00Z',
        },
      ],
    })

    expect(ticket.id).toBe('t1')
    expect(ticket.orgName).toBe('Демо')
    expect(ticket.unreadForStaff).toBe(true)
    expect(ticket.lastMessagePreview).toBe('Не открывается')
    expect(ticket.messages?.[0]?.authorType).toBe('employee')
    expect(ticket.messages?.[0]?.body).toBe('Не открывается')
  })
})

describe('createTicket', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('posts validated payload and returns mapped ticket', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 't2',
        org_id: 'o1',
        org_name: 'Демо',
        author_id: 'a1',
        author_role: 'manager',
        author_name: 'Мария',
        category: 'access',
        subject: 'Нет раздела',
        status: 'new',
        priority: 'normal',
        unread_for_user: false,
        unread_for_staff: true,
        created_at: '2026-07-01T12:00:00Z',
        updated_at: '2026-07-01T12:00:00Z',
      },
    })

    const ticket = await createTicket({
      category: 'access',
      subject: 'Нет раздела',
      body: 'Не вижу пункт Поля в меню после входа.',
      priority: 'normal',
    })

    expect(api.post).toHaveBeenCalledWith('/api/support/tickets', {
      category: 'access',
      subject: 'Нет раздела',
      body: 'Не вижу пункт Поля в меню после входа.',
      priority: 'normal',
      attachments: [],
    })
    expect(ticket.status).toBe('new')
    expect(ticket.category).toBe('access')
  })

  it('propagates API errors to the caller', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { status: 422, data: { detail: 'Invalid category' } },
    })

    await expect(
      createTicket({
        category: 'bug',
        subject: 'x',
        body: 'too short',
      }),
    ).rejects.toBeTruthy()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import type { QueryClient } from '@tanstack/react-query'
import {
  cacheCurrentUser,
  clearAuthStorage,
  isRecoverableAuthFailure,
  readAccessTokenSubject,
  readCachedCurrentUser,
  resolveCurrentUser,
  TOKEN_KEY,
  USER_CACHE_KEY,
} from '@/features/auth/utils'
import { cacheUserPermissions, readCachedUserPermissions } from '@/features/auth/storage'
import type { CurrentUser } from '@/lib/transformers'

const memoryStore = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value)
  },
  removeItem: (key: string) => {
    memoryStore.delete(key)
  },
  clear: () => {
    memoryStore.clear()
  },
}
vi.stubGlobal('localStorage', localStorageMock)

const emp000: CurrentUser = {
  id: 'id-emp000',
  employeeCode: 'EMP000',
  fullName: 'Demo Admin',
  position: 'Админ',
  role: 'admin',
  hourlyRate: 0,
}

const emp001: CurrentUser = {
  id: 'id-emp001',
  employeeCode: 'EMP001',
  fullName: 'Demo Employee',
  position: 'Механизатор',
  role: 'employee',
  hourlyRate: 0,
}

/** Unsigned JWT — client only reads `sub`, never verifies signature. */
function fakeJwt(sub: string): string {
  const enc = (value: object) => {
    const json = JSON.stringify(value)
    const b64 =
      typeof btoa === 'function'
        ? btoa(json)
        : Buffer.from(json, 'utf8').toString('base64')
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ sub })}.sig`
}

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/lib/api'

function mockQueryClient(): QueryClient {
  return {
    fetchQuery: vi.fn(async ({ queryFn }: { queryFn: () => Promise<CurrentUser> }) =>
      queryFn(),
    ),
    setQueryData: vi.fn(),
    removeQueries: vi.fn(),
  } as unknown as QueryClient
}

describe('auth offline bootstrap', () => {
  beforeEach(() => {
    memoryStore.clear()
    vi.mocked(api.get).mockReset()
  })

  it('caches and reads current user', () => {
    cacheCurrentUser(emp000)
    expect(readCachedCurrentUser()?.employeeCode).toBe('EMP000')
    clearAuthStorage()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_CACHE_KEY)).toBeNull()
  })

  it('reads JWT sub for identity binding', () => {
    expect(readAccessTokenSubject(fakeJwt('id-emp000'))).toBe('id-emp000')
    expect(readAccessTokenSubject('not-a-jwt')).toBeNull()
  })

  it('rejects EMP001 cache when token belongs to EMP000', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(emp000.id))
    cacheCurrentUser(emp001)
    expect(readCachedCurrentUser()).toBeNull()
  })

  it('accepts EMP000 cache when token sub matches', () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(emp000.id))
    cacheCurrentUser(emp000)
    expect(readCachedCurrentUser()?.employeeCode).toBe('EMP000')
  })

  it('offline bootstrap keeps EMP000 and never falls back to EMP001', async () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(emp000.id))
    cacheCurrentUser(emp000)
    // Poison leftover EMP001 would previously win if token was ignored:
    memoryStore.set(USER_CACHE_KEY, JSON.stringify(emp000))
    vi.stubGlobal('navigator', { onLine: false })

    const qc = mockQueryClient()
    const user = await resolveCurrentUser(qc)
    expect(user.employeeCode).toBe('EMP000')
    expect(user.id).toBe(emp000.id)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('offline with mismatched cache throws OFFLINE_NO_USER_CACHE', async () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(emp000.id))
    cacheCurrentUser(emp001)
    vi.stubGlobal('navigator', { onLine: false })

    const qc = mockQueryClient()
    await expect(resolveCurrentUser(qc)).rejects.toThrow('OFFLINE_NO_USER_CACHE')
  })

  it('scopes permissions cache by user id', () => {
    cacheUserPermissions(emp001.id, 'employee', ['my-shift'], ['shift.open_own'])
    expect(readCachedUserPermissions(emp000.id, 'employee')).toBeNull()
    expect(readCachedUserPermissions(emp001.id, 'employee')?.actions).toEqual(['shift.open_own'])
  })

  it('treats plain errors as recoverable', () => {
    expect(isRecoverableAuthFailure(new Error('offline'))).toBe(true)
  })

  it('uses cached user when /me fails with network error', async () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(emp000.id))
    cacheCurrentUser(emp000)
    vi.stubGlobal('navigator', { onLine: true })
    vi.mocked(api.get).mockRejectedValue(new Error('Network Error'))

    const qc = mockQueryClient()
    const user = await resolveCurrentUser(qc)
    expect(user.fullName).toBe('Demo Admin')
    expect(qc.setQueryData).toHaveBeenCalled()
  })

  it('skips /me entirely when navigator is offline', async () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(emp000.id))
    cacheCurrentUser(emp000)
    vi.stubGlobal('navigator', { onLine: false })

    const qc = mockQueryClient()
    const user = await resolveCurrentUser(qc)
    expect(user.employeeCode).toBe('EMP000')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('clears session on 401', async () => {
    localStorage.setItem(TOKEN_KEY, fakeJwt(emp000.id))
    cacheCurrentUser(emp000)
    vi.stubGlobal('navigator', { onLine: true })

    const axiosErr = new axios.AxiosError('Unauthorized')
    axiosErr.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: {},
    }
    vi.mocked(api.get).mockRejectedValue(axiosErr)

    const qc = mockQueryClient()
    await expect(resolveCurrentUser(qc)).rejects.toBeTruthy()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})

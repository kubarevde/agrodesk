import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import type { QueryClient } from '@tanstack/react-query'
import {
  cacheCurrentUser,
  clearAuthStorage,
  isRecoverableAuthFailure,
  readCachedCurrentUser,
  resolveCurrentUser,
  TOKEN_KEY,
  USER_CACHE_KEY,
} from '@/features/auth/utils'
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

const sampleUser: CurrentUser = {
  id: 'u1',
  employeeCode: 'EMP000',
  fullName: 'Demo Admin',
  position: 'Админ',
  role: 'admin',
  hourlyRate: 0,
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
    cacheCurrentUser(sampleUser)
    expect(readCachedCurrentUser()?.employeeCode).toBe('EMP000')
    clearAuthStorage()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_CACHE_KEY)).toBeNull()
  })

  it('treats plain errors as recoverable', () => {
    expect(isRecoverableAuthFailure(new Error('offline'))).toBe(true)
  })

  it('uses cached user when /me fails with network error', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok')
    cacheCurrentUser(sampleUser)
    vi.stubGlobal('navigator', { onLine: true })
    vi.mocked(api.get).mockRejectedValue(new Error('Network Error'))

    const qc = mockQueryClient()
    const user = await resolveCurrentUser(qc)
    expect(user.fullName).toBe('Demo Admin')
    expect(qc.setQueryData).toHaveBeenCalled()
  })

  it('skips /me entirely when navigator is offline', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok')
    cacheCurrentUser(sampleUser)
    vi.stubGlobal('navigator', { onLine: false })

    const qc = mockQueryClient()
    const user = await resolveCurrentUser(qc)
    expect(user.employeeCode).toBe('EMP000')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('clears session on 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok')
    cacheCurrentUser(sampleUser)
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

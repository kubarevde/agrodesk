import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_KEY } from '@/features/auth/storage'
import {
  HOLDING_CONTEXT_KEY,
  clearHoldingContext,
  getHoldingContext,
  reconcileHoldingContextFromToken,
  setHoldingContext,
} from '@/features/holding/context'
import { CLAIM_ACTING_FROM_HEAD_ORG_ID } from '@/features/holding/keys'

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
vi.stubGlobal('window', {
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
})

function fakeJwt(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload)
  const body = Buffer.from(json, 'utf8').toString('base64url')
  return `hdr.${body}.sig`
}

describe('holding context JWT reconcile', () => {
  beforeEach(() => {
    memoryStore.clear()
    clearHoldingContext()
  })

  it('getSnapshot stays referentially stable across reads', () => {
    setHoldingContext({
      headOrgId: 'head-1',
      headOrgName: 'Head',
      childOrgId: 'child-1',
      childOrgName: 'Child',
    })
    const a = getHoldingContext()
    const b = getHoldingContext()
    expect(a).toBe(b)
  })

  it('clears stale local context when JWT has no acting claims', () => {
    setHoldingContext({
      headOrgId: 'head-1',
      headOrgName: 'Head',
      childOrgId: 'child-1',
      childOrgName: 'Child',
    })
    localStorage.setItem(TOKEN_KEY, fakeJwt({ sub: 'emp', org_id: 'child-1' }))
    expect(reconcileHoldingContextFromToken()).toBeNull()
    expect(getHoldingContext()).toBeNull()
    expect(localStorage.getItem(HOLDING_CONTEXT_KEY)).toBeNull()
  })

  it('restores banner stub when JWT has acting claims but local context missing', () => {
    localStorage.setItem(
      TOKEN_KEY,
      fakeJwt({
        sub: 'shadow',
        org_id: 'child-1',
        [CLAIM_ACTING_FROM_HEAD_ORG_ID]: 'head-1',
      }),
    )
    const ctx = reconcileHoldingContextFromToken()
    expect(ctx?.headOrgId).toBe('head-1')
    expect(ctx?.childOrgId).toBe('child-1')
    expect(getHoldingContext()).toBe(ctx)
  })

  it('keeps named context when claims match stored ids', () => {
    setHoldingContext({
      headOrgId: 'head-1',
      headOrgName: 'Холдинг Север',
      childOrgId: 'child-1',
      childOrgName: 'КФХ Восток',
    })
    localStorage.setItem(
      TOKEN_KEY,
      fakeJwt({
        sub: 'shadow',
        org_id: 'child-1',
        [CLAIM_ACTING_FROM_HEAD_ORG_ID]: 'head-1',
      }),
    )
    const ctx = reconcileHoldingContextFromToken()
    expect(ctx?.headOrgName).toBe('Холдинг Север')
    expect(ctx?.childOrgName).toBe('КФХ Восток')
  })

  it('clearHoldingContext removes storage key', () => {
    setHoldingContext({
      headOrgId: 'h',
      headOrgName: 'H',
      childOrgId: 'c',
      childOrgName: 'C',
    })
    clearHoldingContext()
    expect(localStorage.getItem(HOLDING_CONTEXT_KEY)).toBeNull()
    expect(getHoldingContext()).toBeNull()
  })
})

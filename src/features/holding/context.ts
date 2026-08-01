import { TOKEN_KEY, readAccessTokenPayload } from '@/features/auth/storage'
import {
  CLAIM_ACTING_FROM_HEAD_ORG_ID,
  HOLDING_CONTEXT_EVENT,
  HOLDING_CONTEXT_KEY,
} from '@/features/holding/keys'

export { HOLDING_CONTEXT_KEY, HOLDING_CONTEXT_EVENT } from '@/features/holding/keys'

export type HoldingContext = {
  headOrgId: string
  headOrgName: string
  childOrgId: string
  childOrgName: string
}

/** Referentially stable snapshot for useSyncExternalStore.getSnapshot. */
let cachedSnapshot: HoldingContext | null = null
let cachedSerialized: string | null = null

function notifyHoldingContextChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOLDING_CONTEXT_EVENT))
  }
}

function parseContext(raw: string | null): HoldingContext | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as HoldingContext
    if (
      !parsed?.headOrgId ||
      !parsed?.headOrgName ||
      !parsed?.childOrgId ||
      !parsed?.childOrgName
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function contextEqual(a: HoldingContext | null, b: HoldingContext | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.headOrgId === b.headOrgId &&
    a.headOrgName === b.headOrgName &&
    a.childOrgId === b.childOrgId &&
    a.childOrgName === b.childOrgName
  )
}

/** Pure read — must not write/notify (React getSnapshot contract). */
export function getHoldingContext(): HoldingContext | null {
  const raw = localStorage.getItem(HOLDING_CONTEXT_KEY)
  if (raw === cachedSerialized) return cachedSnapshot
  const parsed = parseContext(raw)
  cachedSerialized = raw
  if (contextEqual(cachedSnapshot, parsed)) return cachedSnapshot
  cachedSnapshot = parsed
  return cachedSnapshot
}

function writeHoldingContext(ctx: HoldingContext | null): void {
  if (ctx === null) {
    localStorage.removeItem(HOLDING_CONTEXT_KEY)
    if (cachedSnapshot !== null || cachedSerialized !== null) {
      cachedSnapshot = null
      cachedSerialized = null
      notifyHoldingContextChanged()
    }
    return
  }
  const serialized = JSON.stringify(ctx)
  if (serialized === cachedSerialized) return
  localStorage.setItem(HOLDING_CONTEXT_KEY, serialized)
  cachedSerialized = serialized
  cachedSnapshot = ctx
  notifyHoldingContextChanged()
}

/**
 * Align localStorage holding banner with JWT acting_* claims.
 * Claims are UI-only; data scope stays JWT.org_id.
 * Call from session apply / layout mount — not from getSnapshot.
 */
export function reconcileHoldingContextFromToken(
  token: string | null = localStorage.getItem(TOKEN_KEY),
): HoldingContext | null {
  const payload = readAccessTokenPayload(token)
  const actingHead =
    typeof payload?.[CLAIM_ACTING_FROM_HEAD_ORG_ID] === 'string'
      ? (payload[CLAIM_ACTING_FROM_HEAD_ORG_ID] as string)
      : null
  const orgId = typeof payload?.org_id === 'string' ? payload.org_id : null
  const stored = getHoldingContext()

  if (!actingHead) {
    writeHoldingContext(null)
    return null
  }

  if (
    stored &&
    stored.headOrgId === actingHead &&
    (!orgId || stored.childOrgId === orgId)
  ) {
    return stored
  }

  const next: HoldingContext = {
    headOrgId: actingHead,
    headOrgName: stored?.headOrgName || 'Головная организация',
    childOrgId: orgId || stored?.childOrgId || '',
    childOrgName: stored?.childOrgName || 'КФХ',
  }
  if (!next.childOrgId) {
    writeHoldingContext(null)
    return null
  }
  writeHoldingContext(next)
  return next
}

export function setHoldingContext(ctx: HoldingContext): void {
  writeHoldingContext(ctx)
}

export function clearHoldingContext(): void {
  writeHoldingContext(null)
}

export function subscribeHoldingContext(onStoreChange: () => void): () => void {
  window.addEventListener(HOLDING_CONTEXT_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(HOLDING_CONTEXT_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

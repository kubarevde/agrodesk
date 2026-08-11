/** Persist interactive guide progress in localStorage (works offline / PWA). */

export const GUIDE_STORAGE_KEY = 'agrodesk_system_guide_v1'
/** Bumped when fields grow; old progress still loads with defaults for new fields. */
export const GUIDE_VERSION = 3

export type GuideProgress = {
  version: number
  dismissedAt: string | null
  completedAt: string | null
  stepIndex: number
  /** Last guide step id the user viewed (for resume / deep-link context) */
  lastSectionId: string | null
  /**
   * Set after the first successful login redirects to the guide (or when we
   * decide not to — see shouldOpenGuideOnLogin). Prevents re-opening on every login.
   */
  firstLoginRedirectAt: string | null
}

const DEFAULT: GuideProgress = {
  version: GUIDE_VERSION,
  dismissedAt: null,
  completedAt: null,
  stepIndex: 0,
  lastSectionId: null,
  firstLoginRedirectAt: null,
}

export function guideStorageKey(employeeId: string): string {
  return `${GUIDE_STORAGE_KEY}:${employeeId}`
}

function parseProgress(raw: string | null): GuideProgress {
  if (!raw) return { ...DEFAULT }
  try {
    const parsed = JSON.parse(raw) as Partial<GuideProgress>
    return {
      version: typeof parsed.version === 'number' ? parsed.version : GUIDE_VERSION,
      dismissedAt: parsed.dismissedAt ?? null,
      completedAt: parsed.completedAt ?? null,
      stepIndex: typeof parsed.stepIndex === 'number' ? Math.max(0, parsed.stepIndex) : 0,
      lastSectionId:
        typeof parsed.lastSectionId === 'string' && parsed.lastSectionId.length > 0
          ? parsed.lastSectionId
          : null,
      firstLoginRedirectAt: parsed.firstLoginRedirectAt ?? null,
    }
  } catch {
    return { ...DEFAULT }
  }
}

/** Load progress for an employee; migrates legacy global key once if present. */
export function loadGuideProgress(employeeId: string): GuideProgress {
  const key = guideStorageKey(employeeId)
  try {
    const scoped = localStorage.getItem(key)
    if (scoped) return parseProgress(scoped)

    const legacy = localStorage.getItem(GUIDE_STORAGE_KEY)
    if (legacy) {
      const migrated = parseProgress(legacy)
      saveGuideProgress(employeeId, migrated)
      localStorage.removeItem(GUIDE_STORAGE_KEY)
      return migrated
    }
  } catch {
    return { ...DEFAULT }
  }
  return { ...DEFAULT }
}

export function saveGuideProgress(employeeId: string, next: GuideProgress): void {
  try {
    localStorage.setItem(guideStorageKey(employeeId), JSON.stringify(next))
  } catch {
    // Quota / private mode — guide still works for the session
  }
}

export function shouldShowGuideNudge(progress: GuideProgress): boolean {
  if (progress.completedAt) return false
  if (progress.dismissedAt) return false
  return true
}

/**
 * First login → open guide once. Skip if already redirected, completed,
 * dismissed, or user already moved inside the guide.
 */
export function shouldOpenGuideOnLogin(progress: GuideProgress): boolean {
  if (progress.firstLoginRedirectAt) return false
  if (progress.completedAt || progress.dismissedAt) return false
  if (progress.stepIndex > 0 || progress.lastSectionId) return false
  return true
}

/** Returns true if login should navigate to the guide; marks the one-time flag. */
export function consumeFirstLoginGuideRedirect(employeeId: string): boolean {
  const progress = loadGuideProgress(employeeId)
  if (!shouldOpenGuideOnLogin(progress)) return false
  saveGuideProgress(employeeId, {
    ...progress,
    version: GUIDE_VERSION,
    firstLoginRedirectAt: new Date().toISOString(),
  })
  return true
}

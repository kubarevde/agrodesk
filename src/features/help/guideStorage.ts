/** Persist interactive guide progress in localStorage (works offline / PWA). */

export const GUIDE_STORAGE_KEY = 'agrodesk_system_guide_v1'
/** Bumped when step catalog grows; old progress still loads with defaults for new fields. */
export const GUIDE_VERSION = 2

export type GuideProgress = {
  version: number
  dismissedAt: string | null
  completedAt: string | null
  stepIndex: number
  /** Last guide step id the user viewed (for resume / deep-link context) */
  lastSectionId: string | null
}

const DEFAULT: GuideProgress = {
  version: GUIDE_VERSION,
  dismissedAt: null,
  completedAt: null,
  stepIndex: 0,
  lastSectionId: null,
}

export function loadGuideProgress(): GuideProgress {
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT }
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
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveGuideProgress(next: GuideProgress): void {
  try {
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota / private mode — guide still works for the session
  }
}

export function shouldShowGuideNudge(progress: GuideProgress): boolean {
  if (progress.completedAt) return false
  if (progress.dismissedAt) return false
  return true
}

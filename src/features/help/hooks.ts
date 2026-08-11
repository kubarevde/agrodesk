import { useCallback, useEffect, useState } from 'react'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  GUIDE_VERSION,
  loadGuideProgress,
  saveGuideProgress,
  shouldShowGuideNudge,
  type GuideProgress,
} from './guideStorage'

const EMPTY: GuideProgress = {
  version: GUIDE_VERSION,
  dismissedAt: null,
  completedAt: null,
  stepIndex: 0,
  lastSectionId: null,
  firstLoginRedirectAt: null,
}

export function useGuideProgress() {
  const { data: user } = useCurrentUser()
  const employeeId = user?.id
  const [progress, setProgress] = useState<GuideProgress>(EMPTY)

  useEffect(() => {
    if (!employeeId) {
      setProgress(EMPTY)
      return
    }
    setProgress(loadGuideProgress(employeeId))
  }, [employeeId])

  const persist = useCallback(
    (next: GuideProgress) => {
      if (!employeeId) return
      saveGuideProgress(employeeId, next)
      setProgress(next)
    },
    [employeeId],
  )

  const setStepIndex = useCallback(
    (stepIndex: number, lastSectionId?: string | null) => {
      if (!employeeId) return
      const current = loadGuideProgress(employeeId)
      persist({
        ...current,
        version: GUIDE_VERSION,
        stepIndex,
        lastSectionId:
          lastSectionId !== undefined ? lastSectionId : current.lastSectionId,
      })
    },
    [employeeId, persist],
  )

  const complete = useCallback(() => {
    if (!employeeId) return
    const current = loadGuideProgress(employeeId)
    persist({
      version: GUIDE_VERSION,
      dismissedAt: null,
      completedAt: new Date().toISOString(),
      stepIndex: 0,
      lastSectionId: current.lastSectionId,
      firstLoginRedirectAt: current.firstLoginRedirectAt,
    })
  }, [employeeId, persist])

  const dismissNudge = useCallback(() => {
    if (!employeeId) return
    const current = loadGuideProgress(employeeId)
    persist({
      ...current,
      version: GUIDE_VERSION,
      dismissedAt: new Date().toISOString(),
    })
  }, [employeeId, persist])

  const restart = useCallback(() => {
    if (!employeeId) return
    const current = loadGuideProgress(employeeId)
    persist({
      version: GUIDE_VERSION,
      dismissedAt: null,
      completedAt: null,
      stepIndex: 0,
      lastSectionId: null,
      // Keep one-time login redirect so replaying the guide does not re-hijack login.
      firstLoginRedirectAt: current.firstLoginRedirectAt ?? new Date().toISOString(),
    })
  }, [employeeId, persist])

  return {
    progress,
    showNudge: shouldShowGuideNudge(progress),
    setStepIndex,
    complete,
    dismissNudge,
    restart,
  }
}

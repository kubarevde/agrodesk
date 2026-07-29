import { useCallback, useState } from 'react'
import {
  GUIDE_VERSION,
  loadGuideProgress,
  saveGuideProgress,
  shouldShowGuideNudge,
  type GuideProgress,
} from './guideStorage'

export function useGuideProgress() {
  const [progress, setProgress] = useState<GuideProgress>(() => loadGuideProgress())

  const persist = useCallback((next: GuideProgress) => {
    saveGuideProgress(next)
    setProgress(next)
  }, [])

  const setStepIndex = useCallback(
    (stepIndex: number, lastSectionId?: string | null) => {
      const current = loadGuideProgress()
      persist({
        ...current,
        version: GUIDE_VERSION,
        stepIndex,
        lastSectionId:
          lastSectionId !== undefined ? lastSectionId : current.lastSectionId,
      })
    },
    [persist],
  )

  const complete = useCallback(() => {
    const current = loadGuideProgress()
    persist({
      version: GUIDE_VERSION,
      dismissedAt: null,
      completedAt: new Date().toISOString(),
      stepIndex: 0,
      lastSectionId: current.lastSectionId,
    })
  }, [persist])

  const dismissNudge = useCallback(() => {
    const current = loadGuideProgress()
    persist({
      ...current,
      version: GUIDE_VERSION,
      dismissedAt: new Date().toISOString(),
    })
  }, [persist])

  const restart = useCallback(() => {
    persist({
      version: GUIDE_VERSION,
      dismissedAt: null,
      completedAt: null,
      stepIndex: 0,
      lastSectionId: null,
    })
  }, [persist])

  return {
    progress,
    showNudge: shouldShowGuideNudge(progress),
    setStepIndex,
    complete,
    dismissNudge,
    restart,
  }
}

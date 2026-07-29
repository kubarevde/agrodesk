import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findGuideStepIndex,
  getGuideStepsForUser,
  GUIDE_CATALOG_IDS,
} from './guide'
import {
  GUIDE_VERSION,
  loadGuideProgress,
  saveGuideProgress,
  shouldShowGuideNudge,
  type GuideProgress,
} from './guideStorage'
import { filterHelpItems } from '@/components/shared/SectionHelp'
import { employeesHelp, myShiftHelp } from './content'

const store = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => {
    store.clear()
  },
}
vi.stubGlobal('localStorage', localStorageMock)

beforeEach(() => {
  store.clear()
})

describe('GUIDE_CATALOG_IDS', () => {
  it('keeps key learning modules in the catalog', () => {
    const required = [
      'welcome',
      'first-day',
      'today-employee',
      'daily',
      'my-shift',
      'shift-details',
      'my-pay',
      'worktime',
      'calendar',
      'fields',
      'inventory',
      'equipment',
      'people',
      'reports',
      'settings',
      'control-gaps',
      'mistakes',
      'ask-help',
      'help',
    ]
    for (const id of required) {
      expect(GUIDE_CATALOG_IDS).toContain(id)
    }
    expect(GUIDE_CATALOG_IDS.length).toBeGreaterThanOrEqual(16)
  })
})

describe('getGuideStepsForUser', () => {
  it('hides admin-only steps for employee', () => {
    const steps = getGuideStepsForUser('employee', ['my-shift', 'agro-calendar'])
    const ids = steps.map((s) => s.id)
    expect(ids).toContain('welcome')
    expect(ids).toContain('my-shift')
    expect(ids).toContain('calendar')
    expect(ids).toContain('today-employee')
    expect(ids).toContain('shift-details')
    expect(ids).toContain('ask-help')
    expect(ids).not.toContain('worktime')
    expect(ids).not.toContain('inventory')
    expect(ids).not.toContain('daily')
    expect(ids).not.toContain('control-gaps')
  })

  it('gives employee 8–12 steps with typical sections', () => {
    const steps = getGuideStepsForUser('employee', [
      'my-shift',
      'agro-calendar',
      'fields',
    ])
    expect(steps.length).toBeGreaterThanOrEqual(8)
    expect(steps.length).toBeLessThanOrEqual(12)
  })

  it('keeps manager inventory when section allowed', () => {
    const steps = getGuideStepsForUser('manager', ['dashboard', 'inventory', 'worktime'])
    expect(steps.map((s) => s.id)).toContain('inventory')
  })

  it('gives manager/admin 10–15 steps with broad access', () => {
    const sections = [
      'dashboard',
      'my-shift',
      'worktime',
      'agro-calendar',
      'fields',
      'inventory',
      'equipment',
      'employees',
      'reports',
    ]
    const manager = getGuideStepsForUser('manager', sections)
    const admin = getGuideStepsForUser('admin', [...sections, 'settings'])
    expect(manager.length).toBeGreaterThanOrEqual(10)
    expect(manager.length).toBeLessThanOrEqual(15)
    expect(admin.length).toBeGreaterThanOrEqual(10)
    expect(admin.length).toBeLessThanOrEqual(16)
    expect(admin.map((s) => s.id)).toContain('settings')
    expect(manager.map((s) => s.id)).not.toContain('settings')
    expect(manager.map((s) => s.id)).not.toContain('today-employee')
  })

  it('always keeps my-shift for non-admin even if not listed', () => {
    const steps = getGuideStepsForUser('employee', [])
    expect(steps.map((s) => s.id)).toContain('my-shift')
  })
})

describe('findGuideStepIndex', () => {
  it('resolves section alias and step id', () => {
    const steps = getGuideStepsForUser('admin', undefined)
    expect(findGuideStepIndex(steps, 'inventory')).toBeGreaterThanOrEqual(0)
    expect(findGuideStepIndex(steps, 'fields')).toBe(
      steps.findIndex((s) => s.id === 'fields'),
    )
    expect(findGuideStepIndex(steps, 'help')).toBe(
      steps.findIndex((s) => s.id === 'help'),
    )
    expect(findGuideStepIndex(steps, 'unknown-xyz')).toBe(-1)
  })
})

describe('shouldShowGuideNudge', () => {
  const base: GuideProgress = {
    version: 1,
    dismissedAt: null,
    completedAt: null,
    stepIndex: 0,
    lastSectionId: null,
  }

  it('shows when not completed or dismissed', () => {
    expect(shouldShowGuideNudge(base)).toBe(true)
  })

  it('hides after complete', () => {
    expect(shouldShowGuideNudge({ ...base, completedAt: '2026-01-01' })).toBe(false)
  })
})

describe('guideStorage lastSectionId', () => {
  it('round-trips lastSectionId and version defaults', () => {
    const key = 'agrodesk_system_guide_v1'
    localStorage.removeItem(key)
    saveGuideProgress({
      version: GUIDE_VERSION,
      dismissedAt: null,
      completedAt: null,
      stepIndex: 3,
      lastSectionId: 'inventory',
    })
    const loaded = loadGuideProgress()
    expect(loaded.lastSectionId).toBe('inventory')
    expect(loaded.stepIndex).toBe(3)
    expect(loaded.version).toBe(GUIDE_VERSION)

    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        dismissedAt: null,
        completedAt: null,
        stepIndex: 1,
      }),
    )
    const legacy = loadGuideProgress()
    expect(legacy.lastSectionId).toBeNull()
    expect(legacy.stepIndex).toBe(1)
  })
})

describe('filterHelpItems roles', () => {
  it('shows employee tip on employees screen and hides manager tips', () => {
    const forEmployee = filterHelpItems(employeesHelp, 'employee')
    expect(forEmployee.some((i) => i.question.includes('чужие'))).toBe(true)
    expect(forEmployee.every((i) => !i.roles || i.roles.includes('employee'))).toBe(
      true,
    )
  })

  it('keeps shared my-shift tips for any role', () => {
    expect(filterHelpItems(myShiftHelp, 'employee').length).toBe(myShiftHelp.length)
    expect(filterHelpItems(myShiftHelp, 'manager').length).toBe(myShiftHelp.length)
  })
})

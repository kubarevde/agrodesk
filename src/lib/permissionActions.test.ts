import { describe, expect, it } from 'vitest'
import {
  ACTION_KEYS,
  hasAction,
  hasSection,
  impliedActionsForSections,
  syncActionsWithSectionToggle,
} from './permissionActions'

/** Must stay aligned with backend ACTION_KEYS in action_permissions.py */
const BACKEND_ACTION_KEYS = [
  'shift.open_own',
  'shift.open_for_others',
  'shift.close_own',
  'shift.close_others',
  'inventory.operate',
  'inventory.manage_items',
  'purchase.create',
  'purchase.manage',
] as const

describe('permissionActions', () => {
  it('matches backend action catalog', () => {
    expect([...ACTION_KEYS]).toEqual([...BACKEND_ACTION_KEYS])
  })

  it('admin bypasses action and section checks', () => {
    expect(hasAction([], 'inventory.operate', 'admin')).toBe(true)
    expect(hasSection([], 'dashboard', 'admin')).toBe(true)
  })

  it('checks grants for non-admin', () => {
    expect(hasAction(['inventory.operate'], 'inventory.operate', 'employee')).toBe(true)
    expect(hasAction(['inventory.operate'], 'inventory.manage_items', 'employee')).toBe(
      false,
    )
    expect(hasSection(['inventory'], 'inventory', 'manager')).toBe(true)
    expect(hasSection(['inventory'], 'dashboard', 'manager')).toBe(false)
  })

  it('worktime implies only own-shift actions', () => {
    expect(impliedActionsForSections(['worktime'])).toEqual([
      'shift.open_own',
      'shift.close_own',
    ])
  })

  it('syncs baseline actions when toggling sections', () => {
    const enabled = syncActionsWithSectionToggle([], [], 'inventory', true)
    expect(enabled.sections).toEqual(['inventory'])
    expect(enabled.actions).toContain('inventory.operate')
    expect(enabled.actions).not.toContain('inventory.manage_items')

    const disabled = syncActionsWithSectionToggle(
      enabled.sections,
      enabled.actions,
      'inventory',
      false,
    )
    expect(disabled.sections).toEqual([])
    expect(disabled.actions).not.toContain('inventory.operate')
  })
})

import { describe, expect, it } from 'vitest'
import {
  canSeeWorkspaceTab,
  listVisibleWorkspaceTabs,
  parseWorkspaceTab,
  resolveDefaultWorkspaceTab,
} from './workspaceTabs'

describe('workspaceTabs', () => {
  it('parses known tabs only', () => {
    expect(parseWorkspaceTab('shift')).toBe('shift')
    expect(parseWorkspaceTab('requests')).toBe('requests')
    expect(parseWorkspaceTab('nope')).toBeNull()
  })

  it('defaults to shift for employee with my-shift', () => {
    expect(
      resolveDefaultWorkspaceTab({
        role: 'employee',
        allowedSections: ['my-shift', 'tasks'],
        actions: [],
      }),
    ).toBe('shift')
  })

  it('hides requests without execute action', () => {
    const tabs = listVisibleWorkspaceTabs({
      role: 'employee',
      allowedSections: ['my-shift'],
      actions: [],
      shipmentRequestsEnabled: true,
    })
    expect(tabs).toEqual(['shift', 'messenger'])
    expect(canSeeWorkspaceTab('requests', { role: 'employee', actions: [] })).toBe(false)
  })

  it('shows requests with execute action', () => {
    expect(
      canSeeWorkspaceTab('requests', {
        role: 'employee',
        actions: ['shipment_requests.execute'],
        shipmentRequestsEnabled: true,
      }),
    ).toBe(true)
  })
})

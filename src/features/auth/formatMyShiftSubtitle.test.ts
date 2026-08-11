import { describe, expect, it, vi } from 'vitest'
import { formatMyShiftSubtitle } from './formatMyShiftSubtitle'

vi.mock('@/features/auth/selectedOrg', () => ({
  getSelectedOrg: () => ({ id: '1', name: 'КФХ Кубаревское', slug: 'kfh-kubarevskoe' }),
}))

describe('formatMyShiftSubtitle', () => {
  it('shows full name and organization, not login code', () => {
    expect(formatMyShiftSubtitle({ fullName: 'Иван Петров' })).toBe(
      'Иван Петров · КФХ Кубаревское',
    )
  })

  it('prefers explicit org name over selected org', () => {
    expect(formatMyShiftSubtitle({ fullName: 'Админ' }, 'Демо хозяйство')).toBe(
      'Админ · Демо хозяйство',
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  getImplementCategoryConfig,
  IMPLEMENT_CATEGORY_LEGACY,
  IMPLEMENT_COLOR_OPTIONS,
  IMPLEMENT_ICON_OPTIONS,
} from './categoryConfig'

describe('getImplementCategoryConfig', () => {
  it('keeps legacy styles for known categories without dictionary', () => {
    for (const [name, legacy] of Object.entries(IMPLEMENT_CATEGORY_LEGACY)) {
      const style = getImplementCategoryConfig(name)
      expect(style.iconKey).toBe(legacy.iconKey)
      expect(style.colorKey).toBe(legacy.colorKey)
      expect(style.label).toBe(name)
    }
  })

  it('keeps seed category icons among selectable options', () => {
    for (const key of ['sprout', 'droplets', 'tractor', 'wheat', 'truck', 'wrench']) {
      expect(IMPLEMENT_ICON_OPTIONS.some((option) => option.value === key)).toBe(true)
    }
  })

  it('exposes new agri icons and palette colors', () => {
    for (const key of ['leaf', 'shovel', 'package']) {
      expect(IMPLEMENT_ICON_OPTIONS.some((option) => option.value === key)).toBe(true)
    }
    for (const key of ['primary', 'sky', 'teal', 'rose']) {
      expect(IMPLEMENT_COLOR_OPTIONS.some((option) => option.value === key)).toBe(true)
    }
  })

  it('prefers dictionary icon/color when provided', () => {
    const style = getImplementCategoryConfig('Новая', {
      name: 'Новая',
      icon: 'shovel',
      color: 'teal',
    })
    expect(style.iconKey).toBe('shovel')
    expect(style.colorKey).toBe('teal')
    expect(style.badgeClass).toContain('teal')
  })

  it('falls back to wrench/muted for unknown categories', () => {
    const style = getImplementCategoryConfig('Совсем новая')
    expect(style.iconKey).toBe('wrench')
    expect(style.colorKey).toBe('muted')
  })
})

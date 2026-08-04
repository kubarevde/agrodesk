import { describe, expect, it } from 'vitest'
import {
  getImplementCategoryConfig,
  IMPLEMENT_CATEGORY_LEGACY,
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

  it('prefers dictionary icon/color when provided', () => {
    const style = getImplementCategoryConfig('Новая', {
      name: 'Новая',
      icon: 'truck',
      color: 'violet',
    })
    expect(style.iconKey).toBe('truck')
    expect(style.colorKey).toBe('violet')
  })

  it('falls back to wrench/muted for unknown categories', () => {
    const style = getImplementCategoryConfig('Совсем новая')
    expect(style.iconKey).toBe('wrench')
    expect(style.colorKey).toBe('muted')
  })
})

import { describe, expect, it } from 'vitest'
import { SETTINGS_TAB_IDS } from '@/features/settings/settingsSections'
import { getSettingsTabHelp } from './settingsHelp'

describe('getSettingsTabHelp', () => {
  it('returns distinct help for each settings tab', () => {
    const signatures = SETTINGS_TAB_IDS.map((tab) => {
      const help = getSettingsTabHelp(tab)
      expect(help.items.length).toBeGreaterThan(0)
      expect(help.section.trim().length).toBeGreaterThan(0)
      return `${help.section}|${help.items[0]?.question}`
    })
    expect(new Set(signatures).size).toBe(SETTINGS_TAB_IDS.length)
  })

  it('maps dictionary tabs to matching topics', () => {
    expect(getSettingsTabHelp('crops').section).toContain('культур')
    expect(getSettingsTabHelp('expense-cats').items[0]?.answer).toMatch(/затрат/i)
    expect(getSettingsTabHelp('locations').items[0]?.answer).toMatch(/поля/i)
    expect(getSettingsTabHelp('work-types').items[0]?.answer).toMatch(/смен/i)
    expect(getSettingsTabHelp('timezone').section).toContain('часовой')
    expect(getSettingsTabHelp('access').section).toContain('доступ')
  })
})

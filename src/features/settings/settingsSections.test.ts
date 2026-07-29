import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Tabs } from '@/components/ui/tabs'
import { SettingsSectionNav } from './components/SettingsSectionNav'
import {
  DEFAULT_SETTINGS_TAB,
  SETTINGS_SECTIONS,
  getSettingsSectionLabel,
  parseSettingsTab,
} from './settingsSections'

describe('settingsSections', () => {
  it('parses known and unknown tab ids', () => {
    expect(parseSettingsTab('access')).toBe('access')
    expect(parseSettingsTab('nope')).toBe(DEFAULT_SETTINGS_TAB)
    expect(getSettingsSectionLabel('timezone')).toBe('Часовой пояс')
  })

  it('lists all expected sections', () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      'crops',
      'implement-cats',
      'inventory-cats',
      'expense-cats',
      'locations',
      'work-types',
      'timezone',
      'access',
      'notifications',
    ])
  })
})

describe('SettingsSectionNav', () => {
  it('renders mobile select without horizontal tab strip', () => {
    const html = renderToStaticMarkup(
      createElement(SettingsSectionNav, {
        value: 'access',
        onChange: () => undefined,
        isMobile: true,
      }),
    )
    expect(html).toContain('Раздел настроек')
    expect(html).not.toContain('overflow-x-auto')
    expect(html).toContain('Доступы')
  })

  it('renders desktop wrapping tabs', () => {
    const html = renderToStaticMarkup(
      createElement(
        Tabs,
        { value: 'crops' },
        createElement(SettingsSectionNav, {
          value: 'crops',
          onChange: () => undefined,
          isMobile: false,
        }),
      ),
    )
    expect(html).toContain('Культуры')
    expect(html).toContain('Категории приспособлений')
    expect(html).toContain('flex-wrap')
    expect(html).not.toContain('overflow-x-auto')
  })
})

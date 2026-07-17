import { describe, expect, it } from 'vitest'
import { looksLikeBrokenText } from './plannerFilterContext'

describe('looksLikeBrokenText', () => {
  it('detects question mark garbage', () => {
    expect(looksLikeBrokenText('?????????????')).toBe(true)
    expect(looksLikeBrokenText('??????????')).toBe(true)
    expect(looksLikeBrokenText('МТЗ-82')).toBe(false)
    expect(looksLikeBrokenText(null)).toBe(true)
  })
})

describe('planner filter banner text', () => {
  function bannerText(filters: {
    equipmentId?: string
    implementId?: string
    maintenanceId?: string
    equipmentName?: string
    implementName?: string
  }): string | null {
    const { equipmentId, implementId, maintenanceId, equipmentName, implementName } = filters
    if (!equipmentId && !implementId && !maintenanceId) return null

    let assetName: string | null = null
    if (equipmentId && equipmentName && !looksLikeBrokenText(equipmentName)) {
      assetName = equipmentName
    } else if (implementId && implementName && !looksLikeBrokenText(implementName)) {
      assetName = implementName
    } else if (equipmentId) {
      assetName = 'выбранная техника'
    } else if (implementId) {
      assetName = 'выбранное приспособление'
    }

    if (maintenanceId) {
      return assetName
        ? `Закупки для ремонта: ${assetName}`
        : 'Закупки для текущего ремонта'
    }
    if (assetName) return `Показаны закупки для «${assetName}»`
    return null
  }

  it('falls back when implement name is broken', () => {
    expect(
      bannerText({
        implementId: 'x',
        implementName: '?????????????',
      }),
    ).toBe('Показаны закупки для «выбранное приспособление»')
  })

  it('shows readable equipment filter', () => {
    expect(
      bannerText({
        equipmentId: 'x',
        equipmentName: 'МТЗ-82',
      }),
    ).toBe('Показаны закупки для «МТЗ-82»')
  })

  it('shows repair context', () => {
    expect(
      bannerText({
        equipmentId: 'x',
        equipmentName: 'МТЗ-82',
        maintenanceId: 'm1',
      }),
    ).toBe('Закупки для ремонта: МТЗ-82')
  })
})

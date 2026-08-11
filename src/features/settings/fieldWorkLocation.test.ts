import { describe, expect, it } from 'vitest'
import {
  findFieldWorkLocation,
  isFieldRequiredForLocation,
} from './fieldWorkLocation'
import type { Location } from '@/types'

function loc(partial: Partial<Location> & Pick<Location, 'id' | 'name'>): Location {
  return {
    description: undefined,
    isActive: true,
    code: null,
    isSystem: false,
    latitude: null,
    longitude: null,
    ...partial,
  }
}

describe('isFieldRequiredForLocation', () => {
  it('requires field only for system field-work location', () => {
    expect(isFieldRequiredForLocation('fw', 'fw')).toBe(true)
    expect(isFieldRequiredForLocation('warehouse', 'fw')).toBe(false)
    expect(isFieldRequiredForLocation('', 'fw')).toBe(false)
    expect(isFieldRequiredForLocation('fw', undefined)).toBe(false)
  })
})

describe('findFieldWorkLocation', () => {
  it('prefers code field_work', () => {
    const found = findFieldWorkLocation([
      loc({ id: '1', name: 'Полевая работа', isSystem: true }),
      loc({ id: '2', name: 'Полевая работа', code: 'field_work', isSystem: true }),
    ])
    expect(found?.id).toBe('2')
  })
})

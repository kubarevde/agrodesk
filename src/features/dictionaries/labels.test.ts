import { describe, expect, it } from 'vitest'
import {
  buildDictionarySelectOptions,
  resolveDictionaryLabel,
} from './labels'

describe('dictionary crop labels for UI', () => {
  const crops = [
    { code: 'wheat', name: 'Пшеница' },
    { code: 'barley', name: 'Ячмень' },
  ]

  it('shows crop name without code in select options', () => {
    const options = buildDictionarySelectOptions(crops, { valueKey: 'code' })
    expect(options).toEqual([
      { value: 'wheat', label: 'Пшеница' },
      { value: 'barley', label: 'Ячмень' },
    ])
    expect(options.every((row) => !row.label.includes('('))).toBe(true)
  })

  it('resolves crop_code to human name', () => {
    expect(resolveDictionaryLabel('wheat', crops)).toBe('Пшеница')
    expect(resolveDictionaryLabel('unknown', crops)).toBe('unknown')
  })
})

import { describe, expect, it } from 'vitest'
import { shipmentCreateToApi } from '@/lib/transformers'
import { buildDictionarySelectOptions } from '@/features/dictionaries/labels'

describe('crop code unify (UI payload)', () => {
  it('shipmentCreateToApi sends crop_type and crop_code', () => {
    const body = shipmentCreateToApi({
      date: '30.07.2026',
      cropType: 'Пшеница',
      cropCode: 'wheat',
      quantityKg: 10,
      destination: 'Элеватор',
      pricePerKg: 12,
    })
    expect(body.crop_type).toBe('Пшеница')
    expect(body.crop_code).toBe('wheat')
  })

  it('crop select options use dictionary code as value', () => {
    const options = buildDictionarySelectOptions(
      [
        { code: 'wheat', name: 'Пшеница' },
        { code: 'corn', name: 'Кукуруза' },
      ],
      { valueKey: 'code' },
    )
    expect(options.map((row) => row.value)).toEqual(['wheat', 'corn'])
    expect(options[0]?.label).toBe('Пшеница')
  })
})

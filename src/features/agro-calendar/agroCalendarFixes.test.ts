import { describe, expect, it } from 'vitest'
import { emptyToUndefined } from '@/lib/formNumbers'
import { apiErrorMessage } from '@/lib/apiError'
import { shiftManualAddToApi } from '@/lib/transformers'
import { planFromApi, planCreateToApi } from '@/features/agro-calendar/api'
import { agroPlanFormSchema } from '@/features/agro-calendar/schemas'
import { planFieldsLabel } from '@/features/agro-calendar/utils'
import type { AgroPlan } from '@/features/agro-calendar/types'
import axios from 'axios'

describe('emptyToUndefined (numeric input)', () => {
  it('keeps empty as undefined so inputs do not stick to 0', () => {
    expect(emptyToUndefined('')).toBeUndefined()
    expect(emptyToUndefined(null)).toBeUndefined()
    expect(emptyToUndefined(undefined)).toBeUndefined()
  })

  it('parses valid numbers', () => {
    expect(emptyToUndefined('100')).toBe(100)
    expect(emptyToUndefined(0)).toBe(0)
    expect(emptyToUndefined('12.5')).toBe(12.5)
  })

  it('rejects NaN-like input', () => {
    expect(emptyToUndefined('abc')).toBeUndefined()
  })
})

describe('apiErrorMessage for shift conflicts', () => {
  it('prefers FastAPI detail for 409', () => {
    const error = new axios.AxiosError('Request failed with status code 409')
    error.response = {
      status: 409,
      data: { detail: 'У сотрудника уже есть открытая смена (с 08:15)' },
      statusText: 'Conflict',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    }
    expect(apiErrorMessage(error, 'fallback')).toBe(
      'У сотрудника уже есть открытая смена (с 08:15)',
    )
  })

  it('does not expose raw axios message when detail missing', () => {
    const error = new axios.AxiosError('Request failed with status code 409')
    error.response = {
      status: 409,
      data: {},
      statusText: 'Conflict',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    }
    expect(apiErrorMessage(error, 'Не удалось')).toBe(
      'Конфликт: запись уже существует или ещё используется',
    )
  })
})

describe('manual shift overnight payload', () => {
  it('sends end_date for overnight shifts', () => {
    const body = shiftManualAddToApi({
      employeeId: 'e1',
      date: '14.07.2026',
      startTime: '18:00',
      endTime: '01:30',
      endDate: '15.07.2026',
      locationId: 'loc1',
      workTypeId: 'wt1',
      description: 'Ночная смена',
    })
    expect(body.date).toBe('2026-07-14')
    expect(body.end_date).toBe('2026-07-15')
    expect(body.start_time).toBe('18:00:00')
    expect(body.end_time).toBe('01:30:00')
  })
})

describe('agro plan multi-field mapping', () => {
  it('maps field_ids from API and falls back to singular field_id', () => {
    const multi = planFromApi({
      id: '1',
      field_id: 'a',
      field_ids: ['a', 'b'],
      field_name: 'Поле А',
      field_names: ['Поле А', 'Поле Б'],
      work_type_id: 'w',
      work_type_name: 'Вспашка',
      planned_date: '2026-07-17',
      planned_end_date: null,
      equipment_id: null,
      implement_id: null,
      employee_id: null,
      notes: 'Культивация',
      status: 'planned',
      equipment_name: null,
      implement_name: null,
      employee_name: null,
      actual_shift_id: null,
    })
    expect(multi.fieldIds).toEqual(['a', 'b'])
    expect(multi.fieldNames).toEqual(['Поле А', 'Поле Б'])
    expect(multi.notes).toBe('Культивация')

    const single = planFromApi({
      id: '2',
      field_id: 'c',
      field_name: 'Поле C',
      work_type_id: 'w',
      work_type_name: 'Работа',
      planned_date: '2026-07-17',
      status: 'planned',
    })
    expect(single.fieldIds).toEqual(['c'])
  })

  it('create payload sends field_ids', () => {
    const body = planCreateToApi({
      fieldIds: ['a', 'b'],
      workTypeId: 'w',
      plannedDate: '17.07.2026',
      plannedDateIso: '2026-07-17',
      notes: 'Обработка',
    })
    expect(body.field_ids).toEqual(['a', 'b'])
    expect(body.notes).toBe('Обработка')
  })

  it('requires at least one field in form schema', () => {
    const parsed = agroPlanFormSchema.safeParse({
      plannedDate: '17.07.2026',
      fieldIds: [],
      workTypeId: 'w',
    })
    expect(parsed.success).toBe(false)
  })

  it('planFieldsLabel joins names', () => {
    const plan = {
      fieldId: 'a',
      fieldIds: ['a', 'b'],
      fieldName: 'А',
      fieldNames: ['А', 'Б'],
    } as AgroPlan
    expect(planFieldsLabel(plan)).toContain('А')
    expect(planFieldsLabel(plan)).toContain('Б')
  })
})

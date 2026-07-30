import { describe, expect, it } from 'vitest'
import { emptyToUndefined } from '@/lib/formNumbers'
import { apiErrorMessage } from '@/lib/apiError'
import { shiftManualAddToApi } from '@/lib/transformers'
import { planFromApi, planCreateToApi } from '@/features/agro-calendar/api'
import { agroPlanFormSchema } from '@/features/agro-calendar/schemas'
import { isOpenPlan, planFieldsLabel, statusBadgeClass } from '@/features/agro-calendar/utils'
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
    expect(multi.closedBy).toBeNull()

    const withCloser = planFromApi({
      id: '3',
      field_id: 'a',
      work_type_id: 'w',
      work_type_name: 'Работа',
      planned_date: '2026-07-17',
      status: 'done',
      closed_by: 'emp-1',
      closed_by_name: 'Админ',
      closed_at: '2026-07-17T12:00:00Z',
      close_note: 'Вручную',
    })
    expect(withCloser.closedBy).toBe('emp-1')
    expect(withCloser.closedByName).toBe('Админ')
    expect(withCloser.closeNote).toBe('Вручную')

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

  it('maps weather advisories from API and defaults to empty offline-safe list', () => {
    const withItems = planFromApi({
      id: 'adv-1',
      field_id: 'a',
      work_type_id: 'w',
      work_type_name: 'Опрыскивание',
      planned_date: '2026-07-17',
      status: 'planned',
      advisories: [
        {
          code: 'frost',
          severity: 'warning',
          title: 'Заморозки',
          message: 'Ниже 0°C',
          date: '2026-07-17',
          temp_min: -2,
          temp_max: 3,
          precipitation_mm: 0,
          wind_speed_ms: null,
        },
      ],
    })
    expect(withItems.advisories).toHaveLength(1)
    expect(withItems.advisories[0]?.title).toBe('Заморозки')
    expect(withItems.advisories[0]?.tempMin).toBe(-2)

    const missing = planFromApi({
      id: 'adv-2',
      field_id: 'a',
      work_type_id: 'w',
      work_type_name: 'Работа',
      planned_date: '2026-07-17',
      status: 'planned',
    })
    expect(missing.advisories).toEqual([])
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

  it('status badges and open-plan helper', () => {
    expect(statusBadgeClass('done')).toContain('success')
    expect(statusBadgeClass('planned')).toContain('amber')
    expect(
      isOpenPlan({
        entryKind: 'plan',
        status: 'planned',
      } as AgroPlan),
    ).toBe(true)
    expect(
      isOpenPlan({
        entryKind: 'fact',
        status: 'done',
      } as AgroPlan),
    ).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { apiErrorMessage } from './apiError'

describe('apiErrorMessage', () => {
  it('returns FastAPI string detail', () => {
    const error = new AxiosError('fail')
    error.response = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: { detail: 'Запись с таким названием или кодом уже есть' },
    }
    expect(apiErrorMessage(error, 'fallback')).toBe(
      'Запись с таким названием или кодом уже есть',
    )
  })

  it('maps 404 when detail missing', () => {
    const error = new AxiosError('fail')
    error.response = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: {} as never,
      data: {},
    }
    expect(apiErrorMessage(error, 'fallback')).toMatch(/alembic upgrade head/i)
  })

  it('falls back when detail missing', () => {
    expect(apiErrorMessage(new Error('x'), 'Не удалось добавить')).toBe('Не удалось добавить')
  })
})

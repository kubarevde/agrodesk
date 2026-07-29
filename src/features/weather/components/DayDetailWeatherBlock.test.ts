import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DayDetailWeatherBlock } from './DayDetailWeatherBlock'
import type { WeatherDaySourceDetail } from '../types'

const sources: WeatherDaySourceDetail[] = [
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    ok: true,
    error: null,
    detailLevel: 'hourly',
    day: {
      period: 'day',
      time: '12:00',
      temp: 23,
      weatherCode: 2,
      weatherLabel: 'Переменная облачность',
      precipitationMm: null,
      windSpeedMs: 3,
    },
    morning: {
      period: 'morning',
      time: '08:00',
      temp: 18,
      weatherCode: 0,
      weatherLabel: 'Ясно',
      precipitationMm: null,
      windSpeedMs: 2,
    },
    evening: {
      period: 'evening',
      time: '20:00',
      temp: 16,
      weatherCode: 61,
      weatherLabel: 'Небольшой дождь',
      precipitationMm: 0.4,
      windSpeedMs: 3,
    },
    dailySummary: {
      period: 'daily_summary',
      time: null,
      temp: 17,
      weatherCode: 2,
      weatherLabel: 'Переменная облачность',
      precipitationMm: null,
      windSpeedMs: null,
      tempMin: 14,
      tempMax: 20,
      resolution: 'daily',
    },
  },
  {
    id: 'met-no',
    name: 'MET Norway',
    ok: false,
    error: 'Нет данных на эту дату: MET Norway даёт прогноз примерно на 9 суток вперёд',
    detailLevel: 'none',
    day: null,
    morning: null,
    evening: null,
  },
]

describe('DayDetailWeatherBlock', () => {
  it('renders field title without time-hint subtitle', () => {
    const html = renderToStaticMarkup(
      createElement(DayDetailWeatherBlock, {
        sources,
        fieldName: 'Поле №1',
        isLoading: false,
        isError: false,
      }),
    )
    expect(html).toContain('Подробный прогноз на поле: &quot;Поле №1&quot;')
    expect(html).not.toContain('≈ 08:00')
    expect(html).not.toContain('08:00 / 12:00 / 20:00')
    expect(html).toContain('Open-Meteo')
    expect(html).toContain('MET Norway')
    expect(html).toContain('Утро')
    expect(html).toContain('День')
    expect(html).toContain('Вечер')
    expect(html).toContain('08:00')
    expect(html).toContain('12:00')
    expect(html).toContain('20:00')
    expect(html).toContain('grid-cols-3')
    expect(html).toContain('Сводка за сутки')
    expect(html).toContain('9 суток')
  })

  it('uses date fallback when field name is missing', () => {
    const html = renderToStaticMarkup(
      createElement(DayDetailWeatherBlock, {
        sources,
        isLoading: false,
        isError: false,
      }),
    )
    expect(html).toContain('Подробный прогноз на выбранную дату')
    expect(html).not.toContain('Подробный прогноз на поле:')
  })

  it('shows unavailable state', () => {
    const html = renderToStaticMarkup(
      createElement(DayDetailWeatherBlock, {
        sources: [],
        isLoading: false,
        isError: false,
        unavailable: true,
        message: 'Нет данных',
      }),
    )
    expect(html).toContain('Нет данных')
  })
})

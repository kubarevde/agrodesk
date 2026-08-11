import { describe, expect, it } from 'vitest'
import { getExpensesPageHelp, getShipmentsPageHelp } from './pageTabHelp'

describe('getExpensesPageHelp', () => {
  it('returns costs help for expenses tab', () => {
    const help = getExpensesPageHelp('expenses')
    expect(help.section).toBe('затраты')
    expect(help.items[0]?.answer).toMatch(/расход/i)
  })

  it('returns income help for income tab', () => {
    const help = getExpensesPageHelp('income')
    expect(help.section).toBe('доходы')
    expect(help.items[0]?.answer).toMatch(/отгруз/i)
  })

  it('returns forecast help for forecast tab', () => {
    const help = getExpensesPageHelp('forecast')
    expect(help.section).toBe('факт и прогноз')
    expect(help.items[0]?.answer).toMatch(/прошл/i)
  })
})

describe('getShipmentsPageHelp', () => {
  it('returns harvest help by default', () => {
    const help = getShipmentsPageHelp('harvest')
    expect(help.section).toBe('отгрузки урожая')
    expect(help.items[0]?.answer).toMatch(/культур/i)
  })

  it('returns tmc help for tmc tab', () => {
    const help = getShipmentsPageHelp('tmc')
    expect(help.section).toBe('отгрузки ТМЦ')
    expect(help.items[0]?.answer).toMatch(/склад/i)
  })
})

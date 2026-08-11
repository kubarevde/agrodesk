import type { SectionHelpItem } from '@/components/shared/SectionHelp'
import {
  expensesHelp,
  incomeHelp,
  shipmentsHelp,
  tmcShipmentsHelp,
} from './content'
import { forecastHelp } from './modules'

export type ExpensesHelpTab = 'expenses' | 'income' | 'forecast'
export type ShipmentsHelpTab = 'harvest' | 'tmc'

export type PageTabHelp = {
  section: string
  items: SectionHelpItem[]
}

export function getExpensesPageHelp(tab: ExpensesHelpTab): PageTabHelp {
  if (tab === 'income') {
    return { section: 'доходы', items: incomeHelp }
  }
  if (tab === 'forecast') {
    return { section: 'факт и прогноз', items: forecastHelp }
  }
  return { section: 'затраты', items: expensesHelp }
}

export function getShipmentsPageHelp(tab: ShipmentsHelpTab): PageTabHelp {
  if (tab === 'tmc') {
    return { section: 'отгрузки ТМЦ', items: tmcShipmentsHelp }
  }
  return { section: 'отгрузки урожая', items: shipmentsHelp }
}

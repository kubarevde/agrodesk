import {
  BarChart2,
  Clock,
  DollarSign,
  Package,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type ReportPeriodMode = 'range' | 'month'

export interface ReportDefinition {
  id: string
  title: string
  description: string
  icon: LucideIcon
  endpoint: string
  periodMode: ReportPeriodMode
  filename: (params: { from?: string; to?: string; month?: string }) => string
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'timesheet',
    title: 'Табель',
    description: 'Список смен за период с итогами по сотрудникам',
    icon: Clock,
    endpoint: '/api/reports/timesheet',
    periodMode: 'range',
    filename: ({ from, to }) => `timesheet_${from}_${to}.xlsx`,
  },
  {
    id: 'salary',
    title: 'Зарплатная ведомость',
    description: 'Часы × ставка = к выплате',
    icon: Wallet,
    endpoint: '/api/reports/salary',
    periodMode: 'month',
    filename: ({ month }) => `salary_${month}.xlsx`,
  },
  {
    id: 'shipments',
    title: 'Отгрузки',
    description: 'История отгрузок с суммами по культурам',
    icon: Truck,
    endpoint: '/api/reports/shipments',
    periodMode: 'range',
    filename: ({ from, to }) => `shipments_${from}_${to}.xlsx`,
  },
  {
    id: 'inventory',
    title: 'Склад ТМЦ',
    description: 'Движение склада за период',
    icon: Package,
    endpoint: '/api/reports/inventory',
    periodMode: 'range',
    filename: ({ from, to }) => `inventory_${from}_${to}.xlsx`,
  },
  {
    id: 'expenses',
    title: 'Затраты',
    description: 'Затраты по категориям за период',
    icon: DollarSign,
    endpoint: '/api/reports/expenses',
    periodMode: 'range',
    filename: ({ from, to }) => `expenses_${from}_${to}.xlsx`,
  },
  {
    id: 'summary',
    title: 'Сводный KPI',
    description: 'Все ключевые показатели за месяц',
    icon: BarChart2,
    endpoint: '/api/reports/summary',
    periodMode: 'month',
    filename: ({ month }) => `summary_${month}.xlsx`,
  },
]

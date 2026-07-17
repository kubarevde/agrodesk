import {
  BarChart2,
  CalendarDays,
  Clock,
  DollarSign,
  Package,
  ShoppingCart,
  Sprout,
  Truck,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type ReportPeriodMode = 'range' | 'month' | 'year'

export interface ReportDefinition {
  id: string
  title: string
  description: string
  icon: LucideIcon
  endpoint: string
  periodMode: ReportPeriodMode
  equipmentFilter?: boolean
  fieldFilter?: boolean
  filename: (params: { from?: string; to?: string; month?: string; year?: string }) => string
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
  {
    id: 'equipment',
    title: 'Техника и ресурс',
    description: 'Сводка по технике, показаниям, ТО, затратам и приспособлениям',
    icon: Wrench,
    endpoint: '/api/reports/equipment',
    periodMode: 'range',
    equipmentFilter: true,
    filename: ({ from, to }) => `equipment_${from}_${to}.xlsx`,
  },
  {
    id: 'fields',
    title: 'Отчёт по полям',
    description: 'Работы, журнал смен и агрокалендарь по полям',
    icon: Sprout,
    endpoint: '/api/reports/fields',
    periodMode: 'range',
    fieldFilter: true,
    filename: ({ from, to }) => `fields_${from}_${to}.xlsx`,
  },
  {
    id: 'season',
    title: 'Сезонный обзор',
    description: 'Работы, техника, финансы и сотрудники за год',
    icon: CalendarDays,
    endpoint: '/api/reports/season',
    periodMode: 'year',
    filename: ({ year }) => `season_${year}.xlsx`,
  },
  {
    id: 'maintenance',
    title: 'Ремонт и обслуживание',
    description: 'Журнал ремонтов, статусы, чек-листы и возврат в строй',
    icon: Wrench,
    endpoint: '/api/reports/maintenance',
    periodMode: 'range',
    filename: ({ from, to }) => `maintenance_${from}_${to}.xlsx`,
  },
  {
    id: 'purchases',
    title: 'Закупки',
    description: 'Планировщик: открытые и закрытые позиции, срочность, связь с ремонтом',
    icon: ShoppingCart,
    endpoint: '/api/reports/purchases',
    periodMode: 'range',
    filename: ({ from, to }) => `purchases_${from}_${to}.xlsx`,
  },
]

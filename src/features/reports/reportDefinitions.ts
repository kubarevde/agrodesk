import {
  BarChart2,
  Clock,
  DollarSign,
  Package,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type ReportFormat = 'excel' | 'pdf'

export interface ReportDefinition {
  id: string
  title: string
  description: string
  icon: LucideIcon
  formats: ReportFormat[]
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'timesheet',
    title: 'Табель рабочего времени',
    description: 'Список смен за период с итогами по каждому сотруднику',
    icon: Clock,
    formats: ['excel', 'pdf'],
  },
  {
    id: 'shipments',
    title: 'Отчёт по отгрузкам',
    description: 'История отгрузок с суммами по культурам',
    icon: Truck,
    formats: ['excel', 'pdf'],
  },
  {
    id: 'inventory',
    title: 'Отчёт по ТМЦ',
    description: 'Движение склада за период',
    icon: Package,
    formats: ['excel'],
  },
  {
    id: 'finance',
    title: 'Финансовый отчёт',
    description: 'Доходы − расходы',
    icon: DollarSign,
    formats: ['excel', 'pdf'],
  },
  {
    id: 'payroll',
    title: 'Зарплатная ведомость',
    description: 'Часы × ставка = к выплате',
    icon: Users,
    formats: ['excel', 'pdf'],
  },
  {
    id: 'summary',
    title: 'Сводный отчёт КФХ',
    description: 'Все ключевые показатели',
    icon: BarChart2,
    formats: ['pdf'],
  },
]

/** Mirrors backend HOLDING_REPORT_SPECS — group only where aggregation is honest. */

export type HoldingReportMode = 'child' | 'group'

export type HoldingReportSupport = {
  modes: HoldingReportMode[]
  groupUnsupportedReason?: string
}

export const HOLDING_REPORT_SUPPORT: Record<string, HoldingReportSupport> = {
  shipments: { modes: ['child', 'group'] },
  expenses: { modes: ['child', 'group'] },
  summary: { modes: ['child', 'group'] },
  inventory: { modes: ['child', 'group'] },
  purchases: { modes: ['child', 'group'] },
  maintenance: { modes: ['child', 'group'] },
  timesheet: {
    modes: ['child'],
    groupUnsupportedReason: 'Содержит персональные смены и ФИО — только одна КФХ',
  },
  salary: {
    modes: ['child'],
    groupUnsupportedReason: 'Расчёт зарплаты и ставки — только одна КФХ',
  },
  'shipment-requests': {
    modes: ['child'],
    groupUnsupportedReason: 'Исполнители и заказчики — только одна КФХ',
  },
  equipment: {
    modes: ['child'],
    groupUnsupportedReason: 'Парк и наработка не суммируются между КФХ',
  },
  fields: {
    modes: ['child'],
    groupUnsupportedReason: 'Поля и журнал смен локальны для КФХ',
  },
  season: {
    modes: ['child'],
    groupUnsupportedReason: 'Включает зарплату сотрудников и локальный парк',
  },
}

export function getHoldingSupport(reportId: string): HoldingReportSupport | null {
  return HOLDING_REPORT_SUPPORT[reportId] ?? null
}

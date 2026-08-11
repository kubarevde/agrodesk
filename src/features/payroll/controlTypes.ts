export type PayrollControlKpi = {
  accrued: number
  expensesPosted: number
  paid: number
  remainder: number
}

export type PayrollControlDynamicsIssue = {
  kind: string
  title: string
  explanation: string
  count: number
  amount: number
  statusLabel: string
}

export type PayrollControlDynamicsRow = {
  month: string
  monthStart: string
  monthEnd: string
  accrued: number
  expensesPosted: number
  paid: number
  remainder: number
  employeesCount: number
  status: string
  statusLabel: string
  issuesCount: number
  issues: PayrollControlDynamicsIssue[]
}

export type PayrollControlAttentionItem = {
  kind: string
  title?: string
  detail?: string
  critical?: boolean
  employeeId?: string | null
  employeeName?: string
  employeeCode?: string
  runId?: string | null
  lineId?: string | null
  payoutId?: string | null
  expenseId?: string | null
  periodStart?: string
  periodEnd?: string
  periodLabel?: string
  accrued?: number
  paid?: number
  remainder?: number
  overpay?: number
  amount?: number
  totalAmount?: number
  employeesCount?: number
  payoutDate?: string
  payoutMethod?: string
  comment?: string | null
  date?: string
  description?: string
  authorName?: string
  createdAt?: string | null
}

export type PayrollControlAttentionGroup = {
  kind: string
  title: string
  explanation?: string
  count: number
  amount?: number
  critical: boolean
  items: PayrollControlAttentionItem[]
}

export type PayrollControlEmployeeRow = {
  employeeId: string
  employeeName: string
  employeeCode: string
  accrued: number
  bonuses: number
  penaltiesDeductions: number
  advances: number
  paid: number
  remainder: number
  schemes: string[]
  schemesLabel: string
  status: string
  statusLabel: string
  hasDraft: boolean
  hasOverpay: boolean
  runId: string | null
}

export type PayrollControlSchemeRow = {
  scheme: string
  label: string
  employeesCount: number
  accrued: number
}

export type PayrollControlMeta = {
  runsCount: number
  confirmedLinesCount: number
  draftRunsCount: number
  attentionTotal: number
}

export type PayrollControlSummary = {
  periodStart: string
  periodEnd: string
  kpi: PayrollControlKpi
  dynamics: PayrollControlDynamicsRow[]
  attention: PayrollControlAttentionGroup[]
  employees: PayrollControlEmployeeRow[]
  schemes: PayrollControlSchemeRow[]
  meta: PayrollControlMeta
}

export type PayrollControlExportKind = 'accruals' | 'payouts' | 'advances'

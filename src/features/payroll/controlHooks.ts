import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { downloadReport } from '@/features/reports/utils'
import type {
  PayrollControlAttentionGroup,
  PayrollControlAttentionItem,
  PayrollControlDynamicsRow,
  PayrollControlEmployeeRow,
  PayrollControlExportKind,
  PayrollControlSchemeRow,
  PayrollControlSummary,
} from './controlTypes'

type ApiRecord = Record<string, unknown>

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

function optStr(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function attentionItemFromApi(row: ApiRecord): PayrollControlAttentionItem {
  return {
    kind: str(row.kind),
    title: row.title != null ? str(row.title) : undefined,
    detail: row.detail != null ? str(row.detail) : undefined,
    critical: Boolean(row.critical),
    employeeId: optStr(row.employee_id),
    employeeName: row.employee_name != null ? str(row.employee_name) : undefined,
    employeeCode: row.employee_code != null ? str(row.employee_code) : undefined,
    runId: optStr(row.run_id),
    lineId: optStr(row.line_id),
    payoutId: optStr(row.payout_id),
    expenseId: optStr(row.expense_id),
    periodStart: row.period_start != null ? str(row.period_start) : undefined,
    periodEnd: row.period_end != null ? str(row.period_end) : undefined,
    periodLabel: row.period_label != null ? str(row.period_label) : undefined,
    accrued: row.accrued != null ? num(row.accrued) : undefined,
    paid: row.paid != null ? num(row.paid) : undefined,
    remainder: row.remainder != null ? num(row.remainder) : undefined,
    overpay: row.overpay != null ? num(row.overpay) : undefined,
    amount: row.amount != null ? num(row.amount) : undefined,
    totalAmount: row.total_amount != null ? num(row.total_amount) : undefined,
    employeesCount: row.employees_count != null ? num(row.employees_count) : undefined,
    payoutDate: row.payout_date != null ? str(row.payout_date) : undefined,
    payoutMethod: row.payout_method != null ? str(row.payout_method) : undefined,
    comment: row.comment != null ? str(row.comment) : null,
    date: row.date != null ? str(row.date) : undefined,
    description: row.description != null ? str(row.description) : undefined,
    authorName: row.author_name != null ? str(row.author_name) : undefined,
    createdAt: optStr(row.created_at),
  }
}

function attentionFromApi(row: ApiRecord): PayrollControlAttentionGroup {
  const items = Array.isArray(row.items)
    ? (row.items as ApiRecord[]).map(attentionItemFromApi)
    : []
  return {
    kind: str(row.kind),
    title: str(row.title),
    explanation: row.explanation != null ? str(row.explanation) : undefined,
    count: num(row.count),
    amount: row.amount != null ? num(row.amount) : undefined,
    critical: Boolean(row.critical),
    items,
  }
}

function dynamicsFromApi(row: ApiRecord): PayrollControlDynamicsRow {
  const issues = Array.isArray(row.issues)
    ? (row.issues as ApiRecord[]).map((issue) => ({
        kind: str(issue.kind),
        title: str(issue.title),
        explanation: str(issue.explanation),
        count: num(issue.count),
        amount: num(issue.amount),
        statusLabel: str(issue.status_label),
      }))
    : []
  return {
    month: str(row.month),
    monthStart: str(row.month_start),
    monthEnd: str(row.month_end),
    accrued: num(row.accrued),
    expensesPosted: num(row.expenses_posted),
    paid: num(row.paid),
    remainder: num(row.remainder),
    employeesCount: num(row.employees_count),
    status: str(row.status),
    statusLabel: str(row.status_label),
    issuesCount: num(row.issues_count) || issues.length,
    issues,
  }
}

function employeeFromApi(row: ApiRecord): PayrollControlEmployeeRow {
  const schemes = Array.isArray(row.schemes) ? row.schemes.map((s) => str(s)) : []
  return {
    employeeId: str(row.employee_id),
    employeeName: str(row.employee_name),
    employeeCode: str(row.employee_code),
    accrued: num(row.accrued),
    bonuses: num(row.bonuses),
    penaltiesDeductions: num(row.penalties_deductions),
    advances: num(row.advances),
    paid: num(row.paid),
    remainder: num(row.remainder),
    schemes,
    schemesLabel: str(row.schemes_label) || '—',
    status: str(row.status),
    statusLabel: str(row.status_label),
    hasDraft: Boolean(row.has_draft),
    hasOverpay: Boolean(row.has_overpay),
    runId: optStr(row.run_id),
  }
}

function schemeFromApi(row: ApiRecord): PayrollControlSchemeRow {
  return {
    scheme: str(row.scheme),
    label: str(row.label),
    employeesCount: num(row.employees_count),
    accrued: num(row.accrued),
  }
}

export function payrollControlSummaryFromApi(raw: ApiRecord): PayrollControlSummary {
  const kpi = (raw.kpi ?? {}) as ApiRecord
  const meta = (raw.meta ?? {}) as ApiRecord
  return {
    periodStart: str(raw.period_start),
    periodEnd: str(raw.period_end),
    kpi: {
      accrued: num(kpi.accrued),
      expensesPosted: num(kpi.expenses_posted),
      paid: num(kpi.paid),
      remainder: num(kpi.remainder),
    },
    dynamics: Array.isArray(raw.dynamics)
      ? (raw.dynamics as ApiRecord[]).map(dynamicsFromApi)
      : [],
    attention: Array.isArray(raw.attention)
      ? (raw.attention as ApiRecord[]).map(attentionFromApi)
      : [],
    employees: Array.isArray(raw.employees)
      ? (raw.employees as ApiRecord[]).map(employeeFromApi)
      : [],
    schemes: Array.isArray(raw.schemes)
      ? (raw.schemes as ApiRecord[]).map(schemeFromApi)
      : [],
    meta: {
      runsCount: num(meta.runs_count),
      confirmedLinesCount: num(meta.confirmed_lines_count),
      draftRunsCount: num(meta.draft_runs_count),
      attentionTotal: num(meta.attention_total),
    },
  }
}

export function usePayrollControlSummary(
  fromIso: string,
  toIso: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['payroll-control-summary', fromIso, toIso],
    enabled: enabled && Boolean(fromIso && toIso),
    queryFn: async () => {
      const { data } = await api.get<ApiRecord>('/api/payroll-control/summary', {
        params: { period_start: fromIso, period_end: toIso },
      })
      return payrollControlSummaryFromApi(data)
    },
  })
}

const EXPORT_PATH: Record<PayrollControlExportKind, string> = {
  accruals: '/api/payroll-control/export/accruals',
  payouts: '/api/payroll-control/export/payouts',
  advances: '/api/payroll-control/export/advances',
}

const EXPORT_PREFIX: Record<PayrollControlExportKind, string> = {
  accruals: 'payroll_accruals',
  payouts: 'payroll_payouts',
  advances: 'payroll_advances',
}

export async function downloadPayrollControlExport(
  kind: PayrollControlExportKind,
  periodStart: string,
  periodEnd: string,
): Promise<void> {
  const filename = `${EXPORT_PREFIX[kind]}_${periodStart}_${periodEnd}.xlsx`
  try {
    await downloadReport(
      EXPORT_PATH[kind],
      { period_start: periodStart, period_end: periodEnd },
      filename,
    )
    toast.success('Excel скачан')
  } catch (error) {
    toast.error(apiErrorMessage(error, 'Не удалось скачать Excel'))
    throw error
  }
}

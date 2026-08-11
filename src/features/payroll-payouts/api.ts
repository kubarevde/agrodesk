import type {
  CreateAdvancePayload,
  CreatePayoutPayload,
  PayrollPayout,
  PayrollRunSummary,
  PayoutSheet,
  PayoutSheetLine,
} from './types'

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function payoutFromApi(row: Record<string, unknown>): PayrollPayout {
  const kindRaw = row.payout_kind
  const kind =
    kindRaw === 'advance' || kindRaw === 'salary_payment'
      ? kindRaw
      : row.payroll_run_line_id
        ? 'salary_payment'
        : 'advance'
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    payrollRunLineId: row.payroll_run_line_id ? String(row.payroll_run_line_id) : null,
    employeeId: String(row.employee_id),
    employeeName: String(row.employee_name ?? ''),
    employeeCode: String(row.employee_code ?? ''),
    amountPaid: num(row.amount_paid),
    payoutMethod: row.payout_method as PayrollPayout['payoutMethod'],
    payoutKind: kind,
    payoutDate: String(row.payout_date),
    confirmedBy: row.confirmed_by ? String(row.confirmed_by) : null,
    comment: row.comment ? String(row.comment) : null,
    advancePeriodHint: row.advance_period_hint ? String(row.advance_period_hint) : null,
    createdAt: String(row.created_at),
  }
}

function sheetLineFromApi(row: Record<string, unknown>): PayoutSheetLine {
  const payouts = Array.isArray(row.payouts)
    ? (row.payouts as Record<string, unknown>[]).map(payoutFromApi)
    : []
  return {
    lineId: String(row.line_id),
    employeeId: String(row.employee_id),
    employeeName: String(row.employee_name ?? ''),
    employeeCode: String(row.employee_code ?? ''),
    paymentScheme: row.payment_scheme as PayoutSheetLine['paymentScheme'],
    totalAmount: num(row.total_amount),
    amountPaid: num(row.amount_paid),
    remainderAmount: num(row.remainder_amount),
    payoutStatus: row.payout_status as PayoutSheetLine['payoutStatus'],
    remainderClosed: Boolean(row.remainder_closed),
    remainderCloseComment: row.remainder_close_comment
      ? String(row.remainder_close_comment)
      : null,
    payouts,
  }
}

export function runSummaryFromApi(row: Record<string, unknown>): PayrollRunSummary {
  const unlinked = Array.isArray(row.unlinked_advances)
    ? (row.unlinked_advances as Record<string, unknown>[]).map(payoutFromApi)
    : []
  return {
    id: String(row.id),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    status: row.status as PayrollRunSummary['status'],
    linesCount: Number(row.lines_count ?? 0),
    totalAmount: num(row.total_amount),
    unlinkedAdvances: unlinked,
  }
}

export function sheetFromApi(row: Record<string, unknown>): PayoutSheet {
  const lines = Array.isArray(row.lines)
    ? (row.lines as Record<string, unknown>[]).map(sheetLineFromApi)
    : []
  return {
    runId: String(row.run_id),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    status: row.status as PayoutSheet['status'],
    lines,
  }
}

export function payoutCreateToApi(payload: CreatePayoutPayload) {
  return {
    amount_paid: payload.amountPaid,
    payout_method: payload.payoutMethod,
    payout_date: payload.payoutDate,
    comment: payload.comment || null,
  }
}

export function advanceCreateToApi(payload: CreateAdvancePayload) {
  return {
    employee_id: payload.employeeId,
    amount_paid: payload.amountPaid,
    payout_method: payload.payoutMethod,
    payout_date: payload.payoutDate,
    comment: payload.comment,
    advance_period_hint: payload.advancePeriodHint || null,
  }
}

export type PayoutMethod = 'cash' | 'bank_transfer' | 'card' | 'other'
export type PayoutKind = 'advance' | 'salary_payment'
export type PayoutStatus = 'unpaid' | 'partially_paid' | 'paid'
export type PayrollStatus = 'draft' | 'confirmed' | 'paid'
export type PaymentScheme = 'hourly' | 'per_shift' | 'monthly' | 'piecework'

export type PayrollPayout = {
  id: string
  orgId: string
  payrollRunLineId: string | null
  employeeId: string
  employeeName: string
  employeeCode: string
  amountPaid: number
  payoutMethod: PayoutMethod
  payoutKind: PayoutKind
  payoutDate: string
  confirmedBy: string | null
  comment: string | null
  advancePeriodHint: string | null
  createdAt: string
}

export type PayrollRunSummary = {
  id: string
  periodStart: string
  periodEnd: string
  status: PayrollStatus
  linesCount: number
  totalAmount: number
  unlinkedAdvances: PayrollPayout[]
}

export type PayoutSheetLine = {
  lineId: string
  employeeId: string
  employeeName: string
  employeeCode: string
  paymentScheme: PaymentScheme
  totalAmount: number
  amountPaid: number
  remainderAmount: number
  payoutStatus: PayoutStatus
  remainderClosed: boolean
  remainderCloseComment: string | null
  payouts: PayrollPayout[]
}

export type PayoutSheet = {
  runId: string
  periodStart: string
  periodEnd: string
  status: PayrollStatus
  lines: PayoutSheetLine[]
}

export type CreatePayoutPayload = {
  amountPaid: number
  payoutMethod: PayoutMethod
  payoutDate: string
  comment?: string
}

export type CreateAdvancePayload = {
  employeeId: string
  amountPaid: number
  payoutMethod: PayoutMethod
  payoutDate: string
  comment: string
  advancePeriodHint?: string
}

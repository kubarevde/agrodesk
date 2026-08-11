export type PayrollStatus = 'draft' | 'confirmed' | 'paid'
export type PaymentScheme = 'hourly' | 'per_shift' | 'monthly' | 'piecework'
export type PayoutStatus = 'unpaid' | 'partially_paid' | 'paid'
export type AdjustmentType = 'bonus' | 'penalty' | 'deduction' | 'other'

export type PayrollAdjustment = {
  id: string
  payrollRunLineId: string
  type: AdjustmentType
  amount: number
  sign: number
  comment: string | null
  createdBy: string | null
  createdAt: string
}

export type PayrollRunLine = {
  id: string
  payrollRunId: string
  employeeId: string
  employeeName: string
  employeeCode: string
  paymentScheme: PaymentScheme
  baseCalculatedAmount: number
  adjustmentsTotal: number
  totalAmount: number
  sourceBreakdown: Record<string, unknown>
  payoutStatus: PayoutStatus
  amountPaid: number
  amountAdvance: number
  amountSalaryPaid: number
  remainderAmount: number
  remainderClosed: boolean
  remainderCloseComment: string | null
  paidExceedsAccrued: boolean
  adjustments: PayrollAdjustment[]
}

export type PayrollRun = {
  id: string
  orgId: string
  periodStart: string
  periodEnd: string
  status: PayrollStatus
  createdBy: string | null
  createdAt: string
  confirmedBy: string | null
  confirmedAt: string | null
  lines: PayrollRunLine[]
  linesCount: number
  totalAmount: number
  totalPaid: number
  remainderAmount: number
  paidExceedsAccrued: boolean
  unlinkedAdvances: import('@/features/payroll-payouts/types').PayrollPayout[]
}

export type PayrollSubTab = 'accruals' | 'payouts' | 'rates' | 'reports'

export {
  ADJUSTMENT_TYPE_LABELS,
  PAYROLL_STATUS_LABELS,
  SCHEME_LABELS,
} from './labels'

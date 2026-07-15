export interface EmployeeRate {
  id: string
  employeeId: string
  employeeName: string
  workTypeId: string | null
  workTypeName: string | null
  rate: number
  overtimeMultiplier: number
  overtimeThresholdHours: number
  validFrom: string
  validTo: string | null
  notes: string | null
}

export interface SalaryPreviewSummaryRow {
  employeeId: string
  employeeName: string
  employeeCode: string
  shiftsCount: number
  hours: number
  regularHours: number
  overtimeHours: number
  amount: number
}

export interface SalaryPreviewShiftRow {
  date: string
  employeeId: string
  employeeName: string
  workType: string
  hours: number
  amount: number
  source: string
}

export interface SalaryPreview {
  month: string
  from: string
  to: string
  summary: SalaryPreviewSummaryRow[]
  shifts: SalaryPreviewShiftRow[]
  totalAmount: number
}

export interface EmployeeEarningsShift {
  date: string
  workType: string
  hours: number
  regularHours: number
  overtimeHours: number
  amount: number
  source: string
}

export interface EmployeeEarnings {
  month: string
  employeeId: string
  employeeName: string
  shiftsCount: number
  hours: number
  totalAmount: number
  shifts: EmployeeEarningsShift[]
}

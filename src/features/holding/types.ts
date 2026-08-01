export type HoldingChildSummary = {
  orgId: string
  name: string
  slug: string
  isActive: boolean
  employeesCount: number
  activeShiftsCount: number
  monthShiftsCount: number
  monthHours: number
  monthShipmentsKg: number
  monthShipmentsSum: number
  monthExpensesSum: number
  criticalInventoryCount: number
  shipmentRequestsActive: number
}

export type HoldingOverview = {
  headOrgId: string
  children: HoldingChildSummary[]
  totals: HoldingChildSummary | null
}

/** Lightweight child row from GET /api/holding/children */
export type HoldingChildListItem = {
  orgId: string
  name: string
  slug: string
  isActive: boolean
}

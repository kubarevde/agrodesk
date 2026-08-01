import axios from 'axios'
import { api } from '@/lib/api'
import type { HoldingChildListItem, HoldingChildSummary, HoldingOverview } from './types'

type ApiChild = {
  org_id: string
  name: string
  slug: string
  is_active: boolean
  employees_count: number
  active_shifts_count: number
  month_shifts_count: number
  month_hours: number
  month_shipments_kg: number
  month_shipments_sum: number
  month_expenses_sum: number
  critical_inventory_count: number
  shipment_requests_active: number
}

type ApiOverview = {
  head_org_id: string
  children: ApiChild[]
  totals: ApiChild | null
}

function mapChild(raw: ApiChild): HoldingChildSummary {
  return {
    orgId: raw.org_id,
    name: raw.name,
    slug: raw.slug,
    isActive: raw.is_active,
    employeesCount: raw.employees_count,
    activeShiftsCount: raw.active_shifts_count,
    monthShiftsCount: raw.month_shifts_count,
    monthHours: raw.month_hours,
    monthShipmentsKg: raw.month_shipments_kg,
    monthShipmentsSum: raw.month_shipments_sum,
    monthExpensesSum: raw.month_expenses_sum,
    criticalInventoryCount: raw.critical_inventory_count,
    shipmentRequestsActive: raw.shipment_requests_active,
  }
}

export function mapHoldingOverview(raw: ApiOverview): HoldingOverview {
  return {
    headOrgId: raw.head_org_id,
    children: (raw.children ?? []).map(mapChild),
    totals: raw.totals ? mapChild(raw.totals) : null,
  }
}

/** Returns overview, or null when org is not a head / has no children (403). */
export async function fetchHoldingOverview(): Promise<HoldingOverview | null> {
  try {
    const { data } = await api.get<ApiOverview>('/api/holding/overview')
    return mapHoldingOverview(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      return null
    }
    throw error
  }
}

export type HoldingSwitchResult = {
  access_token: string
  employee: Record<string, unknown>
  mode: 'child' | 'head'
  current_org_id: string
  current_org_name: string
  head_org_id: string | null
  head_org_name: string | null
}

export async function postHoldingSwitch(childOrgId: string): Promise<HoldingSwitchResult> {
  const { data } = await api.post<HoldingSwitchResult>('/api/holding/switch', {
    child_org_id: childOrgId,
  })
  return data
}

export async function postHoldingSwitchBack(): Promise<HoldingSwitchResult> {
  const { data } = await api.post<HoldingSwitchResult>('/api/holding/switch-back')
  return data
}

type ApiChildListItem = {
  link_id: string
  org_id: string
  name: string
  slug: string
  is_active: boolean
}

/** Returns linked children, or null when org is not a head (403). */
export async function fetchHoldingChildren(): Promise<HoldingChildListItem[] | null> {
  try {
    const { data } = await api.get<ApiChildListItem[]>('/api/holding/children')
    return (data ?? []).map((raw) => ({
      orgId: raw.org_id,
      name: raw.name,
      slug: raw.slug,
      isActive: raw.is_active,
    }))
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      return null
    }
    throw error
  }
}

export type HoldingReportExportPayload = {
  report_id: string
  mode: 'child' | 'group'
  child_org_id?: string
  from_date?: string
  to_date?: string
  month?: string
  year?: number
}

export async function downloadHoldingReport(
  payload: HoldingReportExportPayload,
  filename: string,
): Promise<void> {
  const response = await api.post<Blob>('/api/holding/reports/export', payload, {
    responseType: 'blob',
  })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(response.data)
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

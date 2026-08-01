import axios from 'axios'
import { ticketFromApi } from '@/features/support/api'
import type { SupportTicket } from '@/features/support/types'
import { SUPERADMIN_TOKEN_KEY, type Organization, type OrganizationCreatePayload, type OrganizationCreateResult, type OrganizationUpdatePayload, type OrgHierarchyCandidate, type OrgHierarchyChild, type OrgHierarchyParent, type SuperAdminStats } from './types'

type ApiOrg = {
  id: string
  name: string
  slug: string
  plan: string
  is_active: boolean
  owner_email: string | null
  created_at: string
  trial_ends_at: string | null
  max_employees: number
  employees_count: number
  active_shifts_count: number
  marketplace_enabled?: boolean
}

type ApiStats = {
  total_orgs: number
  active_orgs: number
  trial_orgs: number
  total_employees: number
  total_shifts_today: number
  inactive_orgs?: number
  basic_orgs?: number
  pro_orgs?: number
  trials_expiring_soon?: number
  trials_expired_active?: number
  active_employees?: number
  open_shifts?: number
  open_shifts_today?: number
  support_total?: number
  support_unread?: number
  support_new?: number
  support_in_progress?: number
  marketplace_orgs?: number
  hierarchy_links?: number
  hierarchy_heads?: number
  listings_pending_review?: number
  listings_published?: number
  orders_new?: number
  attention?: {
    code: string
    severity: 'info' | 'warning'
    count: number
    message: string
  }[]
}

const rawBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
/** Shared SuperAdmin axios client (JWT from localStorage.superadmin_token). */
export const superadminApi = axios.create({
  baseURL: rawBase && rawBase.length > 0 ? rawBase.replace(/\/$/, '') : '',
})

superadminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(SUPERADMIN_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

superadminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    if (
      error.response?.status === 401 &&
      !String(url).includes('/superadmin/api/auth/login')
    ) {
      localStorage.removeItem(SUPERADMIN_TOKEN_KEY)
      window.location.href = '/superadmin/login'
    }
    return Promise.reject(error)
  },
)

function mapOrg(raw: ApiOrg): Organization {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    plan: raw.plan,
    isActive: raw.is_active,
    ownerEmail: raw.owner_email,
    createdAt: raw.created_at,
    trialEndsAt: raw.trial_ends_at,
    maxEmployees: raw.max_employees,
    employeesCount: raw.employees_count,
    activeShiftsCount: raw.active_shifts_count,
    marketplaceEnabled: raw.marketplace_enabled === true,
  }
}

export async function loginSuperAdmin(email: string, password: string): Promise<string> {
  const { data } = await superadminApi.post<{ access_token: string }>(
    '/superadmin/api/auth/login',
    { email, password },
  )
  return data.access_token
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await superadminApi.get<ApiOrg[]>('/superadmin/api/organizations')
  return data.map(mapOrg)
}

export async function fetchSuperAdminStats(): Promise<SuperAdminStats> {
  const { data } = await superadminApi.get<ApiStats>('/superadmin/api/stats')
  return {
    totalOrgs: data.total_orgs,
    activeOrgs: data.active_orgs,
    trialOrgs: data.trial_orgs,
    totalEmployees: data.total_employees,
    totalShiftsToday: data.total_shifts_today,
    inactiveOrgs: data.inactive_orgs ?? 0,
    basicOrgs: data.basic_orgs ?? 0,
    proOrgs: data.pro_orgs ?? 0,
    trialsExpiringSoon: data.trials_expiring_soon ?? 0,
    trialsExpiredActive: data.trials_expired_active ?? 0,
    activeEmployees: data.active_employees ?? 0,
    openShifts: data.open_shifts ?? 0,
    openShiftsToday: data.open_shifts_today ?? 0,
    supportTotal: data.support_total ?? 0,
    supportUnread: data.support_unread ?? 0,
    supportNew: data.support_new ?? 0,
    supportInProgress: data.support_in_progress ?? 0,
    marketplaceOrgs: data.marketplace_orgs ?? 0,
    hierarchyLinks: data.hierarchy_links ?? 0,
    hierarchyHeads: data.hierarchy_heads ?? 0,
    listingsPendingReview: data.listings_pending_review ?? 0,
    listingsPublished: data.listings_published ?? 0,
    ordersNew: data.orders_new ?? 0,
    attention: (data.attention ?? []).map((item) => ({
      code: item.code,
      severity: item.severity,
      count: item.count,
      message: item.message,
    })),
  }
}

export async function createOrganization(
  payload: OrganizationCreatePayload,
): Promise<OrganizationCreateResult> {
  const { data } = await superadminApi.post<{
    organization: ApiOrg
    admin_email: string
    temp_password: string
  }>('/superadmin/api/organizations', {
    name: payload.name,
    slug: payload.slug,
    owner_email: payload.ownerEmail,
    plan: payload.plan,
    max_employees: payload.maxEmployees,
    trial_ends_at: payload.trialEndsAt,
  })
  return {
    organization: mapOrg(data.organization),
    adminEmail: data.admin_email,
    tempPassword: data.temp_password,
  }
}

export async function updateOrganization(
  id: string,
  payload: OrganizationUpdatePayload,
): Promise<Organization> {
  const body: Record<string, unknown> = {}
  if (payload.isActive !== undefined) body.is_active = payload.isActive
  if (payload.plan !== undefined) body.plan = payload.plan
  if (payload.maxEmployees !== undefined) body.max_employees = payload.maxEmployees
  if (payload.trialEndsAt !== undefined) body.trial_ends_at = payload.trialEndsAt
  if (payload.marketplaceEnabled !== undefined) {
    body.marketplace_enabled = payload.marketplaceEnabled
  }

  const { data } = await superadminApi.patch<ApiOrg>(
    `/superadmin/api/organizations/${id}`,
    body,
  )
  return mapOrg(data)
}

export async function deleteOrganization(id: string): Promise<void> {
  await superadminApi.delete(`/superadmin/api/organizations/${id}`)
}

type ApiHierarchyChild = {
  id: string
  head_org_id: string
  child_org_id: string
  child_name: string
  child_slug: string
  child_is_active: boolean
}

type ApiHierarchyCandidate = {
  id: string
  name: string
  slug: string
}

function mapHierarchyChild(raw: ApiHierarchyChild): OrgHierarchyChild {
  return {
    id: raw.id,
    headOrgId: raw.head_org_id,
    childOrgId: raw.child_org_id,
    childName: raw.child_name,
    childSlug: raw.child_slug,
    childIsActive: raw.child_is_active,
  }
}

export async function fetchOrgChildren(headOrgId: string): Promise<OrgHierarchyChild[]> {
  const { data } = await superadminApi.get<ApiHierarchyChild[]>(
    `/superadmin/api/organizations/${headOrgId}/children`,
  )
  return data.map(mapHierarchyChild)
}

export async function fetchOrgChildrenAvailable(
  headOrgId: string,
): Promise<OrgHierarchyCandidate[]> {
  const { data } = await superadminApi.get<ApiHierarchyCandidate[]>(
    `/superadmin/api/organizations/${headOrgId}/children/available`,
  )
  return data.map((raw) => ({ id: raw.id, name: raw.name, slug: raw.slug }))
}

type ApiHierarchyParent = {
  link_id: string
  head_org_id: string
  head_name: string
  head_slug: string
  head_is_active: boolean
}

export async function fetchOrgParent(orgId: string): Promise<OrgHierarchyParent | null> {
  const { data } = await superadminApi.get<ApiHierarchyParent | null>(
    `/superadmin/api/organizations/${orgId}/parent`,
  )
  if (!data) return null
  return {
    linkId: data.link_id,
    headOrgId: data.head_org_id,
    headName: data.head_name,
    headSlug: data.head_slug,
    headIsActive: data.head_is_active,
  }
}

export async function attachOrgChild(
  headOrgId: string,
  childOrgId: string,
): Promise<OrgHierarchyChild> {
  const { data } = await superadminApi.post<ApiHierarchyChild>(
    `/superadmin/api/organizations/${headOrgId}/children`,
    { child_org_id: childOrgId },
  )
  return mapHierarchyChild(data)
}

export async function detachOrgChild(headOrgId: string, childOrgId: string): Promise<void> {
  await superadminApi.delete(
    `/superadmin/api/organizations/${headOrgId}/children/${childOrgId}`,
  )
}

export function superadminApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

type ApiRecord = Record<string, unknown>

export type SuperadminSupportFilters = {
  status?: string
  orgId?: string
  authorRole?: string
  category?: string
  priority?: string
  unreadOnly?: boolean
  assignedToMe?: boolean
}

export type SuperadminSupportTicket = SupportTicket

export type SuperadminSupportUpdate = {
  status?: string
  priority?: string
  assignToMe?: boolean
  clearAssignee?: boolean
}

export async function fetchSupportTickets(
  filters: SuperadminSupportFilters = {},
): Promise<SuperadminSupportTicket[]> {
  const { data } = await superadminApi.get<ApiRecord[]>('/superadmin/api/support/tickets', {
    params: {
      status: filters.status || undefined,
      org_id: filters.orgId || undefined,
      author_role: filters.authorRole || undefined,
      category: filters.category || undefined,
      priority: filters.priority || undefined,
      unread_only: filters.unreadOnly || undefined,
      assigned_to_me: filters.assignedToMe || undefined,
    },
  })
  return data.map(ticketFromApi)
}

export async function fetchSupportTicket(id: string): Promise<SuperadminSupportTicket> {
  const { data } = await superadminApi.get<ApiRecord>(`/superadmin/api/support/tickets/${id}`)
  return ticketFromApi(data)
}

export async function replySupportTicket(
  id: string,
  body: string,
  attachments?: { fileUrl: string; filename: string }[],
): Promise<SuperadminSupportTicket> {
  const { data } = await superadminApi.post<ApiRecord>(
    `/superadmin/api/support/tickets/${id}/messages`,
    {
      body,
      attachments: (attachments ?? []).map((item) => ({
        file_url: item.fileUrl,
        filename: item.filename,
      })),
    },
  )
  return ticketFromApi(data)
}

export type SupportReplyTemplate = {
  id: string
  category: string
  title: string
  body: string
}

export async function fetchSupportReplyTemplates(
  category?: string,
): Promise<SupportReplyTemplate[]> {
  const { data } = await superadminApi.get<ApiRecord[]>('/superadmin/api/support/templates', {
    params: category ? { category } : undefined,
  })
  return data.map((raw) => ({
    id: String(raw.id),
    category: String(raw.category ?? 'other'),
    title: String(raw.title ?? ''),
    body: String(raw.body ?? ''),
  }))
}

export async function createSupportReplyTemplate(payload: {
  category: string
  title: string
  body: string
}): Promise<SupportReplyTemplate> {
  const { data } = await superadminApi.post<ApiRecord>(
    '/superadmin/api/support/templates',
    payload,
  )
  return {
    id: String(data.id),
    category: String(data.category ?? 'other'),
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
  }
}

export async function updateSupportTicket(
  id: string,
  payload: SuperadminSupportUpdate,
): Promise<SuperadminSupportTicket> {
  const { data } = await superadminApi.patch<ApiRecord>(
    `/superadmin/api/support/tickets/${id}`,
    {
      status: payload.status,
      priority: payload.priority,
      assign_to_me: payload.assignToMe || undefined,
      clear_assignee: payload.clearAssignee || undefined,
    },
  )
  return ticketFromApi(data)
}

export async function updateSupportTicketStatus(
  id: string,
  status: string,
  priority?: string,
): Promise<SuperadminSupportTicket> {
  return updateSupportTicket(id, { status, priority })
}

export async function fetchSupportStaffUnreadCount(): Promise<number> {
  const { data } = await superadminApi.get<{ count: number }>(
    '/superadmin/api/support/unread-count',
  )
  return data.count
}

import axios from 'axios'
import { SUPERADMIN_TOKEN_KEY, type Organization, type OrganizationCreatePayload, type OrganizationCreateResult, type OrganizationUpdatePayload, type SuperAdminStats } from './types'

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
}

type ApiStats = {
  total_orgs: number
  active_orgs: number
  trial_orgs: number
  total_employees: number
  total_shifts_today: number
}

const rawBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
const superadminApi = axios.create({
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

  const { data } = await superadminApi.patch<ApiOrg>(
    `/superadmin/api/organizations/${id}`,
    body,
  )
  return mapOrg(data)
}

export async function deleteOrganization(id: string): Promise<void> {
  await superadminApi.delete(`/superadmin/api/organizations/${id}`)
}

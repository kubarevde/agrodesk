export const SUPERADMIN_TOKEN_KEY = 'superadmin_token'

export type OrgPlan = 'trial' | 'basic' | 'pro'

export type Organization = {
  id: string
  name: string
  slug: string
  plan: string
  isActive: boolean
  ownerEmail: string | null
  createdAt: string
  trialEndsAt: string | null
  maxEmployees: number
  employeesCount: number
  activeShiftsCount: number
}

export type OrganizationCreatePayload = {
  name: string
  slug: string
  ownerEmail: string
  plan: OrgPlan
  maxEmployees: number
  trialEndsAt: string | null
}

export type OrganizationUpdatePayload = {
  isActive?: boolean
  plan?: string
  maxEmployees?: number
  trialEndsAt?: string | null
}

export type OrganizationCreateResult = {
  organization: Organization
  adminEmail: string
  tempPassword: string
}

export type SuperAdminStats = {
  totalOrgs: number
  activeOrgs: number
  trialOrgs: number
  totalEmployees: number
  totalShiftsToday: number
}

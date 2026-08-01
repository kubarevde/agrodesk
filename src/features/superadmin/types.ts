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
  marketplaceEnabled?: boolean
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
  marketplaceEnabled?: boolean
}

export type OrganizationCreateResult = {
  organization: Organization
  adminEmail: string
  tempPassword: string
}

export type SuperAdminAttentionItem = {
  code: string
  severity: 'info' | 'warning'
  count: number
  message: string
}

export type SuperAdminStats = {
  totalOrgs: number
  activeOrgs: number
  trialOrgs: number
  totalEmployees: number
  totalShiftsToday: number
  inactiveOrgs: number
  basicOrgs: number
  proOrgs: number
  trialsExpiringSoon: number
  trialsExpiredActive: number
  activeEmployees: number
  openShifts: number
  openShiftsToday: number
  supportTotal: number
  supportUnread: number
  supportNew: number
  supportInProgress: number
  marketplaceOrgs: number
  hierarchyLinks: number
  hierarchyHeads: number
  listingsPendingReview: number
  listingsPublished: number
  ordersNew: number
  attention: SuperAdminAttentionItem[]
}

export type OrgHierarchyChild = {
  id: string
  headOrgId: string
  childOrgId: string
  childName: string
  childSlug: string
  childIsActive: boolean
}

export type OrgHierarchyCandidate = {
  id: string
  name: string
  slug: string
}

export type OrgHierarchyParent = {
  linkId: string
  headOrgId: string
  headName: string
  headSlug: string
  headIsActive: boolean
}

/**
 * Organization tariff plans — UI labels and documented limits.
 * Codes (`trial` | `basic` | `pro`) are stored in DB and must not change.
 *
 * Module access: all plans unlock the same application modules.
 * Marketplace is a separate org settings flag (`marketplace_enabled`), not tied to plan.
 * Soft differences today: recommended max_employees defaults + optional subscription end
 * date (`trial_ends_at` column — historical name, used for every plan).
 *
 * OPEN QUESTION (no billing): `trial_ends_at` does NOT auto-block login or API access.
 * Login only checks Organization.is_active. Expiry is surfaced in superadmin stats /
 * attention items; manual deactivation remains the blocking mechanism until product
 * decides otherwise.
 */

export type OrgPlanCode = 'trial' | 'basic' | 'pro'

export type OrgPlanDefinition = {
  code: OrgPlanCode
  /** Russian label for UI */
  label: string
  /** Suggested default for max_employees when creating an org on this plan */
  defaultMaxEmployees: number
  /** Short description shown near the plan select */
  summary: string
}

export const ORG_PLANS: Record<OrgPlanCode, OrgPlanDefinition> = {
  trial: {
    code: 'trial',
    label: 'Пробный',
    defaultMaxEmployees: 10,
    summary:
      'Полный доступ ко всем модулям. Срок задаётся полем «Истекает»; модули не режутся по плану.',
  },
  basic: {
    code: 'basic',
    label: 'Базовый',
    defaultMaxEmployees: 25,
    summary:
      'Те же модули, что у «Пробного». Коммерческий тариф; дата «Истекает» — срок подписки (необязательно).',
  },
  pro: {
    code: 'pro',
    label: 'Профессиональный',
    defaultMaxEmployees: 100,
    summary:
      'Те же модули, что у «Базового». Рекомендуемый лимит сотрудников выше. Marketplace — отдельно.',
  },
}

export const ORG_PLAN_OPTIONS = (Object.keys(ORG_PLANS) as OrgPlanCode[]).map((code) => ({
  value: code,
  label: ORG_PLANS[code].label,
}))

export function orgPlanLabel(plan: string | null | undefined): string {
  if (!plan) return '—'
  if (plan in ORG_PLANS) return ORG_PLANS[plan as OrgPlanCode].label
  return plan
}

export function isOrgPlanCode(value: string): value is OrgPlanCode {
  return value === 'trial' || value === 'basic' || value === 'pro'
}

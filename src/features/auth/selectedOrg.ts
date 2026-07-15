export const SELECTED_ORG_KEY = 'selected_org'

export type SelectedOrg = {
  id: string
  name: string
  slug: string
}

export function getSelectedOrg(): SelectedOrg | null {
  try {
    const raw = localStorage.getItem(SELECTED_ORG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SelectedOrg
    if (!parsed?.id || !parsed?.name || !parsed?.slug) return null
    return parsed
  } catch {
    return null
  }
}

export function setSelectedOrg(org: SelectedOrg): void {
  localStorage.setItem(SELECTED_ORG_KEY, JSON.stringify(org))
}
